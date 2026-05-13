export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireAdmin } from "@/lib/auth-guard"

/**
 * GET /api/admin/low-stock
 * Returns products with stock_quantity <= 10, ordered by stock ascending.
 */
export async function GET() {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const sql = getSql()

    const rows = await sql`
      SELECT id, name, stock_quantity
      FROM products
      WHERE is_active = true
        AND stock_quantity <= 10
        AND stock_quantity > 0
      ORDER BY stock_quantity ASC
      LIMIT 10
    `

    return NextResponse.json({
      products: rows.map((row: any) => ({
        id: Number(row.id),
        name: row.name,
        stock_quantity: Number(row.stock_quantity),
      })),
    })
  } catch (error) {
    console.error("[admin/low-stock] Error:", error)
    return NextResponse.json({ products: [] }, { status: 500 })
  }
}
