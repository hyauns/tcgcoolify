import { adminDb } from "@/lib/database"
import { getSql } from "@/lib/db-client"
import { sendOrderCancellation, sendOrderRefund } from "@/lib/email/send-email"
import { getGatewayProviderSettingsAll } from "@/app/actions/settings"

/**
 * Best-effort: when an order paid through the Stripe hosted-checkout flow is
 * cancelled, ask the PayDef gateway to refund it. This is the merchant-initiated
 * refund path — the gateway refunds the Stripe PaymentIntent and then delivers a
 * payment.capture.refunded webhook back to /api/webhooks/gateway, which marks the
 * local payment/order refunded (idempotent, so the double-touch is harmless).
 *
 * Scope guards (never refund the wrong thing):
 *   • flow must be 'stripe' — mock_charge orders have no refundable gateway payment
 *   • a transaction_id must exist and its payment must have actually succeeded
 *
 * Failures are logged, never thrown: a gateway hiccup must not roll back the
 * local cancellation (same contract as the cancellation email below). The
 * gateway endpoint is itself idempotent, so a retry/redelivery is safe.
 *
 * Returns TRUE only when the gateway actually accepted a refund (HTTP 2xx), so
 * the caller can send the "refunded" email instead of the default cancellation
 * email. Returns FALSE for every skip/failure path (mock_charge, unpaid, missing
 * credentials, gateway error) — those keep the default cancellation email.
 */
async function refundOrderViaGateway(orderId: string): Promise<boolean> {
  let tx: { payment_method_id: string | null; transaction_id: string | null; status: string | null }
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT payment_method_id, transaction_id, status
      FROM   payment_transactions
      WHERE  order_id = ${String(orderId)}
      ORDER BY processed_at DESC
      LIMIT  1
    `
    if (rows.length === 0) return false
    tx = rows[0] as any
  } catch (err) {
    console.error(`[admin-orders] Refund lookup failed for order ${orderId}:`, err)
    return false
  }

  // Stripe / Shopify hosted-checkout stores no local card → payment_method_id is
  // NULL. The Mock Charge / direct-card flow links a payment_methods row. Mirror
  // the flow inference in app/api/admin/orders/[id]/route.ts:getOrderPayment.
  // (Both Stripe AND Shopify gateway orders land here — PayDef routes the refund
  // to the right provider by the store's provider_type, so this caller is
  // provider-agnostic.)
  const flow = tx.payment_method_id ? "mock_charge" : "stripe"
  if (flow !== "stripe") return false
  if (!tx.transaction_id) return false
  if (tx.status !== "succeeded") {
    // Nothing captured to refund (pending/failed) or already refunded.
    return false
  }

  const { credentials } = await getGatewayProviderSettingsAll()
  const creds = credentials.stripe
  if (!creds.baseUrl || !creds.storeId || !creds.apiKey) {
    console.warn(`[admin-orders] Stripe gateway credentials missing — cannot refund order ${orderId}`)
    return false
  }

  const base = creds.baseUrl.replace(/\/+$/, "")
  try {
    const res = await fetch(`${base}/api/gateway/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Store-ID": creds.storeId,
        "X-API-Key": creds.apiKey,
      },
      body: JSON.stringify({ transaction_id: tx.transaction_id }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error(`[admin-orders] Gateway refund failed for order ${orderId}: ${res.status} ${text}`)
      return false
    }
    console.log(`[admin-orders] Gateway refund requested: order=${orderId} tx=${tx.transaction_id}`)
    return true
  } catch (err) {
    console.error(`[admin-orders] Gateway refund request threw for order ${orderId}:`, err)
    return false
  }
}

/**
 * Update a single order's status (and optional tracking) and fire the
 * cancellation email exactly once on the non-cancelled -> CANCELLED transition,
 * and only when a deliverable customer email exists.
 *
 * This is the single source of truth for that guard so both the per-order PATCH
 * (app/api/admin/orders/[id]/route.ts) and the bulk endpoint
 * (app/api/admin/orders/bulk/route.ts) behave identically.
 *
 * It does NOT revalidate product pages — callers decide when to revalidate
 * (single: once per request; bulk: once after the whole batch). The email send
 * is awaited but wrapped so a mailer failure never throws: a failed email must
 * not roll back the status change, matching the gateway-webhook pattern.
 */
export async function applyOrderStatusUpdate(
  id: string,
  status: string,
  tracking?: string,
): Promise<void> {
  // Snapshot the previous order so the cancellation guard can compare statuses
  // and reuse the resolved customer email without an extra fetch.
  const prevOrder = await adminDb.getOrderById(id)

  await adminDb.updateOrderStatus(id, status, tracking)

  if (status === "CANCELLED" && prevOrder && prevOrder.status !== "CANCELLED") {
    // Refund first (best-effort) so it runs even when no customer email exists
    // and the email branch below returns early. `refunded` is true only when the
    // gateway actually issued a refund (Stripe/Shopify paid order) — that decides
    // WHICH email the customer receives.
    const refunded = await refundOrderViaGateway(id)

    const email = prevOrder.customer?.email
    const hasRealEmail = !!email && email !== "No Email" && email.includes("@")
    if (!hasRealEmail) {
      console.warn(
        `[admin-orders] Cancellation email skipped — order ${id} has no customer email`,
      )
      return
    }
    const orderNumber =
      (prevOrder as { order_number?: string }).order_number ||
      `#${String(prevOrder.id).slice(-8)}`
    const customerName = prevOrder.customer?.name || "Customer"
    try {
      if (refunded) {
        // Money was actually returned → send the friendly "refunded" email
        // instead of the default fraud-prevention cancellation email.
        await sendOrderRefund({
          customerEmail: email,
          customerName,
          orderNumber,
          amount: Number((prevOrder as { total?: number }).total ?? 0),
          currency: (prevOrder as { currency?: string }).currency || "USD",
          refundedAt: new Date(),
        })
      } else {
        await sendOrderCancellation({
          customerEmail: email,
          customerName,
          orderNumber,
          cancelledAt: new Date(),
        })
      }
    } catch (emailError) {
      console.error("[admin-orders] Cancellation/refund email send threw:", emailError)
    }
  }
}
