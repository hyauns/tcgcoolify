export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireSession } from "@/lib/auth-guard"


export async function GET() {
  const sql = getSql();

  const session = await requireSession()
  if (session instanceof NextResponse) return session
  const userId = session.userId

  try {
    // Resolve the customers.id for this user (the FK used in orders.customer_id)
    const [customerRow] = await sql`
      SELECT id FROM customers WHERE user_id = ${userId} LIMIT 1
    `

    if (!customerRow) {
      // No customer record yet — no orders possible
      return NextResponse.json({ orders: [] })
    }

    const customerId = customerRow.id

    // Fetch orders with aggregated items as JSON
    const orders = await sql`
      SELECT
        o.id,
        o.order_number,
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
        COALESCE(
          json_agg(
            json_build_object(
              'id',           oi.id,
              'product_id',   oi.product_id,
              'product_name', oi.product_name,
              'quantity',     oi.quantity,
              'unit_price',   oi.unit_price,
              'total_price',  oi.total_price
            )
            ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.customer_id = ${String(customerId)}
      GROUP BY o.id
      ORDER BY o.order_date DESC
    `

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: String(o.id),
        order_number: o.order_number,
        status: o.status,
        payment_status: o.payment_status,
        subtotal: Number(o.subtotal),
        tax_amount: Number(o.tax_amount),
        shipping_amount: Number(o.shipping_amount),
        total_amount: Number(o.total_amount),
        shipping_address: o.shipping_address,
        billing_address: o.billing_address,
        tracking_number: o.tracking_number,
        order_date: o.order_date,
        created_at: o.created_at,
        items: o.items || [],
      })),
    })
  } catch (error) {
    console.error("Account orders fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

