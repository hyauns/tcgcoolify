import type { Metadata } from "next"
import { getFeaturedProducts, getBestSellingProducts, getPreOrderProducts } from "@/lib/products"
import { getAllReviews } from "@/lib/reviews"
import { getSiteSettings } from "@/lib/site-settings"
import HomePageClient from "./page-client"
import { siteUrl } from "@/lib/site-config"
import { TrustpilotRating } from "./components/trustpilot-rating"

// ============================================================
// SEO Metadata
// ============================================================

export const metadata: Metadata = {
  title: "TCG Lore - Premium Trading Cards & Collectibles Store",
  description:
    "Shop authentic Magic: The Gathering, Pokemon, Yu-Gi-Oh!, Disney Lorcana, and One Piece trading cards. Booster packs, booster boxes, and sealed product. Free shipping on US orders over $75.",
  keywords:
    "trading cards, TCG, Magic The Gathering, Pokemon cards, Yu-Gi-Oh, Disney Lorcana, One Piece Card Game, booster packs, booster boxes, collectible cards, card shop, TCG Lore",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "TCG Lore - Premium Trading Cards & Collectibles Store",
    description:
      "Authentic trading cards from your favourite TCG brands. Magic, Pokemon, Yu-Gi-Oh!, Lorcana & more. Fast US shipping.",
    url: siteUrl,
    siteName: "TCG Lore",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TCG Lore - Premium Trading Cards & Collectibles Store",
    description: "Authentic trading cards from your favourite TCG brands.",
  },
}

// ============================================================
// Server Component — fetches all data on the server then
// passes it to the Client Component as serialisable props.
// DATABASE_URL is only read on the server; never exposed to
// the browser. Resolves the "No database connection string"
// console error caused by the previous useEffect approach.
// ============================================================

// Homepage has no user-specific data (no cookies/headers/session reads). Admin
// product mutations call revalidatePath("/") in
// app/admin/products/actions.ts:70, and admin settings updates call
// revalidatePath("/", "layout") in app/api/admin/settings/route.ts:151, so this
// 5-minute interval is just a safety net.
export const revalidate = 300

export default async function HomePage() {
  const siteSettings = await getSiteSettings()

  // Product fetching is not awaited, passed as a promise for Suspense streaming
  const dataPromise = Promise.all([
    getFeaturedProducts(),
    getBestSellingProducts(),
    getPreOrderProducts(),
    getAllReviews(),
  ])

  return (
    <HomePageClient
      heroSettings={siteSettings}
      dataPromise={dataPromise}
      trustpilotSlot={<TrustpilotRating />}
    />
  )
}

