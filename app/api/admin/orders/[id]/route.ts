export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/database"
import { revalidateProductPages } from "@/lib/admin-actions"
import { requireAdmin } from "@/lib/auth-guard"
import { decryptPhone } from "@/lib/payment-security"
import { sendOrderCancellation } from "@/lib/email/send-email"

/**
 * Safely attempt to decrypt a phone number from an encrypted JSONB field.
 * Returns the original value if decryption fails (e.g., legacy plaintext data).
 */
function tryDecryptPhone(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null
  try {
    return decryptPhone(encrypted)
  } catch {
    // Fallback: value is likely already plaintext (legacy data)
    return encrypted
  }
}

/**
 * Decrypt phone numbers inside a JSONB address object for admin display.
 */
function decryptAddressPhones(address: any): any {
  if (!address) return address
  // Handle stringified JSONB
  const parsed = typeof address === "string" ? JSON.parse(address) : address
  if (parsed?.phone) {
    parsed.phone = tryDecryptPhone(parsed.phone)
  }
  return parsed
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const order = await adminDb.getOrderById(params.id)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Decrypt phone numbers in JSONB address columns for admin fulfillment
    const orderData = order as any
    const decryptedOrder = {
      ...order,
      shipping_address: decryptAddressPhones(orderData.shipping_address),
      billing_address: decryptAddressPhones(orderData.billing_address),
    }

    return NextResponse.json(decryptedOrder)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const { status, tracking } = await request.json()

    // Snapshot the previous order so the cancellation email guard can compare
    // statuses without an extra fetch after the UPDATE. getOrderById returns
    // customer.email (or "No Email" fallback) and the current status string.
    const prevOrder = await adminDb.getOrderById(params.id)

    await adminDb.updateOrderStatus(params.id, status, tracking)

    // Revalidate product pages — order status changes (e.g. cancellation)
    // may affect stock levels displayed on the storefront.
    await revalidateProductPages()

    // Cancellation email: only fire on the transition non-cancelled → CANCELLED
    // and only if we actually have a deliverable customer email. Fire-and-forget
    // to match the gateway-webhook email pattern; a send failure does not
    // roll back the status update.
    if (
      status === "CANCELLED" &&
      prevOrder &&
      prevOrder.status !== "CANCELLED"
    ) {
      const email = prevOrder.customer?.email
      const hasRealEmail = !!email && email !== "No Email" && email.includes("@")
      if (!hasRealEmail) {
        console.warn(
          `[admin-orders] Cancellation email skipped — order ${params.id} has no customer email`,
        )
      } else {
        const orderNumber =
          (prevOrder as { order_number?: string }).order_number ||
          `#${String(prevOrder.id).slice(-8)}`
        const customerName = prevOrder.customer?.name || "Customer"
        ;(async () => {
          try {
            await sendOrderCancellation({
              customerEmail: email,
              customerName,
              orderNumber,
              cancelledAt: new Date(),
            })
          } catch (emailError) {
            console.error(
              "[admin-orders] Cancellation email send threw:",
              emailError,
            )
          }
        })()
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
