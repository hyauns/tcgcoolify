export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireSession } from "@/lib/auth-guard"
import { assertSameOrigin } from "@/lib/csrf"
import { checkCartRateLimit, getClientIP } from "@/lib/rate-limiter"


function getSqlConnection() {
  return getSql()
}

/**
 * Resolve customers.id (integer) from users.user_id (uuid).
 * The check_customer_or_session constraint requires customer_id OR session_id to be non-null.
 */
async function getCustomerId(userId: string): Promise<number | null> {
  const sql = getSqlConnection()
  console.time("[DB] GET Customer ID")
  const [row] = await sql`
    SELECT id FROM customers WHERE user_id = ${userId}::uuid LIMIT 1
  `
  console.timeEnd("[DB] GET Customer ID")
  return row ? Number(row.id) : null
}

/** GET /api/cart — Return all cart rows for the authenticated user. */
export async function GET() {
  const sql = getSqlConnection();

  const session = await requireSession()
  if (session instanceof NextResponse) return session
  const userId = session.userId

  console.time("[DB] GET Cart")
  const rows = await sql`
    SELECT
      sc.product_id AS id,
      sc.quantity,
      sc.added_at,
      p.name,
      p.price,
      p.original_price  AS "originalPrice",
      p.category,
      p.stock_quantity  > 0 AS "inStock"
    FROM shopping_carts sc
    JOIN products p ON p.id = sc.product_id
    WHERE sc.user_id = ${userId}::uuid
    ORDER BY sc.added_at ASC
  `
  console.timeEnd("[DB] GET Cart")
  return NextResponse.json({ items: rows })
}

/** POST /api/cart — Upsert a product into the cart (add or increment). */
export async function POST(request: NextRequest) {
  const sql = getSqlConnection();

  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  const clientIP = getClientIP(request)
  const rateLimitResult = await checkCartRateLimit(clientIP)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const session = await requireSession()
  if (session instanceof NextResponse) return session
  const userId = session.userId

  const { productId, quantity = 1 } = await request.json()
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

  const customerId = await getCustomerId(userId)

  // shopping_carts has no unique constraint on (user_id, product_id),
  // so we cannot use ON CONFLICT — check-then-update/insert instead.
  console.time("[DB] POST Check Cart")
  const [existing] = await sql`
    SELECT id, quantity FROM shopping_carts
    WHERE user_id = ${userId}::uuid AND product_id = ${Number(productId)}
    LIMIT 1
  `
  console.timeEnd("[DB] POST Check Cart")
  if (existing) {
    console.time("[DB] POST Update Cart")
    await sql`
      UPDATE shopping_carts
      SET quantity = quantity + ${Number(quantity)}, updated_at = NOW()
      WHERE id = ${existing.id}
    `
    console.timeEnd("[DB] POST Update Cart")
  } else {
    console.time("[DB] POST Insert Cart")
    await sql`
      INSERT INTO shopping_carts (user_id, customer_id, session_id, product_id, quantity, added_at, updated_at)
      VALUES (
        ${userId}::uuid,
        ${customerId},
        ${customerId ? null : `guest_${userId}`},
        ${Number(productId)},
        ${Number(quantity)},
        NOW(), NOW()
      )
    `
    console.timeEnd("[DB] POST Insert Cart")
  }
  return NextResponse.json({ success: true })
}

/** PATCH /api/cart — Set an exact quantity (0 = remove). */
export async function PATCH(request: NextRequest) {
  const sql = getSqlConnection();

  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  const clientIP = getClientIP(request)
  const rateLimitResult = await checkCartRateLimit(clientIP)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const session = await requireSession()
  if (session instanceof NextResponse) return session
  const userId = session.userId

  const { productId, quantity } = await request.json()
  if (!productId || quantity === undefined) return NextResponse.json({ error: "productId and quantity required" }, { status: 400 })

  const customerId = await getCustomerId(userId)

  if (quantity <= 0) {
    console.time("[DB] PATCH Delete Item")
    await sql`DELETE FROM shopping_carts WHERE user_id = ${userId}::uuid AND product_id = ${Number(productId)}`
    console.timeEnd("[DB] PATCH Delete Item")
  } else {
    console.time("[DB] PATCH Check Cart")
    const [existing] = await sql`
      SELECT id FROM shopping_carts
      WHERE user_id = ${userId}::uuid AND product_id = ${Number(productId)}
      LIMIT 1
    `
    console.timeEnd("[DB] PATCH Check Cart")
    if (existing) {
      console.time("[DB] PATCH Update Cart")
      await sql`UPDATE shopping_carts SET quantity = ${Number(quantity)}, updated_at = NOW() WHERE id = ${existing.id}`
      console.timeEnd("[DB] PATCH Update Cart")
    } else {
      console.time("[DB] PATCH Insert Cart")
      await sql`
        INSERT INTO shopping_carts (user_id, customer_id, session_id, product_id, quantity, added_at, updated_at)
        VALUES (
          ${userId}::uuid,
          ${customerId},
          ${customerId ? null : `guest_${userId}`},
          ${Number(productId)},
          ${Number(quantity)},
          NOW(), NOW()
        )
      `
      console.timeEnd("[DB] PATCH Insert Cart")
    }
  }
  return NextResponse.json({ success: true })
}

/** DELETE /api/cart — Remove a single item, or pass clearAll=true to wipe the cart. */
export async function DELETE(request: NextRequest) {
  const sql = getSqlConnection();

  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  const clientIP = getClientIP(request)
  const rateLimitResult = await checkCartRateLimit(clientIP)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  const session = await requireSession()
  if (session instanceof NextResponse) return session
  const userId = session.userId

  const { productId, clearAll } = await request.json()

  if (clearAll) {
    console.time("[DB] DELETE Clear All Cart")
    await sql`DELETE FROM shopping_carts WHERE user_id = ${userId}::uuid`
    console.timeEnd("[DB] DELETE Clear All Cart")
  } else if (productId) {
    console.time("[DB] DELETE Item Cart")
    await sql`DELETE FROM shopping_carts WHERE user_id = ${userId}::uuid AND product_id = ${productId}`
    console.timeEnd("[DB] DELETE Item Cart")
  } else {
    return NextResponse.json({ error: "productId or clearAll required" }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

