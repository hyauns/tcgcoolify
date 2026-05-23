import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getProductsPage, getCategoryBySlug } from "@/lib/products"
import { generateCategorySlug, normalizeCategoryParam } from "@/lib/products"
import type { Product as ProductFilter } from "@/lib/product-filters"
import type { FilterAggregations } from "@/lib/product-filters"
import { getFilterAggregations } from "@/lib/repositories/filters"
import ProductsPageClient from "./page-client"
import { siteUrl } from "@/lib/site-config"

// The page reads `searchParams`, so each unique URL renders dynamically per
// request. Setting `revalidate = 300` lets the data cache (and Next's full-page
// cache for searchParam combinations that recur) serve repeat traffic without
// re-hitting Neon. Admin product mutations call revalidatePath("/products")
// (see app/admin/products/actions.ts:69), so price/stock changes propagate
// promptly; this interval is just a safety net for upstream data that bypasses
// the admin UI.
export const revalidate = 300

// ============================================================
// Dynamic Metadata (per-category SEO)
// ============================================================

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  // Decode percent-encoded input (%3A → :) then re-slugify for a clean canonical
  const categorySlug = normalizeCategoryParam(params?.category)

  const BASE_URL = siteUrl

  if (!categorySlug || categorySlug === "all") {
    return {
      title: "All Trading Card Products | TCG Cards, Booster Packs & Boxes | TCG Lore",
      description:
        "Shop our full collection of authentic trading cards, booster packs, and collectibles from Magic: The Gathering, Pokemon, Yu-Gi-Oh!, Disney Lorcana & more. Free shipping on orders over $75.",
      keywords:
        "trading cards, TCG, booster packs, booster boxes, Magic The Gathering, Pokemon cards, Yu-Gi-Oh cards, Disney Lorcana, One Piece Card Game, card shop, collectible card games",
      alternates: { canonical: `${BASE_URL}/products` },
      openGraph: {
        title: "All Trading Card Products | TCG Lore",
        description:
          "Browse our complete collection of authentic trading cards and collectibles.",
        url: `${BASE_URL}/products`,
        siteName: "TCG Lore",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "All Trading Card Products | TCG Lore",
        description:
          "Browse our complete collection of authentic trading cards and collectibles.",
      },
    }
  }

  // Resolve category metadata from DB
  const categoryMeta = await getCategoryBySlug(categorySlug)
  const categoryName = categoryMeta?.name ?? slugToTitle(categorySlug)
  const canonicalUrl = `${BASE_URL}/products?category=${categorySlug}`

  const title = `${categoryName} TCG Cards | Authentic Cards & Boxes | TCG Lore`
  const description =
    categoryMeta?.description ??
    `Shop authentic ${categoryName} trading cards, booster packs, and collectibles at TGC Lore. 100% genuine products, fast US shipping, and the best prices guaranteed.`

  return {
    title,
    description,
    keywords: `${categoryName}, ${categoryName} cards, ${categoryName} booster packs, buy ${categoryName} TCG, ${categoryName} collectibles, TCG Lore`,
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "TCG Lore",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

// ============================================================
// Slug → Title helper (fallback when DB table is empty)
// ============================================================

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// ============================================================
// JSON-LD Structured Data Builder
// ============================================================

function buildJsonLd(categoryName: string | null, productCount: number, canonicalUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: categoryName
      ? `${categoryName} TCG Cards | TCG Lore`
      : "All Trading Card Products | TCG Lore",
    description: categoryName
      ? `Authentic ${categoryName} trading cards, booster packs, and collectibles at TGC Lore.`
      : "Complete catalog of authentic trading cards and collectibles at TGC Lore.",
    url: canonicalUrl,
    provider: {
      "@type": "Organization",
      name: "TCG Lore",
      url: siteUrl,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+1-888-496-1626",
        contactType: "customer service",
        email: "cs@tcglore.com",
        areaServed: "US",
        availableLanguage: "English",
      },
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl}/products` },
        ...(categoryName
          ? [
              {
                "@type": "ListItem",
                position: 3,
                name: categoryName,
                item: canonicalUrl,
              },
            ]
          : []),
      ],
    },
  }
}

// ============================================================
// Page Component
// ============================================================

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string
    search?: string
    page?: string
    q?: string
    productType?: string
    rarity?: string
    priceMin?: string
    priceMax?: string
    inStock?: string
    outOfStock?: string
    isPreOrder?: string
    sortBy?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const rawCategory = params?.category ?? null

  // Support both ?search= and legacy ?q= param
  const rawSearch = (params?.search ?? params?.q ?? "").trim()
  // Sanitize: strip SQL wildcards the caller might inject
  const searchQuery = rawSearch.replace(/[%_]/g, "")

  // Normalize: decode percent-encoding + re-slugify
  const categorySlug = normalizeCategoryParam(rawCategory)

  // --- 301 redirect if the incoming param is "dirty" ---
  // e.g. ?category=Magic%3A+The+Gathering or ?category=Magic: The Gathering
  // redirect to the clean canonical slug to avoid duplicate content
  if (rawCategory && rawCategory !== categorySlug) {
    const cleanSlug = categorySlug ?? ""
    const target = cleanSlug ? `/products?category=${cleanSlug}` : "/products"
    redirect(target) // next/navigation redirect — throws internally (permanent)
  }

  const rawProductType = typeof params?.productType === 'string' ? params.productType : null
  const rawRarity = typeof params?.rarity === 'string' ? params.rarity : null
  
  const pageParam = parseInt(params?.page || "1", 10)
  const page = isNaN(pageParam) ? 1 : Math.max(1, pageParam)

  const priceMin = params?.priceMin ? Number(params.priceMin) : null
  const priceMax = params?.priceMax ? Number(params.priceMax) : null
  const inStock = params?.inStock === "true" ? true : null
  const outOfStock = params?.outOfStock === "true" ? true : null
  const isPreOrder = params?.isPreOrder === "true" ? true : null
  const sortBy = params?.sortBy || null

  const BASE_URL = siteUrl

  // Server-side DB fetch: Create a promise instead of awaiting
  const dataPromise = (async () => {
    const [{ products, totalCount, totalPages }, aggregations, categoryMeta] = await Promise.all([
      getProductsPage({
        page,
        limit: 24,
        category: categorySlug,
        query: searchQuery || null,
        productType: rawProductType,
        rarity: rawRarity,
        priceMin,
        priceMax,
        inStock,
        outOfStock,
        isPreOrder,
        sortBy
      }),
      getFilterAggregations(categorySlug && categorySlug !== "all" ? categorySlug : null, searchQuery || null),
      categorySlug && categorySlug !== "all" ? getCategoryBySlug(categorySlug) : null
    ])

    const productsForClient = products.map((p) => ({
      ...p,
      slug: p.slug || p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      stock: p.stock ?? (p.inStock ? 10 : 0),
      inStock: p.inStock,
    })) as ProductFilter[]

    return { products: productsForClient, totalCount, totalPages, page, aggregations, categoryMeta }
  })()

  // Generate canonical URL for JSON-LD without awaiting DB
  const canonicalUrl = searchQuery
    ? `${BASE_URL}/products?search=${encodeURIComponent(searchQuery)}`
    : categorySlug
      ? `${BASE_URL}/products?category=${categorySlug}`
      : `${BASE_URL}/products`

  // Build JSON-LD with slug as name fallback (actual name is fetched async)
  const jsonLd = buildJsonLd(categorySlug ? slugToTitle(categorySlug) : null, 0, canonicalUrl)

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ProductsPageClient
        key={`${categorySlug || 'all'}-${searchQuery || 'none'}`}
        dataPromise={dataPromise}
        activeCategorySlug={categorySlug}
        activeSearch={searchQuery || null}
      />
    </>
  )
}

