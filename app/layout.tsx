import "@/lib/env" // Fail-fast env validation — must be first import
import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { Providers } from "./providers"
import Script from "next/script"
import "./globals.css"
import { Inter } from "next/font/google"
import { AnalyticsWrapper } from "@/app/components/analytics-wrapper"
import { siteUrl } from "@/lib/site-config"
import { getSiteSettings } from "@/lib/site-settings"
import { getSql } from "@/lib/db-client"

const inter = Inter({ subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
  title: settings.seoTitle || "TCG Lore - Premium Trading Cards, Booster Packs & Collectibles | Authentic TCG Products",
  description: settings.seoDescription || "Shop authentic trading cards, booster packs, and collectibles from Magic: The Gathering, Pokemon, Yu-Gi-Oh!, Disney Lorcana & more. Fast shipping, competitive prices.",
  keywords: settings.seoKeywords || [
    "trading cards", "TCG", "collectibles", "booster packs", "card games",
    "Magic The Gathering", "Pokemon cards", "Yu-Gi-Oh cards", "Disney Lorcana",
    "One Piece Card Game", "Flesh and Blood", "authentic trading cards",
    "TCG store", "card shop", "collectible card games", "booster boxes",
    "pre-order cards", "rare cards", "mint condition cards", "sealed products"
  ].join(", "),
  authors: [{ name: "TCG Lore", url: siteUrl }],
  creator: "TCG Lore - Premium Trading Card Games",
  publisher: "A Toy Haulerz LLC",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: settings.seoTitle || "TCG Lore - Premium Trading Cards & Collectibles | Authentic Products",
    description: settings.seoDescription || "Shop authentic trading cards from Magic: The Gathering, Pokemon, Yu-Gi-Oh! & more. Premium booster packs, rare collectibles, and fast shipping.",
    url: siteUrl,
    siteName: "TCG Lore - Premium Trading Card Games",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TCG Lore - Premium Trading Cards, Booster Packs and Collectibles",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: settings.seoTitle || "TCG Lore - Premium Trading Cards & Collectibles",
    description: settings.seoDescription || "Shop authentic Magic: The Gathering, Pokemon, Yu-Gi-Oh! cards & more. Premium booster packs, rare collectibles, and fast shipping.",
    images: ["/og-image.jpg"],
    creator: "@tcglore",
    site: "@tcglore",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    ...(settings.googleSiteVerification ? { google: settings.googleSiteVerification } : {}),
  },
  icons: {
    icon: settings.faviconUrl || "/favicon.ico",
  },
  category: "E-commerce",
  classification: "Trading Card Games Store",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "TCG Lore",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#2563eb",
    "theme-color": "#2563eb",
  },
}
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let categories: { name: string, slug: string }[] = []
  
  if (process.env.DATABASE_URL) {
    try {
      const sql = getSql()
      const dbCategories = await sql`SELECT name, slug FROM product_categories WHERE is_active = true ORDER BY display_order ASC`
      categories = dbCategories.map((c: any) => ({ name: c.name, slug: c.slug }))
    } catch (e) {
      console.warn("[layout] Failed to fetch categories (using empty fallback):", (e as Error).message)
    }
  }
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "A Toy Haulerz LLC",
    "alternateName": "TCG Lore",
    "url": siteUrl,
    "logo": `${siteUrl}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-303-668-3245",
      "contactType": "customer service",
      "email": "cs@tcglore.com",
      "availableLanguage": ["English"]
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1757 NORTH CENTRAL AVENUE",
      "addressLocality": "FLAGLER BEACH",
      "addressRegion": "FL",
      "postalCode": "32136",
      "addressCountry": "US"
    }
  }

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "TCG Lore",
    "url": siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteUrl}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  }

  return (
    <html lang="en">
      <head>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />
      </head>
      <body className={inter.className}>
        <Providers categories={categories}>
          {children}
          <Suspense fallback={null}>
            <AnalyticsWrapper />
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}

