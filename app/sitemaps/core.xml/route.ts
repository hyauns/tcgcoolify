import { siteUrl } from "@/lib/site-config"

export const revalidate = 86400 // Cache for 24 hours

export async function GET() {
  const now = new Date().toISOString()
  
  const coreRoutes = [
    { url: "", priority: "1.0", changefreq: "daily" },
    { url: "/products", priority: "0.9", changefreq: "daily" },
    { url: "/about", priority: "0.5", changefreq: "monthly" },
    { url: "/faq", priority: "0.5", changefreq: "monthly" },
    { url: "/shipping", priority: "0.4", changefreq: "monthly" },
    { url: "/contact", priority: "0.5", changefreq: "monthly" },
    { url: "/privacy", priority: "0.3", changefreq: "yearly" },
    { url: "/terms", priority: "0.3", changefreq: "yearly" },
    { url: "/returns", priority: "0.4", changefreq: "monthly" },
    { url: "/cookies", priority: "0.3", changefreq: "yearly" },
    { url: "/best-price-guarantee", priority: "0.4", changefreq: "monthly" },
    { url: "/preorder-info", priority: "0.5", changefreq: "weekly" },
    { url: "/payment-and-orders", priority: "0.3", changefreq: "yearly" },
    { url: "/payment", priority: "0.3", changefreq: "yearly" },
  ]

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  for (const route of coreRoutes) {
    xml += `  <url>\n`
    xml += `    <loc>${siteUrl}${route.url}</loc>\n`
    xml += `    <lastmod>${now}</lastmod>\n`
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`
    xml += `    <priority>${route.priority}</priority>\n`
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
