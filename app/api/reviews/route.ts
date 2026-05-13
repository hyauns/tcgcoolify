/**
 * app/api/reviews/route.ts
 *
 * GET  /api/reviews?product_id=42  → approved reviews for that product
 * POST /api/reviews                → submit a new review (pending moderation)
 *
 * Auth:  reads the same `auth-token` cookie used by /api/auth/session.
 *        customer_id is populated when the token is valid; null = anonymous.
 */
import { type NextRequest, NextResponse } from "next/server"
import { getSql as getDbSql } from "@/lib/db-client"
import { requireSession } from "@/lib/auth-guard"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


function getSql() {
  return getDbSql()
}

// ─── GET — fetch approved reviews ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawId = searchParams.get("product_id")
  const productId = rawId ? parseInt(rawId, 10) : NaN

  if (!productId || isNaN(productId)) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 })
  }

  try {
    const sql = getSql()

    const rows = await sql`
      SELECT
        pr.id::text            AS id,
        pr.product_id,
        pr.customer_id,
        pr.rating,
        pr.title,
        pr.review_text,
        pr.is_verified_purchase,
        pr.created_at,
        -- Try to resolve a first name from the customers/users join for display
        COALESCE(u.first_name || ' ' || LEFT(u.last_name, 1) || '.', c.first_name || ' ' || LEFT(c.last_name, 1) || '.', c.first_name, NULL) AS reviewer_name
      FROM product_reviews pr
      LEFT JOIN customers c ON c.id = pr.customer_id
      LEFT JOIN users     u ON u.user_id = c.user_id
      WHERE pr.product_id = ${productId}
        AND pr.is_approved = TRUE
      ORDER BY pr.created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ reviews: rows })
  } catch (error) {
    console.error("[reviews/GET]", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}

// ─── POST — submit a new review ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const sessionPromise = requireSession()
  const bodyPromise = request.json()

  const session = await sessionPromise
  if (session instanceof NextResponse) return session

  try {
    const body = await bodyPromise
    const { product_id, rating, title, review_text } = body

    // Validate required fields
    if (!product_id || typeof product_id !== "number") {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 })
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be between 1 and 5" }, { status: 400 })
    }
    if (!review_text || typeof review_text !== "string" || review_text.trim().length < 10) {
      return NextResponse.json({ error: "review_text must be at least 10 characters" }, { status: 400 })
    }

    // Resolve customer_id from the authenticated session.
    let customerId: number | null = null
    let isVerifiedPurchase = false

    const sql = getSql()
    const [row] = await sql`
      SELECT c.id AS customer_id
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.user_id
      WHERE u.user_id = ${session.userId}
        AND u.status = 'active'
      LIMIT 1
    `

    if (row?.customer_id) {
      customerId = Number(row.customer_id)
      const [orderRow] = await sql`
        SELECT 1
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.customer_id = ${customerId}
          AND oi.product_id  = ${product_id}
        LIMIT 1
      `
      isVerifiedPurchase = !!orderRow
    }

    const [inserted] = await sql`
      INSERT INTO product_reviews (
        product_id,
        customer_id,
        rating,
        title,
        review_text,
        is_verified_purchase,
        is_approved
      ) VALUES (
        ${product_id},
        ${customerId},
        ${rating},
        ${title?.trim() || null},
        ${review_text.trim()},
        ${isVerifiedPurchase},
        FALSE
      )
      RETURNING id::text, is_verified_purchase
    `

    return NextResponse.json(
      {
        success: true,
        review_id: inserted.id,
        is_verified_purchase: inserted.is_verified_purchase,
        message: "Thank you! Your review will appear after moderation.",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[reviews/POST]", error)
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
  }
}

