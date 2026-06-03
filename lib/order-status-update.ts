import { adminDb } from "@/lib/database"
import { sendOrderCancellation } from "@/lib/email/send-email"

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
