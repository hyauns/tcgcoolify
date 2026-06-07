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
  // NULL. The Mock Charge / direct-card flow links a payment_methods row, and has
  // no refundable gateway payment.
  if (tx.payment_method_id) return false
  if (!tx.transaction_id) return false
  if (tx.status !== "succeeded") {
    // Nothing captured to refund (pending/failed) or already refunded.
    return false
  }

  // Find the gateway store that actually owns this transaction. Stripe AND
  // Shopify orders BOTH have a NULL local payment_method_id, so they are
  // indistinguishable per-order, and the order's provider is not persisted. We
  // therefore try every configured HOSTED gateway store (shopify + stripe): in
  // PayDef each transaction is scoped to exactly one store, so only the owning
  // store accepts the refund and the others return 404 ("not found for this
  // store") harmlessly — the transaction_id is a UUID, so there is no risk of
  // hitting an unrelated payment. PayDef then routes Stripe-vs-Shopify by the
  // store's provider_type. This is deliberately INDEPENDENT of the active
  // GATEWAY_FLOW so refunds keep working after the admin switches Payment Mode
  // (e.g. to mock_charge) — the order was paid under whatever flow was active at
  // checkout, which may differ from now.
  const { credentials } = await getGatewayProviderSettingsAll()
  const seen = new Set<string>()
  const stores = [credentials.shopify, credentials.stripe].filter((c) => {
    if (!c.baseUrl || !c.storeId || !c.apiKey) return false
    const key = `${c.baseUrl.replace(/\/+$/, "")}|${c.storeId}`
    if (seen.has(key)) return false // same store configured in two slots → call once
    seen.add(key)
    return true
  })

  if (stores.length === 0) {
    console.warn(`[admin-orders] No hosted gateway credentials configured — cannot refund order ${orderId}`)
    return false
  }

  for (const creds of stores) {
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
      if (res.ok) {
        console.log(
          `[admin-orders] Gateway refund requested: order=${orderId} store=${creds.storeId} tx=${tx.transaction_id}`,
        )
        return true
      }
      const text = await res.text().catch(() => "")
      // 404 = this store doesn't own the tx → try the next hosted store.
      console.log(
        `[admin-orders] Refund not on store ${creds.storeId} (${res.status}) for order ${orderId}: ${text}`,
      )
    } catch (err) {
      console.error(
        `[admin-orders] Gateway refund request threw for order ${orderId} on store ${creds.storeId}:`,
        err,
      )
    }
  }

  console.error(
    `[admin-orders] Gateway refund: no hosted store owned tx ${tx.transaction_id} for order ${orderId}`,
  )
  return false
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
