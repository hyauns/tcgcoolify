export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireSession } from "@/lib/auth-guard"
import { assertSameOrigin } from "@/lib/csrf"


/** GET /api/wishlist — Return all wishlist items for the authenticated user. */
export async function GET() {
  const sql = getSql();

  const session = await requireSession()
  if (session instanceof NextResponse) return session
  const userId = session.userId

  const rows = await sql`
    SELECT
      w.product_id    AS id,
      w.added_at,
      w.notes,
      p.name,
      p.price,
      p.original_price  AS "originalPrice",
      p.category,
      p.stock_quantity  > 0 AS "inStock"
    FROM wishlists w
    JOIN products p ON p.id = w.product_id
    WHERE w.user_id = ${userId}
    ORDER BY w.added_at DESC
  `
  return NextResponse.json({ items: rows })
}

/** POST /api/wishlist — Add a product to the wishlist (idempotent). */
export async function POST(request: NextRequest) {
  const sql = getSql();

  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  const sessionPromise = requireSession()
  const bodyPromise = request.json()

  const session = await sessionPromise
  if (session instanceof NextResponse) return session
  const userId = session.userId

  const { productId, notes } = await bodyPromise
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

  await sql`
    INSERT INTO wishlists (user_id, product_id, notes, added_at)
    VALUES (${userId}, ${productId}, ${notes ?? null}, NOW())
    ON CONFLICT (user_id, product_id) DO NOTHING
  `
  return NextResponse.json({ success: true })
}

/** DELETE /api/wishlist — Remove a product from the wishlist. */
export async function DELETE(request: NextRequest) {
  const sql = getSql();

  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  const sessionPromise = requireSession()
  const bodyPromise = request.json()

  const session = await sessionPromise
  if (session instanceof NextResponse) return session
  const userId = session.userId

  const { productId } = await bodyPromise
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

  await sql`DELETE FROM wishlists WHERE user_id = ${userId} AND product_id = ${productId}`
  return NextResponse.json({ success: true })
}

