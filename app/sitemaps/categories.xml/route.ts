import { siteUrl } from "@/lib/site-config"
import { getAllCategorySlugs } from "@/lib/products"

export const revalidate = 86400 // Cache for 24 hours

export async function GET() {
  const categories = await getAllCategorySlugs()
  const now = new Date().toISOString()

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  for (const slug of categories) {
    xml += `  <url>\n`
    xml += `    <loc>${siteUrl}/products?category=${slug}</loc>\n`
    xml += `    <lastmod>${now}</lastmod>\n`
    xml += `    <changefreq>weekly</changefreq>\n`
    xml += `    <priority>0.8</priority>\n`
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
