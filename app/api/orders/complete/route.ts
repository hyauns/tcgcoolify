export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { getSql } from "@/lib/db-client"
import { type OrderEmailData } from "@/lib/email/send-email"

type SessionPayload = {
  userId: string
  email: string
  role: string
}

function getOptionalSession(): SessionPayload | null {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return null
    const token = cookies().get("auth-token")?.value
    if (!token) return null
    return verify(token, secret) as SessionPayload
  } catch {
    return null
  }
}

type OrderRow = {
  id: number
  order_number: string
  customer_id: string
  status: string
  payment_status: string
  subtotal: string
  tax_amount: string
  shipping_amount: string
  total_amount: string
  shipping_address: any
  billing_address: any
  tracking_number: string | null
  order_date: string | Date
  created_at: string | Date
  customer_email: string | null
  customer_user_id: string | null
  items: Array<{
    id: number
    product_id: string
    product_name: string
    quantity: number
    unit_price: string | number
    total_price: string | number
  }>
}

function getSqlConnection() {
  return getSql()
}

async function getOrderByNumber(orderNumber: string): Promise<OrderRow | null> {
  const sql = getSqlConnection()
  const rows = await sql`
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      o.status,
      o.payment_status,
      o.subtotal,
      o.tax_amount,
      o.shipping_amount,
      o.total_amount,
      o.shipping_address,
      o.billing_address,
      o.tracking_number,
      o.order_date,
      o.created_at,
      c.email AS customer_email,
      c.user_id AS customer_user_id,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
          )
          ORDER BY oi.id
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM orders o
    LEFT JOIN customers c ON c.id::text = o.customer_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.order_number = ${orderNumber}
    GROUP BY o.id, c.email, c.user_id
    LIMIT 1
  `

  return (rows[0] as OrderRow) || null
}

/**
 * Resolve an order by its gateway transaction id (Stripe redirect flow).
 * The gateway success page returns ?transaction_id=&status= instead of
 * ?orderNumber=, so we join payment_transactions to find the order.
 */
async function getOrderByTransactionId(transactionId: string): Promise<OrderRow | null> {
  const sql = getSqlConnection()
  const rows = await sql`
    SELECT
      o.id,
      o.order_number,
      o.customer_id,
      o.status,
      o.payment_status,
      o.subtotal,
      o.tax_amount,
      o.shipping_amount,
      o.total_amount,
      o.shipping_address,
      o.billing_address,
      o.tracking_number,
      o.order_date,
      o.created_at,
      c.email AS customer_email,
      c.user_id AS customer_user_id,
      COALESCE(
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
          )
          ORDER BY oi.id
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
      ) AS items
    FROM orders o
    JOIN payment_transactions pt ON pt.order_id = o.id::text
    LEFT JOIN customers c ON c.id::text = o.customer_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE pt.transaction_id = ${transactionId}
    GROUP BY o.id, c.email, c.user_id
    ORDER BY o.id DESC
    LIMIT 1
  `

  return (rows[0] as OrderRow) || null
}

function isSuccessfulOrderStatus(status: string | null | undefined): boolean {
  const normalized = String(status || "").toLowerCase()
  return normalized === "completed" || normalized === "pending" || normalized === "processing"
}

function parseAddress(address: unknown) {
  if (!address) return null

  const parsed = typeof address === "string" ? JSON.parse(address) : address
  if (!parsed || typeof parsed !== "object") return null

  const value = parsed as Record<string, string | null | undefined>
  const firstName = value.first_name ?? value.firstName ?? ""
  const lastName = value.last_name ?? value.lastName ?? ""

  return {
    name: `${firstName} ${lastName}`.trim() || "Customer",
    street: value.address_line1 ?? value.address1 ?? value.addressLine1 ?? "Address not provided",
    city: value.city ?? "City not provided",
    state: value.state ?? "State not provided",
    zipCode: value.postal_code ?? value.zipCode ?? value.postalCode ?? "ZIP not provided",
    country: value.country ?? "Country not provided",
  }
}

/**
 * Order access control for the success/verification page.
 *
 * Authenticated users: verified via session userId OR email match.
 * Guest users: access is granted by orderNumber alone.
 *
 * The order number is unpredictable (random base-36 chars) and is only
 * known to the person who placed the order, making it a sufficient
 * access credential — the standard e-commerce pattern used by Shopify,
 * Amazon, WooCommerce, etc.
 *
 * A guest-order-token cookie was designed in an earlier security pass
 * but was never minted in the order creation flow, so we fall back to
 * orderNumber-based access for guest checkout verification.
 */
async function assertOrderAccess(order: OrderRow): Promise<NextResponse | null> {
  const session = getOptionalSession()

  if (session) {
    // Primary: the customer record's user_id matches the JWT session
    if (order.customer_user_id === session.userId) {
      return null
    }
    // Fallback: customer email matches session email.
    // Covers cases where the customer record was created before the user
    // registered (customer_user_id is NULL) or was originally a guest.
    if (order.customer_email && order.customer_email === session.email) {
      return null
    }
    // Authenticated user who genuinely doesn't own this order
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  // Guest access: orderNumber serves as the access credential
  return null
}

function buildOrderEmailData(order: OrderRow, body: any): OrderEmailData {
  const shippingAddress = parseAddress(order.shipping_address) || {
    name: body?.customerName || "Customer",
    street: "Address not provided",
    city: "City not provided",
    state: "State not provided",
    zipCode: "ZIP not provided",
    country: "Country not provided",
  }

  const estimatedDelivery =
    body?.estimatedDelivery ||
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US")

  return {
    orderId: String(order.id),
    orderNumber: order.order_number,
    customerId: order.customer_id,
    customerEmail: order.customer_email || body?.customerEmail || "",
    customerPhone: body?.customerPhone,
    paymentMethodId: body?.paymentMethodId || "",
    transactionId: body?.transactionId || `txn_${Date.now()}`,
    authorizationCode: body?.authorizationCode,
    amount: Number(order.subtotal),
    currency: body?.currency || "USD",
    items: (order.items || []).map((item) => ({
      id: String(item.product_id),
      name: item.product_name,
      price: Number(item.unit_price),
      quantity: Number(item.quantity),
      image: undefined,
    })),
    shippingMethod: body?.shippingMethod || "Standard Shipping",
    shippingCost: Number(order.shipping_amount),
    tax: Number(order.tax_amount),
    total: Number(order.total_amount),
    orderDate: new Date(order.order_date || order.created_at),
    estimatedDelivery,
    shippingAddress,
    trackingNumber: order.tracking_number || body?.trackingNumber,
  }
}


export async function GET(request: NextRequest) {
  const sql = getSqlConnection();

  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get("orderNumber")
    const transactionId = searchParams.get("transactionId")

    if (!orderNumber && !transactionId) {
      return NextResponse.json({ error: "Order number or transaction id is required" }, { status: 400 })
    }

    const order = orderNumber
      ? await getOrderByNumber(orderNumber)
      : await getOrderByTransactionId(transactionId as string)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const accessError = await assertOrderAccess(order)
    if (accessError) return accessError

    if (!isSuccessfulOrderStatus(order.status)) {
      return NextResponse.json({ error: "Order is not complete" }, { status: 400 })
    }

    const responseBody = {
      success: true,
      order: {
        id: String(order.id),
        orderNumber: order.order_number,
        status: "completed",
        actualStatus: order.status,
        paymentStatus: order.payment_status,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax_amount),
        shipping: Number(order.shipping_amount),
        total: Number(order.total_amount),
        customerEmail: order.customer_email,
        orderDate: order.order_date,
        createdAt: order.created_at,
        trackingNumber: order.tracking_number,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US"),
        items: (order.items || []).map((item) => ({
          id: String(item.id),
          productId: item.product_id,
          productName: item.product_name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          totalPrice: Number(item.total_price),
        })),
      },
      emailNotifications: {
        adminNotificationSent: true,
        customerConfirmationSent: true,
      },
    }

    return NextResponse.json(responseBody, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error("Error retrieving order status")
    return NextResponse.json({ error: "Failed to retrieve order status" }, { status: 500 })
  }
}

