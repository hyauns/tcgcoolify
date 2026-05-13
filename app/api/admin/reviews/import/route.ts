import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireAdmin } from "@/lib/auth-guard"

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (session instanceof NextResponse) return session

  try {
    const payload = await request.json()

    if (!Array.isArray(payload)) {
      return NextResponse.json({ error: "Payload must be a JSON array" }, { status: 400 })
    }

    const sql = getSql()
    let imported = 0
    let failed = 0

    // Since neon driver handles transactions via `sql.transaction`,
    // or we can just loop them sequentially for simplicity.
    for (const review of payload) {
      try {
        const { product_slug, rating, title, review_text, customer_name, date } = review

        // 1. Resolve product_id from slug
        const [prod] = await sql`SELECT id FROM products WHERE slug = ${product_slug} LIMIT 1`
        if (!prod) {
          failed++
          continue
        }

        // 2. Create a dummy customer for this review to satisfy FK and unique constraints
        const email = `import_${Math.random().toString(36).substring(2)}@tcglore.local`
        const [firstName, ...rest] = (customer_name || "Anonymous").split(" ")
        const lastName = rest.join(" ") || ""

        const [cust] = await sql`
          INSERT INTO customers (email, first_name, last_name)
          VALUES (${email}, ${firstName}, ${lastName})
          RETURNING id
        `

        // 3. Insert review
        const reviewDate = date ? new Date(date) : new Date()

        await sql`
          INSERT INTO product_reviews (
            customer_id, product_id, rating, title, review_text, 
            is_verified_purchase, is_approved, created_at, updated_at
          ) VALUES (
            ${cust.id}, ${prod.id}, ${rating}, ${title}, ${review_text},
            true, true, ${reviewDate}, ${reviewDate}
          )
        `

        imported++
      } catch (err) {
        console.error("Error importing review row:", err)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed,
      message: `Successfully imported ${imported} reviews. Failed: ${failed}.`
    })

  } catch (error) {
    console.error("[admin/reviews/import/POST]", error)
    return NextResponse.json({ error: "Failed to process import payload" }, { status: 500 })
  }
}

