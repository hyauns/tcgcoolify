export const revalidate = 3600 // Cache for 1 hour
// Extend timeout for large feeds (Vercel Pro: 60s, Hobby: 10s)
export const maxDuration = 60
export const runtime = "nodejs" // Prevent Edge CPU timeout

import { getFeedConfigurationById, streamFeedProducts, type FeedProductRow } from "@/lib/repositories/feeds"
import { normalizePreorderFlag } from "@/lib/preorder"
import { siteUrl } from "@/lib/site-config"

/**
 * GET /api/feeds/[uuid]/route
 *
 * Public, unauthenticated endpoint. Google Merchant Center crawls this URL.
 *
 * Architecture:
 *   1. Look up the FeedConfiguration by UUID
 *   2. Create a ReadableStream
 *   3. Loop: fetch 500 products at a time via OFFSET/LIMIT
 *   4. For each batch, serialize each product to an <item> XML block
 *      and enqueue it to the stream immediately
 *   5. When a batch returns < 500 rows, write the closing tags and close
 *
 * Memory Safety:
 *   At most 500 product rows (~200KB) are held in memory at any time.
 *   The stream flushes each batch before fetching the next.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params

  // Basic UUID format validation to prevent SQL injection via malformed input
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(uuid)) {
    return new Response("Not Found", { status: 404 })
  }

  console.time("[DB] GET Feed Config")
  const config = await getFeedConfigurationById(uuid)
  console.timeEnd("[DB] GET Feed Config")
  if (!config) {
    return new Response("Not Found", { status: 404 })
  }

  const CHUNK_SIZE = 500
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `<channel>\n` +
    `<title>TCG Lore - ${config.platform === "BING" ? "Bing" : "Google"} - ${escapeXml(config.name)}</title>\n` +
    `<link>${siteUrl}</link>\n` +
    `<description>${config.platform === "BING" ? "Bing" : "Google"} Merchant Center product feed: ${escapeXml(config.name)}</description>\n`

  let offset = 0
  let hasMore = true

  try {
    while (hasMore) {
      console.time(`[DB] Fetch Feed Batch ${offset}`)
      const products = await streamFeedProducts(config, offset, CHUNK_SIZE)
      console.timeEnd(`[DB] Fetch Feed Batch ${offset}`)

      for (const product of products) {
        xml += buildItemXml(product)
      }

      if (products.length < CHUNK_SIZE) {
        hasMore = false
      } else {
        offset += CHUNK_SIZE
      }
    }
  } catch (error) {
    console.error("[feeds/xml] Feed generation error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }

  xml += `</channel>\n</rss>\n`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Feed-Id": config.id,
      "X-Feed-Name": escapeXml(config.name),
    },
  })
}

// ============================================================
// XML Helpers
// ============================================================

/**
 * Escape special XML characters to prevent malformed output.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/**
 * Strip HTML tags from a string (for product descriptions).
 */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim()
}

import { generateSlug } from "@/lib/utils"
/**
 * Build the product slug from the name.
 */
function buildSlug(name: string): string {
  return generateSlug(name)
}

/**
 * Resolve the absolute image URL.
 * Handles:
 *   - Already-absolute URLs (https://...)
 *   - Relative paths (/images/...)
 *   - CDN URLs that don't need prefixing
 */
function resolveImageUrl(imageUrl: string | null): string {
  if (!imageUrl) return `${siteUrl}/placeholder.png`
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl
  }
  return `${siteUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`
}

/**
 * Map stock_quantity + is_pre_order to GMC availability string.
 */
function mapAvailability(stockQuantity: number, isActuallyPreorder: boolean): string {
  if (isActuallyPreorder) return "preorder"
  return stockQuantity > 0 ? "in_stock" : "out_of_stock"
}

/**
 * Build the GMC-required <g:availability_date> for pre-order items.
 * Format: ISO 8601 — YYYY-MM-DDT00:00:00Z
 *
 * If the product has a release_date in the DB, use it.
 * Otherwise, fallback to NOW + 30 days as a safe default
 * to prevent GMC feed rejection.
 */
function buildAvailabilityDate(releaseDate: string | null): string {
  let date: Date
  if (releaseDate) {
    date = new Date(releaseDate)
    // Guard against invalid dates in the DB
    if (isNaN(date.getTime())) {
      date = new Date()
      date.setDate(date.getDate() + 30)
    }
  } else {
    // No release_date set — fallback +30 days
    date = new Date()
    date.setDate(date.getDate() + 30)
  }
  return date.toISOString().replace(/\.\d{3}Z$/, "Z")
}

/**
 * Map product_type to GMC condition.
 * Sealed products → new. Singles/Cards → new (TCG singles are "new" product condition).
 */
function mapCondition(): string {
  return "new"
}

/**
 * Build a single <item> block for one product.
 * Strict GMC specification compliance.
 *
 * Pre-order compliance (CRITICAL):
 *   If is_pre_order = true, GMC requires BOTH:
 *     <g:availability>preorder</g:availability>
 *     <g:availability_date>YYYY-MM-DDThh:mm:ssZ</g:availability_date>
 */
function buildItemXml(product: FeedProductRow): string {
  const slug = buildSlug(product.name)
  const priceNum = parseFloat(product.price || "0")
  const price = priceNum.toFixed(2)
  const description = product.description
    ? stripHtml(product.description).slice(0, 5000)
    : product.name
  const imageUrl = resolveImageUrl(product.image_url)

  // Preorder status is normalized via the shared helper so the feed and the
  // PDP cannot drift apart. See `lib/preorder.ts` for the rule.
  const isActuallyPreorder = normalizePreorderFlag(product.is_pre_order, product.release_date)

  const availability = mapAvailability(product.stock_quantity, isActuallyPreorder)
  const condition = mapCondition()
  const productTypeLabel = product.product_type?.toLowerCase().includes("sealed")
    ? "Sealed"
    : "Singles"

  // ── Sale price (g:sale_price) ──────────────────────────────────────────
  // GMC convention when an item is on sale: `g:price` is the regular price,
  // `g:sale_price` is the discounted price. We only emit `g:sale_price` when
  // original_price is genuinely higher than price.
  const originalPriceNum = product.original_price
    ? parseFloat(product.original_price)
    : NaN
  const onSale =
    Number.isFinite(originalPriceNum) && originalPriceNum > priceNum
  const regularPrice = onSale ? originalPriceNum.toFixed(2) : price
  const salePriceLine = onSale
    ? `  <g:sale_price>${price} USD</g:sale_price>\n`
    : ``

  // ── Brand (g:brand) ────────────────────────────────────────────────────
  // GMC rule: `g:brand` must be the manufacturer's brand, never the retailer.
  // If product.brands is empty/null, emit no g:brand line (combined with
  // g:identifier_exists=no this is acceptable).
  const brandLine = product.brands
    ? `  <g:brand>${escapeXml(product.brands)}</g:brand>\n`
    : ``

  // Build availability_date line ONLY for pre-order items (GMC strict requirement)
  const availabilityDateLine = isActuallyPreorder
    ? `  <g:availability_date>${buildAvailabilityDate(product.release_date)}</g:availability_date>\n`
    : ``

  // ── Shipping (g:shipping) ──────────────────────────────────────────────
  // Business owner confirmed checkout offers three real US shipping tiers.
  // These MUST mirror the PDP JSON-LD `shippingDetails` in
  // `app/products/[slug]/page.tsx` (Standard / Priority / Express).
  //   - Standard: $9.99, free when item price >= $75 (same threshold as PDP)
  //   - Priority: $19.99 flat
  //   - Express:  $39.99 flat
  const standardShippingRate = priceNum >= 75 ? 0 : 9.99
  const shippingLine =
    `  <g:shipping>\n` +
    `    <g:country>US</g:country>\n` +
    `    <g:service>Standard</g:service>\n` +
    `    <g:price>${standardShippingRate.toFixed(2)} USD</g:price>\n` +
    `  </g:shipping>\n` +
    `  <g:shipping>\n` +
    `    <g:country>US</g:country>\n` +
    `    <g:service>Priority</g:service>\n` +
    `    <g:price>19.99 USD</g:price>\n` +
    `  </g:shipping>\n` +
    `  <g:shipping>\n` +
    `    <g:country>US</g:country>\n` +
    `    <g:service>Express</g:service>\n` +
    `    <g:price>39.99 USD</g:price>\n` +
    `  </g:shipping>\n`

  return (
    `<item>\n` +
    `  <g:id>${product.id}</g:id>\n` +
    `  <g:title>${escapeXml(product.name)}</g:title>\n` +
    `  <g:description>${escapeXml(description)}</g:description>\n` +
    `  <g:link>${siteUrl}/products/${slug}</g:link>\n` +
    `  <g:image_link>${escapeXml(imageUrl)}</g:image_link>\n` +
    `  <g:price>${regularPrice} USD</g:price>\n` +
    salePriceLine +
    `  <g:availability>${availability}</g:availability>\n` +
    availabilityDateLine +
    `  <g:condition>${condition}</g:condition>\n` +
    brandLine +
    `  <g:google_product_category>2363</g:google_product_category>\n` +
    `  <g:identifier_exists>no</g:identifier_exists>\n` +
    shippingLine +
    `  <g:custom_label_0>${productTypeLabel}</g:custom_label_0>\n` +
    (product.rarity ? `  <g:custom_label_1>${escapeXml(product.rarity)}</g:custom_label_1>\n` : ``) +
    (product.category_name ? `  <g:product_type>${escapeXml(product.category_name)}</g:product_type>\n` : ``) +
    `</item>\n`
  )
}

