import { adminDb } from "@/lib/database"
import { getSql } from "@/lib/db-client"
import { sendOrderCancellation } from "@/lib/email/send-email"
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
 */
async function refundOrderViaGateway(orderId: string): Promise<void> {
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
    if (rows.length === 0) return
    tx = rows[0] as any
  } catch (err) {
    console.error(`[admin-orders] Refund lookup failed for order ${orderId}:`, err)
    return
  }

  // Stripe hosted-checkout stores no local card → payment_method_id is NULL.
  // The Mock Charge / direct-card flow links a payment_methods row. Mirror the
  // flow inference in app/api/admin/orders/[id]/route.ts:getOrderPayment.
  const flow = tx.payment_method_id ? "mock_charge" : "stripe"
  if (flow !== "stripe") return
  if (!tx.transaction_id) return
  if (tx.status !== "succeeded") {
    // Nothing captured to refund (pending/failed) or already refunded.
    return
  }

  const { credentials } = await getGatewayProviderSettingsAll()
  const creds = credentials.stripe
  if (!creds.baseUrl || !creds.storeId || !creds.apiKey) {
    console.warn(`[admin-orders] Stripe gateway credentials missing — cannot refund order ${orderId}`)
    return
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
      return
    }
    console.log(`[admin-orders] Gateway refund requested: order=${orderId} tx=${tx.transaction_id}`)
  } catch (err) {
    console.error(`[admin-orders] Gateway refund request threw for order ${orderId}:`, err)
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
    // and the email branch below returns early.
    await refundOrderViaGateway(id)

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
      await sendOrderCancellation({
        customerEmail: email,
        customerName,
        orderNumber,
        cancelledAt: new Date(),
      })
    } catch (emailError) {
      console.error("[admin-orders] Cancellation email send threw:", emailError)
    }
  }
}
