import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSql } from '@/lib/db-client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-guard';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Optional URL — accepts http(s) URL, empty string, or null and coerces to null.
// Image URLs (logo/favicon/hero) come from the admin upload endpoint which writes
// HTTPS R2 URLs. Social URLs are admin-entered and may legitimately be http or https
// from various platforms; we accept both to avoid breaking the existing admin UI.
const optionalUrl = z
  .union([z.string().url(), z.literal(''), z.null()])
  .nullish()
  .transform((v) => (v === '' || v == null ? null : v));

// Free-text string with a max length. Null/empty → null.
const optionalText = (max: number) =>
  z
    .union([z.string().max(max), z.literal(''), z.null()])
    .nullish()
    .transform((v) => (v === '' || v == null ? null : v));

// Google site verification meta value — alphanumeric + - _ only, short.
const googleVerificationToken = z
  .union([z.string().regex(/^[A-Za-z0-9_-]+$/).max(128), z.literal(''), z.null()])
  .nullish()
  .transform((v) => (v === '' || v == null ? null : v));

// Google Ads Conversion ID — format "AW-" followed by digits (e.g. AW-123456789).
const googleAdsConversionId = z
  .union([z.string().regex(/^AW-\d{6,15}$/), z.literal(''), z.null()])
  .nullish()
  .transform((v) => (v === '' || v == null ? null : v));

// Google Ads Conversion Label — the alphanumeric/_/- token from the event snippet.
const googleAdsConversionLabel = z
  .union([z.string().regex(/^[A-Za-z0-9_-]+$/).max(128), z.literal(''), z.null()])
  .nullish()
  .transform((v) => (v === '' || v == null ? null : v));

const settingsSchema = z.object({
  heroTitle: optionalText(200),
  heroSubtitle: optionalText(500),
  heroImageUrl: optionalUrl,
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  seoTitle: optionalText(200),
  seoDescription: optionalText(500),
  seoKeywords: optionalText(500),
  googleSiteVerification: googleVerificationToken,
  googleAdsConversionId: googleAdsConversionId,
  googleAdsConversionLabel: googleAdsConversionLabel,
  socialFacebook: optionalUrl,
  socialInstagram: optionalUrl,
  socialPinterest: optionalUrl,
  socialTwitter: optionalUrl,
  socialYoutube: optionalUrl,
});

export async function GET() {
  try {
    const sql = getSql();
    const settingsRows = await sql`SELECT * FROM site_settings WHERE id = 1`;
    let settings = settingsRows[0];

    if (!settings) {
      settings = {
        id: 1,
        hero_title: "Premium Trading Cards & Collectibles Store",
        hero_subtitle: "Discover authentic Magic: The Gathering, Pokemon, Yu-Gi-Oh! cards and rare collectibles. Build legendary decks with our trading card games.",
        hero_image_url: null,
        logo_url: null,
        favicon_url: null,
        seo_title: null,
        seo_description: null,
        seo_keywords: null,
        google_site_verification: null,
        google_ads_conversion_id: null,
        google_ads_conversion_label: null,
        social_facebook: null,
        social_instagram: null,
        social_pinterest: null,
        social_twitter: null,
        social_youtube: null,
      };
    }

    // Convert to camelCase to match the frontend expectations
    return NextResponse.json({
      id: settings.id,
      heroTitle: settings.hero_title,
      heroSubtitle: settings.hero_subtitle,
      heroImageUrl: settings.hero_image_url,
      logoUrl: settings.logo_url,
      faviconUrl: settings.favicon_url,
      seoTitle: settings.seo_title,
      seoDescription: settings.seo_description,
      seoKeywords: settings.seo_keywords,
      googleSiteVerification: settings.google_site_verification,
      googleAdsConversionId: settings.google_ads_conversion_id,
      googleAdsConversionLabel: settings.google_ads_conversion_label,
      socialFacebook: settings.social_facebook,
      socialInstagram: settings.social_instagram,
      socialPinterest: settings.social_pinterest,
      socialTwitter: settings.social_twitter,
      socialYoutube: settings.social_youtube,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  try {
    const rawBody = await request.json();

    const parsed = settingsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const sql = getSql();

    const heroTitle = body.heroTitle || "Premium Trading Cards & Collectibles Store";
    const heroSubtitle = body.heroSubtitle || "Discover authentic Magic: The Gathering, Pokemon, Yu-Gi-Oh! cards and rare collectibles. Build legendary decks with our trading card games.";

    // Perform Upsert on Neon using raw SQL
    const updatedSettings = await sql`
      INSERT INTO site_settings (
        id, hero_title, hero_subtitle, hero_image_url, logo_url, favicon_url, seo_title, seo_description, seo_keywords, google_site_verification, google_ads_conversion_id, google_ads_conversion_label, social_facebook, social_instagram, social_pinterest, social_twitter, social_youtube
      )
      VALUES (
        1, ${heroTitle}, ${heroSubtitle}, ${body.heroImageUrl || null}, ${body.logoUrl || null}, ${body.faviconUrl || null}, ${body.seoTitle || null}, ${body.seoDescription || null}, ${body.seoKeywords || null}, ${body.googleSiteVerification || null}, ${body.googleAdsConversionId || null}, ${body.googleAdsConversionLabel || null}, ${body.socialFacebook || null}, ${body.socialInstagram || null}, ${body.socialPinterest || null}, ${body.socialTwitter || null}, ${body.socialYoutube || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        hero_title = EXCLUDED.hero_title,
        hero_subtitle = EXCLUDED.hero_subtitle,
        hero_image_url = EXCLUDED.hero_image_url,
        logo_url = EXCLUDED.logo_url,
        favicon_url = EXCLUDED.favicon_url,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        google_site_verification = EXCLUDED.google_site_verification,
        google_ads_conversion_id = EXCLUDED.google_ads_conversion_id,
        google_ads_conversion_label = EXCLUDED.google_ads_conversion_label,
        social_facebook = EXCLUDED.social_facebook,
        social_instagram = EXCLUDED.social_instagram,
        social_pinterest = EXCLUDED.social_pinterest,
        social_twitter = EXCLUDED.social_twitter,
        social_youtube = EXCLUDED.social_youtube,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const settings = updatedSettings[0];

    // Force Next.js to purge the routing cache for the global layout
    // This allows the generateMetadata() and Header/Footer updates to reflect instantly
    revalidatePath('/', 'layout');

    return NextResponse.json({
      id: settings.id,
      heroTitle: settings.hero_title,
      heroSubtitle: settings.hero_subtitle,
      heroImageUrl: settings.hero_image_url,
      logoUrl: settings.logo_url,
      faviconUrl: settings.favicon_url,
      seoTitle: settings.seo_title,
      seoDescription: settings.seo_description,
      seoKeywords: settings.seo_keywords,
      googleSiteVerification: settings.google_site_verification,
      googleAdsConversionId: settings.google_ads_conversion_id,
      googleAdsConversionLabel: settings.google_ads_conversion_label,
      socialFacebook: settings.social_facebook,
      socialInstagram: settings.social_instagram,
      socialPinterest: settings.social_pinterest,
      socialTwitter: settings.social_twitter,
      socialYoutube: settings.social_youtube,
    });
  } catch (error: any) {
    console.error('Error updating settings:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Failed to update settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
