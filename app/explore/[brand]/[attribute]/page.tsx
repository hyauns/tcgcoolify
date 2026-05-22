import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSql } from "@/lib/db-client"
import { siteUrl } from "@/lib/site-config"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"
import { Suspense, use, cache } from "react"
import { ProductGridSkeleton } from "@/components/ui/product-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

// Page-level ISR. Triple-ILIKE full-table scan is expensive (see
// _audit/04-performance.md P0-5); cache the rendered HTML for an hour.
//   NOTE: the underlying SQL is still ILIKE '%...%' across brands+rarity+
//   product_type. A DB trigram or normalized brand/attribute table would
//   give the bigger win — deferred to a future phase.
export const revalidate = 3600

// ============================================================
// Types
// ============================================================

interface ExplorePageProps {
  params: {
    brand: string
    attribute: string
  }
  searchParams: {
    page?: string
  }
}

// Convert URL-friendly slugs back to DB strings (e.g. "wizards-of-the-coast" -> "Wizards of the Coast")
// In a real production app, you might want a slug-to-name lookup table.
function unslugify(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// ============================================================
// Database Query (Server-side)
// ============================================================

// React `cache()` dedupes the call inside a single request, so
// `generateMetadata` and the page render share one DB round-trip instead of
// two. Args must stay primitive (string + number) for the memo key to work.
const getExploreProducts = cache(async function getExploreProductsImpl(brandSlug: string, attributeSlug: string, page: number) {
  const sql = getSql()
  const limit = 24
  const offset = (page - 1) * limit

  const brandName = unslugify(brandSlug)
  const attributeName = unslugify(attributeSlug)

  try {
    // We match BOTH brands and either rarity OR product_type to be flexible.
    // Using ILIKE for case-insensitive partial matching.
    const [rows, countResult] = await Promise.all([
      sql`
        SELECT 
          p.id, 
          p.name, 
          p.name AS slug, 
          p.price, 
          p.original_price, 
          p.image_url, 
          p.stock_quantity, 
          p.created_at, 
          p.is_pre_order,
          pc.name AS category_name
        FROM products p
        LEFT JOIN product_categories pc 
               ON (p.category_id IS NOT NULL AND pc.id = p.category_id)
               OR (p.category_id IS NULL AND pc.name = p.category AND pc.is_active = true)
        WHERE p.is_active = true
          AND p.brands ILIKE ${'%' + brandName + '%'}
          AND (p.rarity ILIKE ${'%' + attributeName + '%'} OR p.product_type ILIKE ${'%' + attributeName + '%'})
        ORDER BY p.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*) as total
        FROM products p
        WHERE p.is_active = true
          AND p.brands ILIKE ${'%' + brandName + '%'}
          AND (p.rarity ILIKE ${'%' + attributeName + '%'} OR p.product_type ILIKE ${'%' + attributeName + '%'})
      `
    ])
    const totalCount = parseInt(countResult[0].total, 10)

    // Map to our standard Product format
    const products = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      price: Number(row.price),
      originalPrice: row.original_price ? Number(row.original_price) : undefined,
      image: row.image_url || `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(row.name)}`,
      category: row.category_name || "Uncategorized",
      inStock: row.stock_quantity > 0,
      isNew: (new Date().getTime() - new Date(row.created_at).getTime()) / (1000 * 3600 * 24) < 30,
      isHot: false,
      isPreOrder: Boolean(row.is_pre_order),
    }))

    return { products, totalCount }
  } catch (error) {
    console.error("[Explore] Database error:", error)
    return { products: [], totalCount: 0 }
  }
})

// ============================================================
// SEO Metadata (Programmatic SEO)
// ============================================================

export async function generateMetadata({ params, searchParams }: ExplorePageProps): Promise<Metadata> {
  const brandName = unslugify(params.brand)
  const attributeName = unslugify(params.attribute)
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1
  
  // Lấy dữ liệu động từ DB để làm Meta Description thêm hấp dẫn
  const { products, totalCount } = await getExploreProducts(params.brand, params.attribute, 1) // Always get page 1 for meta
  
  // Tính toán thông tin động
  const minPrice = products.length > 0 ? Math.min(...products.map(p => p.price)) : 0
  
  // Tối ưu Title CTR: Ngắn gọn, có modifier "Genuine", dưới 60 ký tự
  const title = `Buy ${brandName} ${attributeName} Cards | TCG Lore`
  
  // Tối ưu Meta Description CTR: Chứa Power Words, giá min, CTA
  const description = totalCount > 0
    ? `Shop ${totalCount}+ authentic ${brandName} ${attributeName} cards. Starting at $${minPrice.toFixed(2)}. Fast shipping. View collection!`
    : `Shop authentic ${brandName} trading cards featuring ${attributeName}. Fast shipping. Buy online today!`
  
  const canonicalUrl = `${siteUrl}/explore/${params.brand}/${params.attribute}${page > 1 ? `?page=${page}` : ''}`
  // Hình ảnh mặc định cho OG
  const ogImage = products.length > 0 && products[0].image ? products[0].image : `${siteUrl}/og-image.jpg`

  return {
    title,
    description,
    keywords: [brandName, attributeName, "trading cards", "TCG", "buy online"],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonicalUrl,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${brandName} ${attributeName} Products`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}

// ============================================================
// Page Component & Suspense Wrappers
// ============================================================

async function ExploreHeader({ dataPromise, brandName, attributeName }: { dataPromise: Promise<any>, brandName: string, attributeName: string }) {
  const { products, totalCount } = await dataPromise

  return (
    <p className="mt-2 text-gray-500 dark:text-gray-400">
      Showing {products.length} of {totalCount} authentic {brandName} items categorized as {attributeName}.
    </p>
  )
}

async function ExploreProductList({ dataPromise, brandName, attributeName, page, params }: { dataPromise: Promise<any>, brandName: string, attributeName: string, page: number, params: any }) {
  const { products, totalCount } = await dataPromise

  if (products.length === 0 && page === 1) {
    notFound() // If no products exist for this combo, return 404 so Google doesn't index a blank page.
  }

  const totalPages = Math.ceil(totalCount / 24)

  return (
    <main className="flex-1 w-full">
      {products.length > 0 ? (
         <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 relative flex flex-col h-full">
                <CardHeader className="p-0 flex-shrink-0">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <Link href={`/products/${product.slug}`}>
                      <div className="bg-slate-50 border-b flex items-center justify-center p-6 overflow-hidden w-full aspect-square rounded-t-lg">
                        <ImageWithFallback
                          src={product.image || "/placeholder.png"}
                          fallbackSrc="/placeholder.png"
                          alt={`${product.name}`}
                          width={400}
                          height={400}
                          className="object-contain w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    </Link>
                    {product.isNew && (
                      <Badge className="absolute top-3 left-3 bg-blue-600 hover:bg-blue-700 shadow-md">
                        New Arrival
                      </Badge>
                    )}
                    {product.isPreOrder && (
                      <Badge className="absolute top-3 right-3 bg-purple-600 hover:bg-purple-700 shadow-md">
                        Pre-Order
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex-grow flex flex-col">
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {product.category}
                    </span>
                  </div>
                  <Link href={`/products/${product.slug}`} className="flex-grow">
                    <CardTitle className="text-lg mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </CardTitle>
                  </Link>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through mr-2">
                          ${product.originalPrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t w-full">
                    <Button className="w-full" asChild>
                      <Link href={`/products/${product.slug}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Basic Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              {page > 1 && (
                <a
                  href={`/explore/${params.brand}/${params.attribute}?page=${page - 1}`}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Previous
                </a>
              )}
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`/explore/${params.brand}/${params.attribute}?page=${page + 1}`}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No products found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your filters or browsing a different category.</p>
        </div>
      )}
    </main>
  )
}

export default function ExplorePage({ params, searchParams }: ExplorePageProps) {
  const brandName = unslugify(params.brand)
  const attributeName = unslugify(params.attribute)
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1

  // Start fetch immediately, but don't await so the layout renders instantly
  const dataPromise = getExploreProducts(params.brand, params.attribute, page)

  // Generate CollectionPage Schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `Explore ${brandName} ${attributeName} Cards`,
    "description": `Discover our premium selection of ${brandName} trading cards and products with the ${attributeName} attribute.`,
    "url": `${siteUrl}/explore/${params.brand}/${params.attribute}`,
    // "numberOfItems": totalCount, // Omitting numberOfItems since we are streaming it
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Inject Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white capitalize">
          {brandName} {attributeName} Products
        </h1>
        <Suspense fallback={<Skeleton className="h-6 w-64 mt-2" />}>
          <ExploreHeader dataPromise={dataPromise} brandName={brandName} attributeName={attributeName} />
        </Suspense>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <Suspense fallback={<ProductGridSkeleton count={24} className="flex-1 w-full" />}>
          <ExploreProductList dataPromise={dataPromise} brandName={brandName} attributeName={attributeName} page={page} params={params} />
        </Suspense>
      </div>
    </div>
  )
}
