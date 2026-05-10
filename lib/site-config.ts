/**
 * lib/site-config.ts
 *
 * Single source of truth for the application's public URL.
 *
 * Usage:
 *   import { siteUrl } from "@/lib/site-config"
 *   const canonical = `${siteUrl}/products`
 *
 * Environment variable priority (first truthy value wins):
 *   1. NEXT_PUBLIC_SITE_URL   – authoritative production URL, set in Vercel
 *   2. BASE_URL               – legacy alias kept for backward compatibility
 *   3. http://localhost:3000  – local dev fallback
 *
 * NEXT_PUBLIC_SITE_URL is safe to reference on the client because it has
 * the NEXT_PUBLIC_ prefix and contains no secrets.
 *
 * Production checklist:
 *   □ Set NEXT_PUBLIC_SITE_URL=https://www.tcglore.com in Vercel Environment Variables
 *   □ Remove trailing slash from the value
 */

const rawUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.tcglore.com"

/**
 * The canonical site root URL with no trailing slash.
 * Example: "https://www.tcglore.com"
 */
export const siteUrl = rawUrl.replace(/\/$/, "")

/**
 * Site display name.
 */
export const siteName = "TCG Lore Operated by A TOY HAULERZ LLC Company."

/**
 * Primary sender email shown to customers.
 */
export const siteFromEmail =
  process.env.EMAIL_FROM || "TCG Lore Operated by A TOY HAULERZ LLC Company. <cs@tcglore.com>"
