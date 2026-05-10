import "server-only"
import { neon } from "@neondatabase/serverless"
import { profileDbQuery } from "../db-profiler"

export interface SitemapProductRow {
  id: number
  name: string
  slug: string
  updated_at: Date
}

function getSqlConnection() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING

  if (!url) return null
  return neon(url)
}

export async function getTotalActiveProductsCount(): Promise<number> {
  return profileDbQuery("getTotalActiveProductsCount", async () => {
    try {
      const sql = getSqlConnection()
      if (!sql) return 0

      const result = await sql`SELECT COUNT(id) as count FROM products WHERE is_active = true`
      if (result && result.length > 0) {
        return parseInt(result[0].count, 10)
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[sitemap] Failed to fetch total product count:", error)
      }
    }
    return 0
  })
}

export async function getSitemapProductsBatch(offset: number, limit: number): Promise<SitemapProductRow[]> {
  return profileDbQuery(`getSitemapProductsBatch(offset=${offset}, limit=${limit})`, async () => {
    try {
      const sql = getSqlConnection()
      if (!sql) return []

      // Fetch absolute minimum fields required to build localized slugs and <lastmod>
      const rows = await sql`
        SELECT id, name, slug, COALESCE(updated_at, created_at) as updated_at
        FROM products
        WHERE is_active = true
        ORDER BY id ASC
        LIMIT ${limit} OFFSET ${offset}
      `
      // Ensure accurate return typing
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        updated_at: new Date(r.updated_at)
      }))
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error(`[sitemap] Error fetching products batch offset ${offset}:`, error)
      }
      return []
    }
  })
}
