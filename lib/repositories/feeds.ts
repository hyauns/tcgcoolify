import "server-only"
import { cache } from "react"
import { getSql } from "../db-client"
import { profileDbQuery } from "../db-profiler"

// ============================================================
// Types
// ============================================================

export interface FeedConfiguration {
  id: string
  name: string
  category_slug: string | null
  product_type: string | null
  stock_status: string
  exclude_preorders: boolean
  preorder_status: string // 'all' | 'exclude' | 'only'
  min_price: number | null
  max_price: number | null
  is_active: boolean
  platform: string
  created_at: string
  updated_at: string
}

export interface FeedProductRow {
  id: number
  name: string
  description: string | null
  slug: string | null
  price: string
  original_price: string | null
  image_url: string | null
  stock_quantity: number
  product_type: string | null
  is_pre_order: boolean | null
  release_date: string | null
  brands: string | null
  rarity: string | null
  category_name: string | null
}

export interface CreateFeedInput {
  name: string
  category_slug?: string | null
  product_type?: string | null
  stock_status?: string
  exclude_preorders?: boolean
  preorder_status?: string // 'all' | 'exclude' | 'only'
  min_price?: number | null
  max_price?: number | null
  platform?: string
}

export interface UpdateFeedInput {
  name?: string
  category_slug?: string | null
  product_type?: string | null
  stock_status?: string
  preorder_status?: string // 'all' | 'exclude' | 'only'
  min_price?: number | null
  max_price?: number | null
  platform?: string
}

// ============================================================
// Database connection
// ============================================================

function getSqlConnection() {
  try {
    return getSql()
  } catch {
    return null
  }
}

// ============================================================
// CRUD Operations
// ============================================================

/**
 * Create a new feed configuration.
 */
export async function createFeedConfiguration(input: CreateFeedInput): Promise<FeedConfiguration | null> {
  const sql = getSqlConnection()
  if (!sql) return null

  // Derive preorder_status: prefer the new field, fallback to old boolean
  const preorderStatus = input.preorder_status
    || (input.exclude_preorders ? 'exclude' : 'all')

  try {
    const rows = await sql`
      INSERT INTO feed_configurations (name, category_slug, product_type, stock_status, exclude_preorders, preorder_status, min_price, max_price, platform)
      VALUES (
        ${input.name},
        ${input.category_slug || null},
        ${input.product_type || null},
        ${input.stock_status || 'in_stock'},
        ${preorderStatus === 'exclude'},
        ${preorderStatus},
        ${input.min_price ?? null},
        ${input.max_price ?? null},
        ${input.platform || 'GOOGLE'}
      )
      RETURNING *
    ` as FeedConfiguration[]

    return rows[0] || null
  } catch (error) {
    console.error("[feeds] Error creating feed configuration:", error)
    return null
  }
}

/**
 * Update an existing feed configuration by UUID.
 * The UUID (primary key / public URL) remains unchanged.
 */
export async function updateFeedConfiguration(id: string, input: UpdateFeedInput): Promise<FeedConfiguration | null> {
  const sql = getSqlConnection()
  if (!sql) return null

  try {
    const rows = await sql`
      UPDATE feed_configurations
      SET
        name             = COALESCE(${input.name ?? null}, name),
        category_slug    = ${input.category_slug ?? null},
        product_type     = ${input.product_type ?? null},
        stock_status     = COALESCE(${input.stock_status ?? null}, stock_status),
        preorder_status  = COALESCE(${input.preorder_status ?? null}, preorder_status),
        exclude_preorders = ${(input.preorder_status ?? 'all') === 'exclude'},
        min_price        = ${input.min_price ?? null},
        max_price        = ${input.max_price ?? null},
        platform         = COALESCE(${input.platform ?? null}, platform),
        updated_at       = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    ` as FeedConfiguration[]

    return rows[0] || null
  } catch (error) {
    console.error("[feeds] Error updating feed configuration:", error)
    return null
  }
}

/**
 * List all feed configurations, newest first.
 */
export const listFeedConfigurations = cache(async function listFeedConfigurations(): Promise<FeedConfiguration[]> {
  const sql = getSqlConnection()
  if (!sql) return []

  try {
    const rows = await sql`
      SELECT * FROM feed_configurations
      ORDER BY created_at DESC
    ` as FeedConfiguration[]
    return rows
  } catch (error) {
    console.error("[feeds] Error listing feed configurations:", error)
    return []
  }
})

/**
 * Get a single feed configuration by UUID.
 * Returns null if not found or inactive.
 */
export const getFeedConfigurationById = cache(async function getFeedConfigurationById(id: string): Promise<FeedConfiguration | null> {
  const sql = getSqlConnection()
  if (!sql) return null

  try {
    const rows = await sql`
      SELECT * FROM feed_configurations
      WHERE id = ${id} AND is_active = true
    ` as FeedConfiguration[]

    return rows[0] || null
  } catch (error) {
    console.error("[feeds] Error fetching feed configuration:", error)
    return null
  }
})

/**
 * Delete a feed configuration by UUID.
 */
export async function deleteFeedConfiguration(id: string): Promise<boolean> {
  const sql = getSqlConnection()
  if (!sql) return false

  try {
    await sql`DELETE FROM feed_configurations WHERE id = ${id}`
    return true
  } catch (error) {
    console.error("[feeds] Error deleting feed configuration:", error)
    return false
  }
}

// ============================================================
// Streaming Product Query (Paginated)
// ============================================================

/**
 * Fetch a page of products matching the feed configuration's filter rules.
 *
 * This function is called in a loop by the streaming XML endpoint.
 * Each call returns at most `limit` rows (default 500).
 * When it returns fewer rows than the limit, the caller knows it has
 * reached the end of the result set.
 *
 * Only the columns needed for GMC XML generation are selected — no
 * heavy JOINs or unnecessary data hydration.
 */
export const streamFeedProducts = cache(async function streamFeedProducts(
  config: FeedConfiguration,
  offset: number,
  limit: number = 500,
): Promise<FeedProductRow[]> {
  return profileDbQuery(`streamFeedProducts(offset=${offset})`, async () => {
    const sql = getSqlConnection()
    if (!sql) return []

    try {
      // ── Build dynamic WHERE fragments from the config ──────────────
      const categoryFilter = config.category_slug
        ? sql`AND pc.slug = ${config.category_slug}`
        : sql``

      const typeFilter = config.product_type === "sealed"
        ? sql`AND p.product_type ILIKE '%sealed%'`
        : config.product_type === "single"
          ? sql`AND (p.product_type ILIKE '%card%' OR p.product_type ILIKE '%single%')`
          : sql``

      // 3-state preorder filter (replaces old boolean logic)
      const preorderStatus = config.preorder_status || (config.exclude_preorders ? 'exclude' : 'all')

      // ── CRITICAL: Stock filter must NOT kill pre-order items ──────
      // Pre-order products typically have stock_quantity = 0.
      // When preorder_status is 'all' or 'only', we must exempt
      // pre-order items from the stock_quantity > 0 requirement.
      let stockFilter
      if (config.stock_status === "in_stock") {
        if (preorderStatus === 'exclude') {
          // Simple case: no pre-orders in the feed, just filter by stock
          stockFilter = sql`AND p.stock_quantity > 0`
        } else {
          // 'all' or 'only': allow pre-order items even if stock = 0
          stockFilter = sql`AND (p.stock_quantity > 0 OR p.is_pre_order = true)`
        }
      } else if (config.stock_status === "out_of_stock") {
        stockFilter = sql`AND p.stock_quantity <= 0`
      } else {
        stockFilter = sql`` // 'all' — no stock filter
      }

      const preorderFilter = preorderStatus === 'exclude'
        ? sql`AND (p.is_pre_order IS NULL OR p.is_pre_order = false)`
        : preorderStatus === 'only'
          ? sql`AND p.is_pre_order = true`
          : sql`` // 'all' — no filter

      console.log(`[feeds] streamFeedProducts — feed_id: "${config.id}", min_price: ${config.min_price}, max_price: ${config.max_price}, preorder_status: "${preorderStatus}", stock_status: "${config.stock_status}", offset: ${offset}`)

      // Price column is DECIMAL(10,2) — direct numeric comparison is safe
      const minPriceFilter = config.min_price != null
        ? sql`AND p.price >= ${config.min_price}`
        : sql``

      const maxPriceFilter = config.max_price != null
        ? sql`AND p.price <= ${config.max_price}`
        : sql``

      const rows = await sql`
        SELECT
          p.id,
          p.name,
          LEFT(p.description, 5000) AS description,
          p.name AS slug,
          p.price,
          p.original_price,
          p.image_url,
          p.stock_quantity,
          p.product_type,
          p.is_pre_order,
          p.release_date,
          p.brands,
          p.rarity,
          pc.name AS category_name
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true
          ${categoryFilter}
          ${typeFilter}
          ${stockFilter}
          ${preorderFilter}
          ${minPriceFilter}
          ${maxPriceFilter}
        ORDER BY p.id ASC
        LIMIT ${limit} OFFSET ${offset}
      ` as FeedProductRow[]

      return rows
    } catch (error) {
      console.error(`[feeds] Error streaming feed products batch offset ${offset}:`, error)
      return []
    }
  })
})

/**
 * Count the total number of products matching the feed configuration's filter rules.
 */
export const countFeedProducts = cache(async function countFeedProducts(config: FeedConfiguration): Promise<number> {
  const sql = getSqlConnection()
  if (!sql) return 0

  try {
    const categoryFilter = config.category_slug
      ? sql`AND pc.slug = ${config.category_slug}`
      : sql``

    const typeFilter = config.product_type === "sealed"
      ? sql`AND p.product_type ILIKE '%sealed%'`
      : config.product_type === "single"
        ? sql`AND (p.product_type ILIKE '%card%' OR p.product_type ILIKE '%single%')`
        : sql``

    const preorderStatus = config.preorder_status || (config.exclude_preorders ? 'exclude' : 'all')

    let stockFilter
    if (config.stock_status === "in_stock") {
      if (preorderStatus === 'exclude') {
        stockFilter = sql`AND p.stock_quantity > 0`
      } else {
        stockFilter = sql`AND (p.stock_quantity > 0 OR p.is_pre_order = true)`
      }
    } else if (config.stock_status === "out_of_stock") {
      stockFilter = sql`AND p.stock_quantity <= 0`
    } else {
      stockFilter = sql``
    }

    const preorderFilter = preorderStatus === 'exclude'
      ? sql`AND (p.is_pre_order IS NULL OR p.is_pre_order = false)`
      : preorderStatus === 'only'
        ? sql`AND p.is_pre_order = true`
        : sql``

    const minPriceFilter = config.min_price != null
      ? sql`AND p.price >= ${config.min_price}`
      : sql``

    const maxPriceFilter = config.max_price != null
      ? sql`AND p.price <= ${config.max_price}`
      : sql``

    const rows = await sql`
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN product_categories pc
             ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
             OR (p.category_id IS NULL AND pc.name = p.category AND pc.is_active = true)
      WHERE p.is_active = true
        ${categoryFilter}
        ${typeFilter}
        ${stockFilter}
        ${preorderFilter}
        ${minPriceFilter}
        ${maxPriceFilter}
    `

    return Number(rows[0]?.total || 0)
  } catch (error) {
    console.error("[feeds] Error counting feed products:", error)
    return 0
  }
})
