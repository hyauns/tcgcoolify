import { cache } from "react"
import { getSql } from "./db-client"

export interface SiteSettings {
  heroTitle: string
  heroSubtitle: string
  heroImageUrl: string | null
  logoUrl: string | null
  faviconUrl: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  googleSiteVerification: string | null
  googleAdsConversionId: string | null
  googleAdsConversionLabel: string | null
  socialFacebook: string | null
  socialInstagram: string | null
  socialPinterest: string | null
  socialTwitter: string | null
  socialYoutube: string | null
}

const DEFAULTS: SiteSettings = {
  heroTitle: "Premium Trading Cards & Collectibles Store",
  heroSubtitle:
    "Discover authentic Magic: The Gathering, Pokemon, Yu-Gi-Oh! cards and rare collectibles. Build legendary decks with our trading card games.",
  heroImageUrl: null,
  logoUrl: null,
  faviconUrl: null,
  seoTitle: null,
  seoDescription: null,
  seoKeywords: null,
  googleSiteVerification: null,
  googleAdsConversionId: null,
  googleAdsConversionLabel: null,
  socialFacebook: null,
  socialInstagram: null,
  socialPinterest: null,
  socialTwitter: null,
  socialYoutube: null,
}

/**
 * Fetch site settings with a single retry and a per-request timeout.
 * Falls back to DEFAULTS on any failure so the page always renders.
 */
async function fetchSettingsOnce(): Promise<SiteSettings> {
  if (!process.env.DATABASE_URL) return DEFAULTS

  const sql = getSql()
  const rows = await sql`SELECT * FROM site_settings WHERE id = 1`
  const row = rows[0]

  if (!row) return DEFAULTS

  return {
    heroTitle: row.hero_title || DEFAULTS.heroTitle,
    heroSubtitle: row.hero_subtitle || DEFAULTS.heroSubtitle,
    heroImageUrl: row.hero_image_url || null,
    logoUrl: row.logo_url || null,
    faviconUrl: row.favicon_url || null,
    seoTitle: row.seo_title || null,
    seoDescription: row.seo_description || null,
    seoKeywords: row.seo_keywords || null,
    googleSiteVerification: row.google_site_verification || null,
    googleAdsConversionId: row.google_ads_conversion_id || null,
    googleAdsConversionLabel: row.google_ads_conversion_label || null,
    socialFacebook: row.social_facebook || null,
    socialInstagram: row.social_instagram || null,
    socialPinterest: row.social_pinterest || null,
    socialTwitter: row.social_twitter || null,
    socialYoutube: row.social_youtube || null,
  }
}

export const getSiteSettings = cache(async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return await fetchSettingsOnce()
  } catch (firstError) {
    // One retry after a short backoff for transient Neon cold-start timeouts
    console.warn("[site-settings] First attempt failed, retrying in 500ms…", (firstError as Error).message)
    await new Promise((r) => setTimeout(r, 500))
    try {
      return await fetchSettingsOnce()
    } catch (retryError) {
      console.error("[site-settings] Retry also failed — using defaults.", (retryError as Error).message)
      return DEFAULTS
    }
  }
})
