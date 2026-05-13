import "server-only"
import { cache } from "react"
import { getSql } from "./db-client"
import type { Review } from "./reviews"
import { profileDbQuery } from "./db-profiler"
import { withDbRetry } from "./db-retry"
import { generateRealisticSalesCount } from "./sales-generator"

// ============================================================
// Public types — matching the Product interface expected by pages
// ============================================================

export interface Product {
  id: number
  name: string
  slug: string
  price: number
  originalPrice?: number
  image: string
  category: string        // Display name, e.g. "Pokemon TCG"
  categorySlug?: string   // URL slug, e.g. "pokemon-tcg"
  categoryId?: number     // FK to product_categories.id
  rating?: number
  reviews?: number
  inStock: boolean
  isNew: boolean
  isHot: boolean
  isPreOrder: boolean
  preOrderDate?: string
  releaseDate?: string
  salesCount?: number
  description?: string
  features?: string[]
  specifications?: Record<string, string | undefined>
  stock?: number
  condition?: string
  rarity?: string
  productType?: string
  brands?: string
}

export interface CategoryMeta {
  id: number
  name: string
  slug: string
  description: string | null
}

// ============================================================
// Internal DB row types
// ============================================================

/** Raw row from the `products` table only */
interface DbProductRaw {
  id: number
  name: string
  slug: string | null        // URL slug — populated for all rows
  category: string          // legacy varchar column (still populated)
  category_id: number | null // new FK column (nullable during migration)
  description: string | null
  price: string
  original_price: string | null
  image_url: string | null
  cost: string | null
  stock_quantity: number
  is_active: boolean
  created_at: Date
  updated_at?: Date
  rarity: string | null
  brands: string | null
}

/** Row after JOIN with product_categories — category name & slug resolved authoritatively */
interface DbProductJoined extends DbProductRaw {
  pc_id: number | null
  pc_name: string | null   // authoritative category name from product_categories
  pc_slug: string | null   // authoritative category slug from product_categories
  pc_description: string | null
  // New columns added in migration
  is_pre_order: boolean | null   // NULL when column doesn't exist yet (caught via try/catch)
  release_date: Date | string | null
  product_type?: string | null
  avg_rating?: string | null
  review_count?: string | null
}

// ============================================================
// Database connection helper
// ============================================================

function getSqlConnection() {
  try {
    return getSql()
  } catch {
    if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
      console.error("[products] No database connection string found")
    }
    return null
  }
}

// ============================================================
// Pure utilities — imported from lib/product-utils.ts and
// re-exported here so server components that already import
// from 'lib/products' continue to work without changes.
// CLIENT COMPONENTS must import from 'lib/product-utils' directly.
// ============================================================
export {
  generateCategorySlug,
  normalizeCategoryParam,
  isHotProduct,
  isNewProduct,
} from "./product-utils"

// Internal alias used inside this file's mapper
import {
  generateCategorySlug as _categorySlug,
  isHotProduct as _isHot,
  isNewProduct as _isNew,
} from "./product-utils"

// Internal product-name slug (not exported — use generateSlug from lib/utils instead)
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "")
}

/**
 * Canonical SELECT for all product queries.
 * Returns every column needed by mapJoinedRowToProduct.
 *
 * Join strategy (3-tier, most to least authoritative):
 *   1. products.category_id FK  → product_categories.id
 *   2. products.category string → product_categories.name (soft match)
 *   Whichever resolves first wins; pc_* columns are NULL when neither matches.
 */
const PRODUCT_JOIN_SQL = `
  FROM products p
  LEFT JOIN product_categories pc
         ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
         OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
  LEFT JOIN (
    SELECT product_id, AVG(rating) as avg_rating, COUNT(id) as review_count
    FROM product_reviews
    WHERE is_approved = true
    GROUP BY product_id
  ) pr ON p.id = pr.product_id
` as const

/**
 * Custom sort prioritizing:
 * 1. Sealed products > $50 with non-fallback images AND is pre-order
 * 2. Other pre-order products
 * 3. Cards
 * 4. Everything else (newest first)
 */
const PRODUCT_SORT_SQL = `
  ORDER BY 
    CASE 
      WHEN p.product_type ILIKE '%sealed%' 
           AND p.image_url IS NOT NULL 
           AND p.image_url != '' 
           AND p.image_url NOT ILIKE '%placeholder%' 
           AND p.price > 50 
           AND p.is_pre_order = true THEN 1
      WHEN p.is_pre_order = true THEN 2
      WHEN p.product_type ILIKE '%card%' THEN 3
      ELSE 4
    END ASC,
    p.created_at DESC
` as const

// Badge helpers are re-exported above from lib/product-utils.
// No duplicate definitions here.

// ============================================================
// Internal mapper
// ============================================================

function mapJoinedRowToProduct(row: DbProductJoined): Product {
  const slug = row.slug || generateSlug(row.name)
  const price = Number(row.price) || 0
  const originalPrice = row.original_price ? Number(row.original_price) : undefined

  // Resolve category display name: authoritative JOIN wins, then FK-derived, then raw column
  const categoryName = row.pc_name ?? row.category ?? "Uncategorized"
  const categorySlug = row.pc_slug ?? _categorySlug(categoryName)
  const categoryId = row.pc_id ?? row.category_id ?? undefined

  const image = row.image_url || `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(categoryName)}`

  const stockQuantity = row.stock_quantity || 0
  const inStock = stockQuantity > 0

  // isNew: created in the last 30 days
  const isNew = _isNew(row.created_at)

  // isHot: deterministic pseudo-random, seeded by product id (~30% of items)
  // See isHotProduct() JSDoc in lib/product-utils.ts for rationale.
  const isHot = _isHot(row.id)

  // ─── Real DB Rating & Reviews ───────────────────────────────────────────────
  const dbRating = row.avg_rating ? parseFloat(row.avg_rating) : 0
  const realRating = dbRating > 0 ? Math.round(dbRating * 10) / 10 : undefined
  const realReviewCount = row.review_count ? parseInt(row.review_count, 10) : 0

  // ─── Sales count (seeded) ─────────────────────────────────────────────────
  const seededSalesCount = generateRealisticSalesCount(
    row.id, price, categoryName, realRating || 5, isNew, isHot, false,
  )

  // ─── Pre-order & release date ────────────────────────────────────────────
  // Read is_pre_order from DB when available (will be null if column is missing —
  // the try/catch in getPreOrderProducts guards that case at query time).
  let isPreOrder = Boolean(row.is_pre_order)

  // Format release_date as a human-readable string if present.
  // Input may be a JS Date (neon driver), a date string, or null.
  let releaseDate: string | undefined
  if (row.release_date) {
    const d = row.release_date instanceof Date
      ? row.release_date
      : new Date(row.release_date)
      
    if (d.getTime() < Date.now()) {
      isPreOrder = false
    }

    // e.g. "March 15, 2025" — locale-independent, readable on both card & PDP
    releaseDate = d.toLocaleDateString("en-US", {
      year:  "numeric",
      month: "long",
      day:   "numeric",
    })
  }

  return {
    id: row.id,
    name: row.name,
    slug,
    price,
    originalPrice,
    image,
    category: categoryName,
    categorySlug,
    categoryId: typeof categoryId === "number" ? categoryId : undefined,
    rating: realRating,
    reviews: realReviewCount,
    inStock,
    isNew,
    isHot,
    isPreOrder,
    preOrderDate: isPreOrder ? "March 15, 2025" : undefined, // Stub
    releaseDate, // Formatted human-readable string (or undefined)
    salesCount: seededSalesCount,
    description: row.description || undefined,
    stock: stockQuantity,
    rarity: row.rarity || undefined,
    productType: row.product_type || undefined,
    brands: row.brands || undefined,
    features: [
      `${stockQuantity} units available`,
      "Authentic product",
      "Ships within 1-3 business days",
    ],
  }
}

// ============================================================
// Data fetching functions
// ============================================================

/**
 * Fetch top 20 product slugs to pre-render at build time without hitting the 2MB cache limit
 */
export const getPopularProductSlugs = cache(async function getPopularProductSlugs(): Promise<string[]> {
  try {
    const sql = getSqlConnection()
    if (!sql) return []

    const rows = await sql`
      SELECT p.slug
      FROM products p
      WHERE p.is_active = true AND p.slug IS NOT NULL
      ${sql.unsafe(PRODUCT_SORT_SQL)}
      LIMIT 20
    `

    return rows.map(r => r.slug)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[products] Error fetching popular product slugs:", error)
    }
    return []
  }
})

/**
 * Fetch all active products, enriched with category metadata via JOIN.
 * WARNING: Do not call this in generateStaticParams without a limit, as the Neon response may exceed 2MB.
 */
export const getAllProducts = cache(async function getAllProducts(productType?: string | null, rarity?: string | null): Promise<Product[]> {
  return profileDbQuery("getAllProducts", async () => {
    try {
      const sql = getSqlConnection()
      if (!sql) return []

      const typeFilter = productType === 'sealed'
        ? sql`AND p.product_type ILIKE '%sealed%'`
        : productType === 'single'
          ? sql`AND (p.product_type ILIKE '%card%' OR p.product_type ILIKE '%single%')`
          : productType
            ? sql`AND p.product_type = ${productType}`
            : sql``
      const rarityFilter = rarity ? sql`AND p.rarity = ${rarity}` : sql``

      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity, p.brands, p.product_type,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          pr.avg_rating,
          pr.review_count
        ${sql.unsafe(PRODUCT_JOIN_SQL)}
        WHERE p.is_active = true
        ${typeFilter}
        ${rarityFilter}
        ${sql.unsafe(PRODUCT_SORT_SQL)}
      ` as DbProductJoined[]

      return rows.map(mapJoinedRowToProduct)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[products] Error fetching all products:", error)
      }
      return []
    }
  })
})

/**
 * Fetch a single product by numeric ID, enriched with category JOIN.
 */
export const getProductById = cache(async function getProductById(id: number): Promise<Product | undefined> {
  return profileDbQuery(`getProductById(${id})`, async () => {
    try {
      const sql = getSqlConnection()
      if (!sql) return undefined

      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, p.description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity, p.brands,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          pc.description AS pc_description,
          pr.avg_rating,
          pr.review_count
        ${sql.unsafe(PRODUCT_JOIN_SQL)}
        WHERE p.is_active = true AND p.id = ${id}
        LIMIT 1
      ` as DbProductJoined[]

      if (!rows[0]) return undefined
      return mapJoinedRowToProduct(rows[0])
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[products] Error fetching product by ID:", error)
      }
      return undefined
    }
  })
})

/**
 * Fetch a single product by its URL slug (derived from name).
 *
 * The slug is computed server-side in PostgreSQL using the same
 * regexp_replace chain as the JS generateSlug() function, so we
 * only return the single matching row instead of loading 79K+ rows.
 */
export const getProductBySlug = cache(async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return profileDbQuery(`getProductBySlug(${slug})`, async () => {
    const sql = getSqlConnection()
    if (!sql) return undefined

    const result = await withDbRetry(
      { label: `getProductBySlug(${slug})`, maxRetries: 2, timeoutMs: 8000 },
      async () => {
        return await sql`
          SELECT
            p.id, p.name, p.slug, p.description, p.category, p.category_id, p.price, p.original_price, p.image_url,
            p.stock_quantity, p.is_active, p.created_at,
            p.is_pre_order, p.release_date,
            p.rarity, p.brands,
            pc.id   AS pc_id,
            pc.name AS pc_name,
            pc.slug AS pc_slug,
            pc.description AS pc_description,
            pr.avg_rating,
            pr.review_count
          ${sql.unsafe(PRODUCT_JOIN_SQL)}
          WHERE p.is_active = true
            AND p.slug = ${slug}
          LIMIT 1
        ` as DbProductJoined[]
      },
    )

    if (!result.ok) {
      // DB error — throw so page shows error boundary / 500, NOT 404
      console.error(`[products] DB error for slug="${slug}" (${result.attempts} attempts, ${result.durationMs}ms): ${result.error.message}`)
      throw result.error
    }

    const rows = result.data
    if (!rows[0]) {
      console.log(`[products] product_lookup_not_found slug="${slug}" (${result.durationMs}ms)`)
      return undefined
    }

    console.log(`[products] product_lookup_success slug="${slug}" id=${rows[0].id} (${result.durationMs}ms)`)
    return mapJoinedRowToProduct(rows[0])
  })
})

/**
 * Legacy helper — filter by raw category name string.
 * Kept for backward-compat; prefer getProductsByCategorySlug for new code.
 */
export const getProductsByCategory = cache(async function getProductsByCategory(category: string): Promise<Product[]> {
  if (category === "All Categories" || category === "all") return getAllProducts()

  try {
    const sql = getSqlConnection()
    if (!sql) return []

    const rows = await sql`
      SELECT
        p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
        p.stock_quantity, p.is_active, p.created_at,
        p.is_pre_order, p.release_date,
        p.rarity, p.brands,
        pc.id   AS pc_id,
        pc.name AS pc_name,
        pc.slug AS pc_slug,
        NULL::text AS pc_description,
        pr.avg_rating,
        pr.review_count
      ${sql.unsafe(PRODUCT_JOIN_SQL)}
      WHERE p.is_active = true
        AND (p.category = ${category} OR pc.name = ${category})
      ${sql.unsafe(PRODUCT_SORT_SQL)}
    ` as DbProductJoined[]

    return rows.map(mapJoinedRowToProduct)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[products] Error fetching products by category:", error)
    }
    return []
  }
})

/**
 * Resolve a category slug to its full metadata.
 *
 * Lookup priority:
 *   1. product_categories.slug  (authoritative, uses index)
 *   2. Derived slug from products.category string (fallback during migration)
 */
export const getCategoryBySlug = cache(async function getCategoryBySlug(slug: string): Promise<CategoryMeta | null> {
  try {
    const sql = getSqlConnection()
    if (!sql) return null

    // Primary: look up in product_categories table
    const rows = await sql`
      SELECT id, name, slug, description
      FROM product_categories
      WHERE slug = ${slug} AND is_active = true
      LIMIT 1
    ` as CategoryMeta[]

    if (rows.length > 0) return rows[0]

    // Fallback: derive from raw category column (migration period)
    const productRows = await sql`
      SELECT DISTINCT category FROM products WHERE is_active = true
    ` as { category: string }[]

    const match = productRows.find((r) => _categorySlug(r.category) === slug)
    if (match) {
      return { id: 0, name: match.category, slug, description: null }
    }

    return null
  } catch {
    return null
  }
})

/**
 * PRIMARY category-filtered product query.
 *
 * Filter strategy — most to least authoritative:
 *   1. products.category_id = product_categories.id WHERE pc.slug = ?
 *      (uses the FK — fast index scan, correct after migration)
 *   2. products.category (varchar) JOIN product_categories ON name = category WHERE pc.slug = ?
 *      (soft-name match — works before category_id is backfilled)
 *   3. Slug-derived match against raw products.category string
 *      (last resort — no product_categories data at all)
 */
export const getProductsByCategorySlug = cache(async function getProductsByCategorySlug(slug: string, productType?: string | null, rarity?: string | null): Promise<Product[]> {
  if (!slug || slug === "all") return getAllProducts(productType, rarity)

  return profileDbQuery(`getProductsByCategorySlug(${slug})`, async () => {
    const sql = getSqlConnection()
    if (!sql) return []

    const typeFilter = productType === 'sealed'
      ? sql`AND p.product_type ILIKE '%sealed%'`
      : productType === 'single'
        ? sql`AND (p.product_type ILIKE '%card%' OR p.product_type ILIKE '%single%')`
        : productType
          ? sql`AND p.product_type = ${productType}`
          : sql``
    const rarityFilter = rarity ? sql`AND p.rarity = ${rarity}` : sql``

    try {
      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity, p.brands, p.product_type,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          pr.avg_rating,
          pr.review_count
        ${sql.unsafe(PRODUCT_JOIN_SQL)}
        WHERE p.is_active = true
          AND pc.slug = ${slug}
          AND pc.is_active = true
          ${typeFilter}
          ${rarityFilter}
        ${sql.unsafe(PRODUCT_SORT_SQL)}
      ` as DbProductJoined[]

      if (rows.length > 0) {
        return rows.map(mapJoinedRowToProduct)
      }

      const categoryRows = await sql`
        SELECT DISTINCT category FROM products WHERE is_active = true
      ` as { category: string }[]

      const matchedCategory = categoryRows.find(
        (r) => _categorySlug(r.category) === slug
      )

      if (!matchedCategory) return [] // Invalid slug → empty state

      const fallbackRows = await sql`
        SELECT
          p.id, p.name, p.slug, p.description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity,
          NULL::integer AS pc_id,
          NULL::text    AS pc_name,
          NULL::text    AS pc_slug,
          NULL::text    AS pc_description
        FROM products p
        WHERE p.is_active = true AND p.category = ${matchedCategory.category}
        ${typeFilter}
        ${sql.unsafe(PRODUCT_SORT_SQL)}
      ` as DbProductJoined[]

      return fallbackRows.map(mapJoinedRowToProduct)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[products] Error fetching products by category slug:", error)
      }
      return []
    }
  })
})

export interface GetProductsPageOptions {
  page?: number;
  limit?: number;
  category?: string | null;
  productType?: string | null;
  rarity?: string | null;
  query?: string | null;
  sortBy?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  inStock?: boolean | null;
  outOfStock?: boolean | null;
  isPreOrder?: boolean | null;
}

export const getProductsPage = cache(async function getProductsPage(options: GetProductsPageOptions) {
  return profileDbQuery("getProductsPage", async () => {
    try {
      const sql = getSqlConnection()
      if (!sql) return { products: [], totalCount: 0, page: 1, limit: 24, totalPages: 0 }

      const page = options.page || 1
      const limit = options.limit || 24
      const offset = (page - 1) * limit

      const conditions: any[] = [sql`p.is_active = true`]

      if (options.query) {
        const searchPattern = `%${options.query}%`
        conditions.push(sql`(p.name ILIKE ${searchPattern} OR p.category ILIKE ${searchPattern} OR pc.name ILIKE ${searchPattern})`)
      }

      if (options.category && options.category !== "all") {
        const catRows = await sql`SELECT id FROM product_categories WHERE slug = ${options.category} LIMIT 1`
        if (catRows.length > 0) {
          conditions.push(sql`(pc.slug = ${options.category} OR p.category_id = ${catRows[0].id})`)
        } else {
          const allCats = await sql`SELECT DISTINCT category FROM products WHERE is_active = true`
          const matched = allCats.find((r) => _categorySlug(r.category) === options.category)
          if (matched) {
            conditions.push(sql`p.category = ${matched.category}`)
          } else {
            return { products: [], totalCount: 0, page, limit, totalPages: 0 }
          }
        }
      }

      if (options.productType === "sealed") {
        conditions.push(sql`p.product_type ILIKE '%sealed%'`)
      } else if (options.productType === "single") {
        conditions.push(sql`(p.product_type ILIKE '%card%' OR p.product_type ILIKE '%single%')`)
      } else if (options.productType) {
        conditions.push(sql`p.product_type = ${options.productType}`)
      }

      if (options.rarity) {
        conditions.push(sql`p.rarity = ${options.rarity}`)
      }

      if (options.priceMin !== undefined && options.priceMin !== null) {
        conditions.push(sql`p.price >= ${options.priceMin}`)
      }
      if (options.priceMax !== undefined && options.priceMax !== null) {
        conditions.push(sql`p.price <= ${options.priceMax}`)
      }

      if (options.inStock || options.outOfStock || options.isPreOrder) {
        const parts = []
        if (options.inStock) parts.push("(p.stock_quantity > 0 AND (p.is_pre_order IS NULL OR p.is_pre_order = false))")
        if (options.outOfStock) parts.push("(p.stock_quantity <= 0 AND (p.is_pre_order IS NULL OR p.is_pre_order = false))")
        if (options.isPreOrder) parts.push("p.is_pre_order = true")
        if (parts.length > 0) {
          conditions.push(sql.unsafe(`(${parts.join(" OR ")})`))
        }
      }

      let whereSql = sql``
      if (conditions.length > 0) {
        whereSql = sql`WHERE ${conditions[0]}`
        for (let i = 1; i < conditions.length; i++) {
          whereSql = sql`${whereSql} AND ${conditions[i]}`
        }
      }

      let sortSql = sql.unsafe(PRODUCT_SORT_SQL.replace("ORDER BY", ""))
      if (options.sortBy) {
        switch (options.sortBy) {
          case "price-asc": sortSql = sql.unsafe("p.price ASC"); break
          case "price-desc": sortSql = sql.unsafe("p.price DESC"); break
          case "name-asc": sortSql = sql.unsafe("p.name ASC"); break
          case "name-desc": sortSql = sql.unsafe("p.name DESC"); break
          case "newest": sortSql = sql.unsafe("p.created_at DESC"); break
        }
      }

      const countResult = await sql`
        SELECT COUNT(*) as total
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
        ${whereSql}
      `
      const totalCount = Number(countResult[0].total)
      const totalPages = Math.ceil(totalCount / limit)

      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity, p.brands, p.product_type,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          NULL::numeric AS avg_rating,
          NULL::bigint AS review_count
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
        ${whereSql}
        ORDER BY ${sortSql}
        LIMIT ${limit} OFFSET ${offset}
      ` as DbProductJoined[]

      const products = rows.map(mapJoinedRowToProduct)

      return {
        products,
        totalCount,
        page,
        limit,
        totalPages
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[products] Error in getProductsPage:", error)
      }
      return { products: [], totalCount: 0, page: options.page || 1, limit: options.limit || 24, totalPages: 0 }
    }
  })
})

/**
 * Return all active category slugs.
 * Used for sitemap generation and future generateStaticParams.
 */
export const getAllCategorySlugs = cache(async function getAllCategorySlugs(): Promise<string[]> {
  const sql = getSqlConnection()
  if (!sql) return []

  try {
    const rows = await sql`
      SELECT slug
      FROM product_categories
      WHERE is_active = true
      ORDER BY display_order, name
    ` as { slug: string }[]

    if (rows.length > 0) return rows.map((r) => r.slug)

    // Fallback: derive from raw category column
    const productRows = await sql`
      SELECT DISTINCT category FROM products WHERE is_active = true ORDER BY category
    ` as { category: string }[]

    return productRows.map((r) => _categorySlug(r.category))
  } catch {
    return []
  }
})

/**
 * Fetch featured products for the homepage.
 *
 * Query priority:
 *   1. products.is_featured = true  (authoritative flag if column exists)
 *   2. Fallback: products with a discount (original_price IS NOT NULL)
 * Returns up to 12 products.
 */
export const getFeaturedProducts = cache(async function getFeaturedProducts(): Promise<Product[]> {
  return profileDbQuery("getFeaturedProducts", async () => {
    try {
      const sql = getSqlConnection()
      if (!sql) return []

      // Strategy 1: try is_featured column
      try {
        const featuredRows = await sql`
          SELECT
            p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
            p.stock_quantity, p.is_active, p.created_at,
            p.is_pre_order, p.release_date,
            p.rarity,
            pc.id   AS pc_id,
            pc.name AS pc_name,
            pc.slug AS pc_slug,
            NULL::text AS pc_description,
            NULL::numeric AS avg_rating,
            NULL::bigint AS review_count
          FROM products p
          LEFT JOIN product_categories pc
                 ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
                 OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
          WHERE p.is_active = true AND p.is_featured = true
          ${sql.unsafe(PRODUCT_SORT_SQL)}
          LIMIT 12
        ` as DbProductJoined[]

        if (featuredRows.length > 0) return featuredRows.map(mapJoinedRowToProduct)
      } catch {
        // is_featured column not yet added — fall through to discount fallback
      }

      // Strategy 2: products with a discount (visible "sale" items make good featured cards)
      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity, p.brands,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          NULL::numeric AS avg_rating,
          NULL::bigint AS review_count
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true AND p.original_price IS NOT NULL
        ${sql.unsafe(PRODUCT_SORT_SQL)}
        LIMIT 12
      ` as DbProductJoined[]

      // Strategy 3: still empty — return any 8 active products
      if (rows.length === 0) {
        const anyRows = await sql`
          SELECT
            p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
            p.stock_quantity, p.is_active, p.created_at,
            p.is_pre_order, p.release_date,
            p.rarity,
          pc.id   AS pc_id,
            pc.name AS pc_name,
            pc.slug AS pc_slug,
            NULL::text AS pc_description,
          pr.avg_rating,
          pr.review_count
          ${sql.unsafe(PRODUCT_JOIN_SQL)}
          WHERE p.is_active = true
          ${sql.unsafe(PRODUCT_SORT_SQL)}
          LIMIT 12
        ` as DbProductJoined[]
        return anyRows.map(mapJoinedRowToProduct)
      }

      return rows.map(mapJoinedRowToProduct)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[products] Error fetching featured products:", error)
      }
      return []
    }
  })
})

/**
 * Fetch best-selling products for the homepage.
 * Ordered by created_at DESC as a proxy until a sales_count column is added.
 * Returns up to 12 products.
 */
export const getBestSellingProducts = cache(async function getBestSellingProducts(): Promise<Product[]> {
  return profileDbQuery("getBestSellingProducts", async () => {
    try {
      const sql = getSqlConnection()
      if (!sql) return []

      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity, p.brands,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          NULL::numeric AS avg_rating,
          NULL::bigint AS review_count
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true AND p.stock_quantity > 0
        ${sql.unsafe(PRODUCT_SORT_SQL)}
        LIMIT 12
      ` as DbProductJoined[]

      // Fallback: any active products if none have stock
      if (rows.length === 0) {
        const anyRows = await sql`
          SELECT
            p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
            p.stock_quantity, p.is_active, p.created_at,
            p.is_pre_order, p.release_date,
            p.rarity,
            pc.id   AS pc_id,
            pc.name AS pc_name,
            pc.slug AS pc_slug,
            NULL::text AS pc_description,
            NULL::numeric AS avg_rating,
            NULL::bigint AS review_count
          FROM products p
          LEFT JOIN product_categories pc
                 ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
                 OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
          WHERE p.is_active = true
          ${sql.unsafe(PRODUCT_SORT_SQL)}
          LIMIT 12
        ` as DbProductJoined[]
        return anyRows.map(mapJoinedRowToProduct)
      }

      return rows.map(mapJoinedRowToProduct)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[products] Error fetching best selling products:", error)
      }
      return []
    }
  })
})

/**
 * Fetch pre-order products for the homepage.
 *
 * Query priority:
 *   1. products.condition = 'pre-order'  (explicit flag)
 *   2. Fallback: products.is_preorder = true  (alternate column name)
 *   3. Returns [] gracefully when neither column exists
 *
 * Returns up to 12 products, mapped with isPreOrder = true.
 */
export const getPreOrderProducts = cache(async function getPreOrderProducts(): Promise<Product[]> {
  return profileDbQuery("getPreOrderProducts", async () => {
    const sql = getSqlConnection()
    if (!sql) return []

    // ── Primary: new is_pre_order boolean column ──────────────────────────────
    // This is the authoritative path once the migration has run.
    try {
      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity, p.brands,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          NULL::numeric AS avg_rating,
          NULL::bigint AS review_count
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true
          AND p.is_pre_order = true
          AND p.product_type = 'sealed'
        ORDER BY p.release_date ASC NULLS LAST, p.created_at DESC
        LIMIT 12
      ` as DbProductJoined[]

      if (rows.length > 0) {
        return rows.map(mapJoinedRowToProduct)
      }
    } catch {
      // is_pre_order column doesn't exist yet — fall through to legacy strategy
    }

    // ── Legacy fallback 1: condition = 'pre-order' varchar column ─────────────
    try {
      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          NULL::boolean AS is_pre_order,
          NULL::date    AS release_date,
          p.rarity, p.brands,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          NULL::numeric AS avg_rating,
          NULL::bigint AS review_count
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true
          AND LOWER(p.condition) = 'pre-order'
          AND p.product_type = 'sealed'
        ORDER BY p.created_at DESC
        LIMIT 12
      ` as DbProductJoined[]

      if (rows.length > 0) {
        // Override isPreOrder to true — we know these are pre-orders from the condition column
        return rows.map((r) => ({ ...mapJoinedRowToProduct(r), isPreOrder: true }))
      }
    } catch {
      // condition column doesn't exist — try is_preorder boolean
    }

    // ── Legacy fallback 2: is_preorder boolean (alternate column name) ─────────
    try {
      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_preorder AS is_pre_order,
          NULL::date    AS release_date,
          p.rarity, p.brands,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          NULL::numeric AS avg_rating,
          NULL::bigint AS review_count
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true AND p.is_preorder = true
        ORDER BY p.created_at DESC
        LIMIT 12
      ` as DbProductJoined[]

      if (rows.length > 0) {
        return rows.map(mapJoinedRowToProduct)
      }
    } catch {
      // Neither column exists — no pre-orders configured in this DB
    }

    // No pre-order data at all — homepage hides the section automatically (preOrderProducts.length === 0)
    return []
  })
})

/**
 * Fetch related products in the same category (excluding given product ID).
 * Uses category_id FK when available; falls back to category string match.
 */
export const getRelatedProducts = cache(async function getRelatedProducts(productId: number): Promise<Product[]> {
  try {
    const sql = getSqlConnection()
    if (!sql) return []

    // Resolve the category for the current product
    const [current] = await sql`
      SELECT category, category_id FROM products WHERE id = ${productId}
    ` as { category: string; category_id: number | null }[]

    if (!current) return []

    const rows = await sql`
      SELECT
        p.id, p.name, p.slug, NULL::text AS description, p.category, p.category_id, p.price, p.original_price, p.image_url,
        p.stock_quantity, p.is_active, p.created_at,
        p.is_pre_order, p.release_date,
        p.rarity, p.brands,
        pc.id   AS pc_id,
        pc.name AS pc_name,
        pc.slug AS pc_slug,
        NULL::text AS pc_description,
        NULL::numeric AS avg_rating,
        NULL::bigint AS review_count
      FROM products p
      LEFT JOIN product_categories pc
             ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
             OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
      WHERE p.is_active = true
        AND p.id != ${productId}
        AND (
          ${current.category_id !== null ? sql`p.category_id = ${current.category_id}` : sql`p.category = ${current.category}`}
        )
      ORDER BY p.created_at DESC
      LIMIT 4
    ` as DbProductJoined[]

    return rows.map(mapJoinedRowToProduct)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[products] Error fetching related products:", error)
    }
    return []
  }
})

/**
 * Fetch related products by product slug.
 */
export const getRelatedProductsBySlug = cache(async function getRelatedProductsBySlug(slug: string): Promise<Product[]> {
  const currentProduct = await getProductBySlug(slug)
  if (!currentProduct) return []
  return getRelatedProducts(currentProduct.id)
})

/**
 * Full-text search across product name and category.
 */
export const searchProducts = cache(async function searchProducts(query: string, productType?: string | null, rarity?: string | null, limit: number = 50): Promise<Product[]> {
  return profileDbQuery(`searchProducts(${query})`, async () => {
    try {
      const sql = getSqlConnection()
      if (!sql) return []

      const searchPattern = `%${query}%`
      const typeFilter = productType === 'sealed'
        ? sql`AND p.product_type ILIKE '%sealed%'`
        : productType === 'single'
          ? sql`AND (p.product_type ILIKE '%card%' OR p.product_type ILIKE '%single%')`
          : productType
            ? sql`AND p.product_type = ${productType}`
            : sql``
      const rarityFilter = rarity ? sql`AND p.rarity = ${rarity}` : sql``

      // pg_trgm constraint: ensure query length is at least 3 for meaningful similarity,
      // otherwise fallback to safe ILIKE wildcard search.
      const trgmThreshold = query.length > 2 ? 0.15 : 1.0; 

      // A fuzzy search that uses traditional ILIKE for exact substring matches (giving them highest priority)
      // and pg_trgm similarity() for typo-tolerance on product name.
      // Uses lightweight fields to minimize memory footprint.
      const rows = await sql`
        SELECT
          p.id, p.name, p.slug, p.category, p.category_id, p.price, p.original_price, p.image_url,
          p.stock_quantity, p.is_active, p.created_at,
          p.is_pre_order, p.release_date,
          p.rarity, p.brands, p.product_type,
          pc.id   AS pc_id,
          pc.name AS pc_name,
          pc.slug AS pc_slug,
          NULL::text AS pc_description,
          NULL::numeric AS avg_rating,
          NULL::bigint AS review_count,
          similarity(p.name, ${query}) as name_sim
        FROM products p
        LEFT JOIN product_categories pc
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL     AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true
          AND (
            p.name     ILIKE ${searchPattern}
            OR p.category ILIKE ${searchPattern}
            OR pc.name    ILIKE ${searchPattern}
            OR similarity(p.name, ${query}) > ${trgmThreshold}
          )
          ${typeFilter}
          ${rarityFilter}
        ORDER BY 
          CASE WHEN p.name ILIKE ${searchPattern} THEN 1 ELSE 0 END DESC,
          name_sim DESC,
          p.created_at DESC
        LIMIT ${limit}
      ` as (DbProductJoined & { name_sim: number })[]

      return rows.map(mapJoinedRowToProduct)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[products] Error searching products:", error)
      }
      return []
    }
  })
})

/**
 * Return all unique category names (for filter UI dropdowns).
 * Prefers product_categories table; falls back to raw column.
 */
export async function getProductCategories(): Promise<string[]> {
  try {
    const sql = getSqlConnection()
    if (!sql) return []

    // Prefer authoritative categories table
    const catRows = await sql`
      SELECT name FROM product_categories WHERE is_active = true ORDER BY display_order, name
    ` as { name: string }[]

    if (catRows.length > 0) return catRows.map((r) => r.name)

    // Fallback: derive from products table
    const rows = await sql`
      SELECT DISTINCT category FROM products WHERE is_active = true ORDER BY category
    ` as { category: string }[]

    return rows.map((r) => r.category)
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[products] Error fetching categories:", error)
    }
    return []
  }
}

// ============================================================
// Sync cache (for Client Components that need sync access)
// ============================================================

let _productCache: Map<number, Product> | null = null

export function getProductByIdSync(id: number): Product | undefined {
  return _productCache?.get(id)
}

/**
 * Preload the in-memory product cache.
 * Call from Server Components before rendering a Client Component
 * that needs sync product access.
 */
export async function preloadProductCache(ids?: number[]): Promise<void> {
  if (_productCache) return

  const products = ids
    ? await Promise.all(ids.map((id) => getProductById(id)))
    : await getAllProducts()

  const validProducts = products.filter((p): p is Product => p !== undefined)
  _productCache = new Map(validProducts.map((p) => [p.id, p]))
}

// ============================================================
// Cron: Auto-transition expired pre-orders to in-stock
// ============================================================

/**
 * Flip `is_pre_order = false` for every product whose `release_date`
 * has passed (i.e. release_date <= today).
 *
 * CRITICAL: This function ONLY changes `is_pre_order`.
 * It does NOT alter price, stock_quantity, or any other column.
 *
 * @returns The number of products transitioned, or -1 on error.
 */
export async function syncExpiredPreorders(): Promise<number> {
  const sql = getSqlConnection()
  if (!sql) {
    console.error("[cron/sync-preorders] No database connection available")
    return -1
  }

  try {
    const result = await sql`
      UPDATE products
      SET is_pre_order = false,
          updated_at   = CURRENT_TIMESTAMP
      WHERE is_pre_order = true
        AND release_date IS NOT NULL
        AND release_date <= CURRENT_DATE
      RETURNING id
    `

    const count = result.length
    console.log(`[cron/sync-preorders] Transitioned ${count} product(s) from pre-order to in-stock`)
    return count
  } catch (error) {
    console.error("[cron/sync-preorders] Error syncing expired pre-orders:", error)
    return -1
  }
}
