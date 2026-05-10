import { siteUrl } from "@/lib/site-config"
import { getSitemapProductsBatch } from "@/lib/repositories/sitemap"
import { generateSlug } from "@/lib/utils"

export const revalidate = 86400 // Cache for 24 hours

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params
  // We only handle products-*.xml here
  const match = file.match(/^products-(\d+)\.xml$/)
  
  if (!match) {
    return new Response("Not Found", { status: 404 })
  }

  const page = parseInt(match[1], 10)
  if (page < 1) {
    return new Response("Not Found", { status: 404 })
  }

  const SITEMAP_PAGE_SIZE = 20000
  const offset = (page - 1) * SITEMAP_PAGE_SIZE
  
  const products = await getSitemapProductsBatch(offset, SITEMAP_PAGE_SIZE)

  if (products.length === 0) {
    return new Response("Not Found", { status: 404 })
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  for (const product of products) {
    // Re-use exact same slug calculation or DB slug
    const slug = product.slug || generateSlug(product.name)
    // Make sure we output ISO string for lastmod
    const lastmod = product.updated_at ? product.updated_at.toISOString() : new Date().toISOString()
    
    xml += `  <url>\n`
    xml += `    <loc>${siteUrl}/products/${slug}</loc>\n`
    xml += `    <lastmod>${lastmod}</lastmod>\n`
    xml += `    <changefreq>weekly</changefreq>\n`
    xml += `    <priority>0.7</priority>\n`
    xml += `  </url>\n`
  }

  xml += `</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
