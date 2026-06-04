export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/database"
import { getSql } from "@/lib/db-client"
import { revalidateProductPages } from "@/lib/admin-actions"
import { requireAdmin } from "@/lib/auth-guard"
import { decryptPhone } from "@/lib/payment-security"
import { applyOrderStatusUpdate } from "@/lib/order-status-update"

/**
 * Look up the payment flow for an order from its latest transaction row.
 *
 * The flow (mock_charge vs stripe) is a global setting, not stored on the order,
 * but it can be inferred per-order: the Stripe hosted-checkout flow stores no
 * local card so `payment_method_id` is NULL, while the Mock Charge / direct-card
 * flow links a payment_methods row (see app/api/orders/create/route.ts + migration 17).
 *
 * Wrapped so a payment-table hiccup never breaks the core order-detail response.
 */
async function getOrderPayment(orderId: string) {
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT payment_method_id, transaction_id, status, card_brand, card_last_4
      FROM payment_transactions
      WHERE order_id = ${String(orderId)}
      ORDER BY processed_at DESC
      LIMIT 1
    `
    if (rows.length === 0) return null
    const tx = rows[0] as any
    return {
      flow: (tx.payment_method_id ? "mock_charge" : "stripe") as "mock_charge" | "stripe",
      transaction_id: tx.transaction_id ?? null,
      status: tx.status ?? null,
      card_brand: tx.card_brand ?? null,
      card_last_4: tx.card_last_4 ?? null,
    }
  } catch (error) {
    console.error("[admin-orders] payment lookup failed:", error)
    return null
  }
}

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
      payment: await getOrderPayment(params.id),
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

    // Update status + fire the cancellation email (guarded) via the shared
    // helper so single + bulk updates use one implementation.
    await applyOrderStatusUpdate(params.id, status, tracking)

    // Revalidate product pages — order status changes (e.g. cancellation)
    // may affect stock levels displayed on the storefront.
    await revalidateProductPages()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
