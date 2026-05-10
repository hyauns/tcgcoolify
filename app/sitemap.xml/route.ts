import { siteUrl } from "@/lib/site-config"
import { getTotalActiveProductsCount } from "@/lib/repositories/sitemap"

export const revalidate = 86400 // Cache for 24 hours

export async function GET() {
  const totalProducts = await getTotalActiveProductsCount()
  const SITEMAP_PAGE_SIZE = 20000
  const totalProductPages = Math.ceil(totalProducts / SITEMAP_PAGE_SIZE)

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  // Core static routes
  xml += `  <sitemap>\n    <loc>${siteUrl}/sitemaps/core.xml</loc>\n  </sitemap>\n`
  // Categories
  xml += `  <sitemap>\n    <loc>${siteUrl}/sitemaps/categories.xml</loc>\n  </sitemap>\n`

  // Product chunks
  for (let i = 1; i <= totalProductPages; i++) {
    xml += `  <sitemap>\n    <loc>${siteUrl}/sitemaps/products-${i}.xml</loc>\n  </sitemap>\n`
  }

  xml += `</sitemapindex>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
