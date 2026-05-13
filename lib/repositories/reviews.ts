import "server-only"
import { cache } from "react"
import { getSql } from "../db-client"

export interface ReviewDb {
  id: string
  rating: number
  title: string | null
  review_text: string | null
  is_verified_purchase: boolean
  customer_name: string
  created_at: string
}

function getSqlConnection() {
  try {
    return getSql()
  } catch {
    return null
  }
}

export const getReviewsByProductId = cache(async function getReviewsByProductId(productId: number, limit: number = 5): Promise<ReviewDb[]> {
  try {
    const sql = getSqlConnection()
    if (!sql) return []

    // Fetch verified, approved reviews and mask the customer name (e.g. "John D.")
    const rows = await sql`
      SELECT 
        pr.id, pr.rating, pr.title, pr.review_text, pr.is_verified_purchase, pr.created_at,
        COALESCE(c.first_name, 'Validated') || ' ' || COALESCE(SUBSTRING(c.last_name, 1, 1), 'Customer') as customer_name
      FROM product_reviews pr
      LEFT JOIN customers c ON c.id = pr.customer_id
      WHERE pr.product_id = ${productId} AND pr.is_approved = true
      ORDER BY pr.created_at DESC
      LIMIT ${limit}
    `
    
    // Map dates properly to strings (ISO output for schema)
    return rows.map((r: any) => ({
      id: r.id,
      rating: parseInt(r.rating, 10),
      title: r.title,
      review_text: r.review_text,
      is_verified_purchase: Boolean(r.is_verified_purchase),
      customer_name: r.customer_name,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString().split('T')[0] : String(r.created_at).split('T')[0]
    }))
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[reviews_repo] Failed to fetch product reviews:", error)
    }
    return []
  }
})
