"use server"

import { revalidatePath } from "next/cache"
import { getSql } from "./db-client"

// ============================================================
// On‑demand revalidation helpers
// ============================================================

/**
 * Revalidate all product‑related pages.
 *
 * Call this after any operation that mutates product data
 * (price change, stock update, new product, etc.) to ensure
 * visitors see fresh content immediately instead of waiting
 * for a timed ISR window.
 *
 * Paths invalidated:
 *   /                       – homepage (featured, best-sellers, pre-orders)
 *   /products/[slug]        – every individual PDP (layout-level purge)
 *   /products               – product listing / category pages
 *   /preorder-info           – pre-order landing page
 */
export async function revalidateProductPages(slug?: string) {
  // Always revalidate the homepage — it shows featured & best-selling products
  revalidatePath("/")

  // Revalidate the products listing page
  revalidatePath("/products")

  // Revalidate the pre-order info page
  revalidatePath("/preorder-info")

  // If a specific product slug is provided, revalidate that PDP directly
  if (slug) {
    revalidatePath(`/products/${slug}`)
  }

  // Blanket revalidation of the dynamic [slug] layout ensures any
  // product page that was cached gets refreshed on next visit.
  revalidatePath("/products/[slug]", "page")
}

// ============================================================
// Database connection helper (mirrors lib/products.ts)
// ============================================================

function getSqlConnection() {
  try {
    return getSql()
  } catch {
    return null
  }
}

// ============================================================
// Product mutation server actions
// ============================================================

/**
 * Generate a URL‑safe slug from a product name.
 * Must stay in sync with the slug logic in lib/products.ts.
 */
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
 * Update a product's price and/or stock quantity, then revalidate
 * all affected cached pages so changes appear instantly.
 *
 * @param productId – numeric product ID
 * @param data      – fields to update (price, originalPrice, stockQuantity)
 * @returns         – { success, error? }
 */
export async function updateProduct(
  productId: number,
  data: {
    price?: number
    originalPrice?: number | null
    stockQuantity?: number
    isActive?: boolean
    isPreOrder?: boolean
    releaseDate?: string | null
  }
) {
  const sql = getSqlConnection()
  if (!sql) {
    return { success: false, error: "No database connection" }
  }

  try {
    // Track whether any field was actually provided
    let hasUpdates = false

    // Use individual tagged-template UPDATE statements per field.
    // Neon's sql`` API doesn't support dynamically-built queries with
    // separate parameter arrays — tagged template literals are the
    // idiomatic (and safe) approach.
    const promises: Promise<any>[] = []

    if (data.price !== undefined) {
      promises.push(sql`UPDATE products SET price = ${data.price}, updated_at = NOW() WHERE id = ${productId}`)
      hasUpdates = true
    }
    if (data.originalPrice !== undefined) {
      promises.push(sql`UPDATE products SET original_price = ${data.originalPrice}, updated_at = NOW() WHERE id = ${productId}`)
      hasUpdates = true
    }
    if (data.stockQuantity !== undefined) {
      promises.push(sql`UPDATE products SET stock_quantity = ${data.stockQuantity}, updated_at = NOW() WHERE id = ${productId}`)
      hasUpdates = true
    }
    if (data.isActive !== undefined) {
      promises.push(sql`UPDATE products SET is_active = ${data.isActive}, updated_at = NOW() WHERE id = ${productId}`)
      hasUpdates = true
    }
    if (data.isPreOrder !== undefined) {
      promises.push(sql`UPDATE products SET is_pre_order = ${data.isPreOrder}, updated_at = NOW() WHERE id = ${productId}`)
      hasUpdates = true
    }
    if (data.releaseDate !== undefined) {
      promises.push(sql`UPDATE products SET release_date = ${data.releaseDate}, updated_at = NOW() WHERE id = ${productId}`)
      hasUpdates = true
    }

    if (!hasUpdates) {
      return { success: false, error: "No fields to update" }
    }

    // Await all updates concurrently
    await Promise.all(promises)

    // Look up the product name to derive its slug for targeted revalidation
    const rows = await sql`SELECT name FROM products WHERE id = ${productId}` as { name: string }[]
    const productSlug = rows[0] ? generateSlug(rows[0].name) : undefined

    // ── Trigger on‑demand revalidation ──────────────────────────
    await revalidateProductPages(productSlug)

    return { success: true }
  } catch (error) {
    console.error("[admin-actions] Error updating product:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
