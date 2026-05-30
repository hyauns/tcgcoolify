/**
 * lib/product-utils.ts
 *
 * Pure utility functions shared between server and client code.
 *
 * ⚠️  NO database imports. NO server-only imports.
 *     Safe to import from any Client Component.
 *
 * Server-side data-fetching functions live in lib/products.ts,
 * which re-exports everything from here for convenience.
 */

// ============================================================
// Slug helpers
// ============================================================

/**
 * Generate a URL-safe slug from a product name.
 * e.g. "Booster Pack: Elite" → "booster-pack-elite"
 */
export function generateProductSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "")
}

/**
 * Canonical category slug — used by both server and client.
 * Aggressively strips ALL special characters before hyphenating.
 *
 * Examples:
 *   "Pokemon TCG"            → "pokemon-tcg"
 *   "Magic: The Gathering"   → "magic-the-gathering"
 *   "Yu-Gi-Oh!"              → "yu-gi-oh"
 *   "Magic%3A The Gathering" → "magic-the-gathering"  (percent-encoded input)
 */
export function generateCategorySlug(name: string): string {
  return decodeURIComponent(name) // handles %3A → : before we strip it
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // strip :, !, ?, &, etc.
    .replace(/\s+/g, "-")          // spaces → hyphens
    .replace(/-+/g, "-")           // collapse double-hyphens
    .trim()
    .replace(/^-+|-+$/g, "")       // strip leading/trailing hyphens
}

/**
 * Normalise a raw URL query param value to a clean category slug.
 * Handles both percent-encoded (%3A) and already-decoded (":") inputs.
 * Returns null when the input is falsy, "all", or produces an empty string.
 */
export function normalizeCategoryParam(raw: string | undefined | null): string | null {
  if (!raw) return null
  const slug = generateCategorySlug(raw)
  return slug && slug !== "all" ? slug : null
}

// ============================================================
// Badge helpers
// ============================================================

/**
 * Deterministic "Hot" badge — seeded by product id, no Math.random().
 *
 * WHY id-based modulo?
 *   Math.random() re-evaluates every render/refresh, flipping the badge
 *   on and off and creating confusing, untrustworthy UX. Using (id % 10)
 *   gives a stable pseudo-random distribution consistent across SSR,
 *   client hydration, page refreshes, and ISR cache revalidations.
 *   The badge becomes part of the product's identity.
 *
 * DISTRIBUTION:
 *   id % 10 → 0–9  (10 buckets)
 *   Hot when id % 10 < 3  →  ~30 % of products  (buckets 0, 1, 2)
 *   Tune: < 2 → ~20 %,  < 4 → ~40 %
 *
 * GOOGLE MERCHANT CENTER SAFETY:
 *   Used only as a visual DOM overlay — never injected into JSON-LD,
 *   product title, meta description, or <img> alt text.
 */
export function isHotProduct(id: number): boolean {
  return id % 10 < 3 // ~30 % distribution
}

/**
 * Deterministic "New" badge — product created within the last 30 days.
 */
export function isNewProduct(createdAt: Date | string): boolean {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return new Date(createdAt) >= thirtyDaysAgo
}

// ============================================================
// Dynamic SEO / Category header content
// ============================================================

export interface CategoryContent {
  title: string
  description: string
}

/**
 * Returns SEO-optimised title and description for the category header.
 *
 * Slugs are produced by generateCategorySlug() — guaranteed to match
 * exactly what the server derives from the ?category= param and what
 * the product_categories table stores.
 *
 * Pass activeCategorySlug (may be null for "all products") and
 * optionally a raw searchTerm to get a search-results variant.
 */
const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  "all-products": {
    title: "All Trading Card Products",
    description:
      "Browse our complete collection of authentic Magic: The Gathering, Pokemon, Yu-Gi-Oh! trading cards, booster packs, and collectibles.",
  },
  "magic-the-gathering": {
    title: "Magic: The Gathering (MTG) - Cards & Boosters",
    description:
      "Find your spark! Shop authentic MTG booster boxes, bundles, and single cards from the latest releases to vintage classics.",
  },
  "pokemon-tcg": {
    title: "Pokemon TCG - Packs & Elite Trainer Boxes",
    description:
      "Catch the best deals on authentic Pokemon cards. Explore the latest expansions, ETBs, and rare holographic cards at TCG Lore.",
  },
  // Alias: DB slug may be "pokemon" instead of "pokemon-tcg"
  "pokemon": {
    title: "Pokemon TCG - Packs & Elite Trainer Boxes",
    description:
      "Catch the best deals on authentic Pokemon cards. Explore the latest expansions, ETBs, and rare holographic cards at TCG Lore.",
  },
  "yu-gi-oh": {
    title: "Yu-Gi-Oh! TCG - Booster Boxes & Structure Decks",
    description:
      "It's time to duel! Build your ultimate deck with our certified authentic Yu-Gi-Oh! card collection and rare single cards.",
  },
  "disney-lorcana": {
    title: "Disney Lorcana TCG - Illumineer's Troves & Packs",
    description:
      "Experience the magic of Disney Lorcana. Shop authentic booster packs and starter decks featuring your favorite Disney characters.",
  },
  "one-piece-card-game": {
    title: "One Piece Card Game - Romance Dawn & Boosters",
    description:
      "Set sail with the Straw Hat Crew! Find the latest One Piece booster boxes, leader cards, and official English/Japanese releases.",
  },
  "digimon-card-game": {
    title: "Digimon Card Game - Tamer Goods & Boosters",
    description:
      "Digital Gate Open! Discover authentic Digimon card game products, from classic booster sets to the latest Tamer decks.",
  },
  "star-wars-unlimited": {
    title: "Star Wars: Unlimited TCG - Sparks of Rebellion",
    description:
      "Enter a galaxy far, far away. Shop Star Wars: Unlimited booster packs and decks featuring iconic heroes and villains.",
  },
  "flesh-and-blood": {
    title: "Flesh and Blood TCG - Classic TCG Combat",
    description:
      "Welcome to Rathe. Shop authentic Flesh and Blood booster boxes and decks designed for the ultimate classic TCG experience.",
  },
}

/**
 * Get dynamic SEO content for the category header.
 *
 * @param slugOrNull - activeCategorySlug from the server (e.g. "pokemon-tcg") or null for all products
 * @param searchTerm - optional search query to produce a "results for X" variant
 */
export function getCategoryContent(
  slugOrNull: string | null,
  searchTerm?: string
): CategoryContent {
  if (searchTerm?.trim()) {
    return {
      title: `Search Results for "${searchTerm.trim()}"`,
      description: `Showing results matching your search across our full TCG catalogue.`,
    }
  }
  const key = slugOrNull && slugOrNull !== "all" ? slugOrNull : "all-products"
  return CATEGORY_CONTENT[key] ?? CATEGORY_CONTENT["all-products"]
}

