import "server-only"
import { cache } from "react"
import { getSql } from "../db-client"

export interface FilterAggregations {
  productType: { sealed: number; singles: number }
  rarity: { label: string; count: number }[]
  availability: { inStock: number; outOfStock: number; preOrder: number }
}

function getSqlConnection() {
  try {
    return getSql()
  } catch {
    return null
  }
}

export function defaultAggregations(): FilterAggregations {
  return {
    productType: { sealed: 0, singles: 0 },
    rarity: [],
    availability: { inStock: 0, outOfStock: 0, preOrder: 0 },
  }
}

/**
 * Fetch aggregate filter counts via dedicated SQL GROUP BY queries.
 *
 * These counts are scoped to the current category/search context but are NOT
 * further filtered by productType or rarity, so the user can always see the
 * full set of available facet options within their browsing context.
 *
 * Two queries run in parallel:
 *   1. Combined availability + product type counts (single row)
 *   2. Context-aware rarity distribution (one row per rarity value)
 */
export const getFilterAggregations = cache(async function getFilterAggregations(
  categorySlug?: string | null,
  searchQuery?: string | null,
): Promise<FilterAggregations> {
  const sql = getSqlConnection()
  if (!sql) return defaultAggregations()

  try {
    const categoryFilter =
      categorySlug && categorySlug !== "all"
        ? sql`AND pc.slug = ${categorySlug} AND pc.is_active = true`
        : sql``

    const searchPattern = searchQuery ? `%${searchQuery}%` : null
    const searchFilter = searchPattern
      ? sql`AND (p.name ILIKE ${searchPattern} OR p.category ILIKE ${searchPattern} OR pc.name ILIKE ${searchPattern})`
      : sql``

    const [countsResult, rarityResult] = await Promise.all([
      // ── Combined availability + product type counts ───────────────────────
      sql`
        SELECT
          COUNT(*) FILTER (WHERE p.product_type ILIKE '%sealed%') as sealed_count,
          COUNT(*) FILTER (WHERE p.product_type IS NOT NULL AND p.product_type NOT ILIKE '%sealed%') as singles_count,
          COUNT(*) FILTER (WHERE p.stock_quantity > 0 AND (p.is_pre_order IS NULL OR p.is_pre_order = false)) as in_stock,
          COUNT(*) FILTER (WHERE p.stock_quantity <= 0 AND (p.is_pre_order IS NULL OR p.is_pre_order = false)) as out_of_stock,
          COUNT(*) FILTER (WHERE p.is_pre_order = true) as pre_order
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true
          ${categoryFilter}
          ${searchFilter}
      `,
      // ── Context-aware rarity distribution ──────────────────────────────────
      sql`
        SELECT p.rarity as label, COUNT(*) as count
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true
          AND p.rarity IS NOT NULL AND p.rarity != ''
          ${categoryFilter}
          ${searchFilter}
        GROUP BY p.rarity
        ORDER BY count DESC
      `,
    ])

    const counts = countsResult[0] || {}

    return {
      productType: {
        sealed: parseInt(counts.sealed_count || "0", 10),
        singles: parseInt(counts.singles_count || "0", 10),
      },
      rarity: rarityResult.map((r: any) => ({
        label: String(r.label),
        count: parseInt(r.count, 10),
      })),
      availability: {
        inStock: parseInt(counts.in_stock || "0", 10),
        outOfStock: parseInt(counts.out_of_stock || "0", 10),
        preOrder: parseInt(counts.pre_order || "0", 10),
      },
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[filter_aggregations] Error fetching aggregations:", error)
    }
    return defaultAggregations()
  }
})
