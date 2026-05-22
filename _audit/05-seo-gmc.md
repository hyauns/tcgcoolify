# SEO & Google Merchant Center Audit — tcglore.com

Date: 2026-05-22  
Scope: Next.js 14 App Router, read-only audit. No code modified.  
Sources reviewed: `app/robots.ts`, `app/sitemap.xml/`, `app/sitemaps/`, `app/api/feeds/[uuid]/route.ts`, PDP, collection, static pages, root layout.

---

## 0. Severity Legend

- **Critical** — likely cause of GMC suspension / mass deindex / item disapproval.
- **High** — measurable SEO loss or GMC warning at scale.
- **Medium** — quality / CTR / canonical hygiene.
- **Low** — polish.

---

## 1. Sitemap & robots.txt

### 1.1 robots.ts — Generally OK
File: `app/robots.ts:4-17`

- Allows `/`, disallows `/admin/*`, `/api/*`, `/checkout/*`, `/cart`, `/account/*`.
- Sitemap reference `${baseUrl}/sitemap.xml` is correct.
- `siteUrl` defaults to `https://tcglore.com` (no `www`) — see `lib/site-config.ts:42`.

**Issue 1.1.A — Medium.** `/wishlist` is allowed (no `disallow` rule) — it's a personalized, low-content page. Recommend disallow.

**Issue 1.1.B — Medium.** No `disallow` for parameterized faceted variants such as `/products?sortBy=*`, `/products?priceMin=*`, `/products?inStock=true`. Search Console "Crawled — currently not indexed" coverage warnings typically come from these. Either disallow non-canonical query keys or add `noindex` on filtered states. Currently `app/products/page.tsx:69` explicitly sets `robots: { index: true, follow: true }` on every variant — see Issue 4.1.

### 1.2 sitemap.xml index — Mostly correct
File: `app/sitemap.xml/route.ts`

- Sitemap index pattern is valid. Lists `core.xml`, `categories.xml`, and `products-N.xml` chunks of 5,000.
- `nodejs` runtime + 24h revalidate is fine.

**Issue 1.2.A — Low.** Sitemap `<sitemap>` entries in index have no `<lastmod>`. Adding lastmod helps Googlebot prioritize fresh chunks.

### 1.3 core.xml
File: `app/sitemaps/core.xml/route.ts:8-23`

**Issue 1.3.A — High. Duplicate / orphan URLs in sitemap.** The core sitemap submits `/payment-and-orders` AND `/payment` (line 21-22). It does NOT submit `/payment-orders`. Yet three routes exist: `app/payment/page.tsx`, `app/payment-and-orders/page.tsx`, `app/payment-orders/page.tsx`. The latter two render the same component (`payment-orders/page.tsx` re-exports `PaymentOrdersPage`). Combined with `/preorder-info` + `/preorder-policy` (also overlapping) this multiplies duplicate-content risk. See Issue 5 below.

**Issue 1.3.B — Medium.** `/preorder-policy` is missing from the core sitemap — it has full content and metadata but won't be discovered via the sitemap.

**Issue 1.3.C — Medium.** `<lastmod>` uses `new Date().toISOString()` (computed at request time). For static pages this is misleading — Googlebot may interpret every fetch as "everything just changed" and lower its trust in your lastmod. Use a fixed deployment timestamp or per-page constant.

**Issue 1.3.D — Low.** No `/best-price-guarantee` ... actually it is included (line 19). OK.

### 1.4 categories.xml
File: `app/sitemaps/categories.xml/route.ts:13-19`

**Issue 1.4.A — High.** Emits `${siteUrl}/products?category=${slug}` with the query string. Google can index this, but the canonical for the same page (`app/products/page.tsx:68`) is also a query-string URL, so the canonicalization is at least consistent. However: there is NO `<` URL-escape for special chars in `slug`, and if any category slug contains `&` or non-ASCII this produces invalid XML. Recommend running every URL through an XML-escape helper (already exists in `app/api/feeds/[uuid]/route.ts:96-103`).

### 1.5 products-N.xml
File: `app/sitemaps/[file]/route.ts:37-49`

- Iterates DB products, emits `<loc>/products/{slug}`, `<lastmod>=product.updated_at`. Good.

**Issue 1.5.A — Medium.** No XML-escape on `product.slug` or `siteUrl`. If a slug ever contains an ampersand the sitemap breaks. Wrap `loc` in `escapeXml()`.

**Issue 1.5.B — Low.** `slug` defensive comment ("Re-use exact same slug calculation or DB slug") then just uses `product.slug` — confirm DB slug equals PDP `params.slug` resolution (`generateSlug(product.name)` is used in feed at `route.ts:117`). Audit for slug drift between feed link and sitemap loc and PDP route.

---

## 2. Product Feed (Google Merchant Center)

File: `app/api/feeds/[uuid]/route.ts`

### 2.1 Required field coverage

| GMC Field | Present | Notes |
|---|---|---|
| `g:id` | yes (line 215) | uses `product.id` (numeric). OK. |
| `g:title` | yes (line 216) | escaped. |
| `g:description` | yes (line 217) | stripped HTML, capped 5000 chars. |
| `g:link` | yes (line 218) | `${siteUrl}/products/${slug}` where `slug = generateSlug(product.name)`. **See Issue 2.3.A.** |
| `g:image_link` | yes (line 219) | resolved by `resolveImageUrl`. |
| `g:price` | yes (line 220) | format `12.34 USD`. OK. |
| `g:availability` | yes (line 221) | mapped via `mapAvailability`. OK values. |
| `g:availability_date` | conditional (line 222) | added when preorder. ISO format with `Z`. OK. |
| `g:condition` | yes (line 223) | always `new`. |
| `g:brand` | yes (line 224) | falls back to "TCG Lore" — **see Issue 2.4.A.** |
| `g:google_product_category` | yes (line 225) | hardcoded `2363`. |
| `g:identifier_exists` | yes (line 226) | `no`. OK if truly no GTIN/MPN. |
| `g:shipping` | **MISSING** | Not in feed at all. **See Issue 2.5.A.** |
| `g:sale_price` | **MISSING** | DB has `original_price` but feed never emits sale_price. **See Issue 2.6.A.** |
| `g:mpn` / `g:gtin` | not emitted | OK because `identifier_exists=no`, but **see 2.4**. |

### 2.2 Availability values — Correct

`mapAvailability` returns `in_stock`, `out_of_stock`, or `preorder`. All are valid GMC enum values. `backorder` is not used (acceptable).

### 2.3 Preorder logic

`buildItemXml` (line 193-199):
```
let isActuallyPreorder = Boolean(product.is_pre_order)
if (isActuallyPreorder && product.release_date) {
  const d = new Date(product.release_date)
  if (d.getTime() < Date.now()) {
    isActuallyPreorder = false
  }
}
```
Sound: if the release date already passed, downgrade to in/out-of-stock based on stock. Matches the spirit of the recent `9b195d4` commit.

**Issue 2.3.A — Critical (GMC mismatch).** When `isActuallyPreorder` is downgraded to false at feed-build time, `mapAvailability` then returns `in_stock` if `stock_quantity > 0`, else `out_of_stock`. BUT the PDP (`app/products/[slug]/page.tsx:167-170`) computes availability purely from `product.isPreOrder` and `product.inStock` returned by `getProductBySlug` — it does NOT apply the same "release date in the past → no longer preorder" downgrade. Result: feed says `in_stock`, PDP JSON-LD says `https://schema.org/PreOrder`. **This is the exact GMC misrepresentation pattern.** Either centralize the normalization into `getProductBySlug` (so all surfaces agree) or remove the date check from the feed too.

**Issue 2.3.B — High.** `buildAvailabilityDate` (line 151-166) falls back to "now + 30 days" when no `release_date` exists. GMC accepts this technically, but it's manufactured data; the PDP shows NO availability date in that case, creating a feed vs. landing-page divergence. GMC's automated checkers compare `availability_date` against the landing page; if no on-page date is visible they may still pass it, but it is a soft risk.

**Issue 2.3.C — Medium.** `buildAvailabilityDate` does `new Date(releaseDate)` on a string column without timezone-normalizing. If `release_date` is a `DATE` column its parse may yield 00:00 UTC; if it's `TIMESTAMP` and stored without tz, behavior is host-dependent. Validate that all release_date values match what's shown to the user.

### 2.4 Brand handling

Line 203: `const brand = product.brands || "TCG Lore"`.

**Issue 2.4.A — Critical (GMC).** Falling back to `"TCG Lore"` as the brand is **GMC misrepresentation** — TCG Lore is the *retailer*, not the manufacturer of Pokemon/Magic/Lorcana cards. This will trigger "Incorrect brand" or "Misrepresentation" disapprovals. Either omit `g:brand` (allowed when unknown if `identifier_exists=no`) or use a generic placeholder explicitly flagged. The visible PDP also shows `product.brands` in the schema (`page.tsx:144-149`); when DB brand is null, PDP omits brand (good) but feed fills in "TCG Lore" (bad). Mismatch + factual error.

### 2.5 Shipping

**Issue 2.5.A — High.** No `g:shipping` element. The PDP JSON-LD declares three shipping tiers ($0 free over $75, $19.99 standard, $39.99 expedited) (`app/products/[slug]/page.tsx:182-264`) but the feed declares none. Google will use account-level shipping settings if any, otherwise items risk being disapproved in many markets. Add `<g:shipping><g:country>US</g:country><g:price>9.99 USD</g:price><g:service>Standard</g:service></g:shipping>` (or the free-over-$75 split via separate shipping entries).

**Issue 2.5.B — Medium.** PDP shows free shipping when `product.price >= 75` — feed must reflect this. Mismatched shipping is a frequent suspension cause.

### 2.6 Sale price

**Issue 2.6.A — High.** `FeedProductRow.original_price` exists (`lib/repositories/feeds.ts:32`) and is SELECTed (line 288), but `buildItemXml` never reads it. If a product has `original_price > price`, GMC should receive:
```
<g:price>{original_price} USD</g:price>
<g:sale_price>{price} USD</g:sale_price>
<g:sale_price_effective_date>...</g:sale_price_effective_date>
```
Currently it emits a single `<g:price>` equal to the sale price — and the PDP shows a strike-through original price in the UI (`app/explore/[brand]/[attribute]/page.tsx:234-238`). This is a price-display mismatch.

### 2.7 Country / currency

**Issue 2.7.A — Medium.** Feed never declares `<g:shipping_country>` or any country signal at the item level. Currency is implicit via `USD` in price string. Account-level settings may cover this, but explicitly add country fields for robustness.

### 2.8 RSS shell

Line 46-51, line 77. Valid RSS 2.0 with `g:` namespace. OK.

**Issue 2.8.A — Low.** `<title>` and `<description>` of the channel embed `config.platform === "BING" ? "Bing" : "Google"` — fine. Add `<lastBuildDate>` for cache hygiene.

---

## 3. PDP SEO

File: `app/products/[slug]/page.tsx`

### 3.1 generateMetadata — Mostly good

- Title `Buy ${product.name} | TCG Lore` (line 38). Good CTR pattern.
- Description includes price + stock + truncation to 155 chars (line 42-54). Good.
- Canonical set (`alternates.canonical`, line 64).
- OG image absolute URL safety check on line 49. Good.
- Twitter card present.

**Issue 3.1.A — High.** Description embeds `$${product.price.toFixed(2)}` and `In Stock`/`Out of Stock` (line 41-42). If page is statically cached (it uses `generateStaticParams` for popular slugs), these can go stale relative to live DB. Result: SERP snippet says "$12.99 / In Stock" while the page now shows "$14.99 / Out of Stock". GMC and Google can flag this. Either force revalidate frequently or omit price from the meta description.

**Issue 3.1.B — Medium.** No `robots` block on PDP metadata. If `product.is_active = false`, the PDP isn't filtered (the route just `notFound()`s for null product, but inactive products may still be retrievable depending on `getProductBySlug` logic — verify). If inactive products are still served, they should `noindex`.

**Issue 3.1.C — Low.** Title format hardcodes "Buy" — fine, but consider adding rarity/set to titles for long-tail keywords.

### 3.2 Product JSON-LD

Lines 136-266. Largely well-structured.

**Issue 3.2.A — Critical.** `"sku": product.id.toString()` and `"mpn": product.id.toString()` (lines 142-143). Setting MPN = internal numeric ID is **false structured data** — MPN must be the manufacturer's part number. Feed declares `identifier_exists=no`, but JSON-LD asserts an MPN. Google can interpret this as conflicting data. Remove `mpn` from JSON-LD or only emit when DB has a real MPN.

**Issue 3.2.B — High.** `"brand"` JSON-LD only included when `product.brands` truthy (line 144-149) — good. But the feed defaults missing brand to "TCG Lore" (Issue 2.4.A). After fixing 2.4.A both surfaces will agree (omit when missing).

**Issue 3.2.C — High.** `"availability"` uses `https://schema.org/PreOrder` when `product.isPreOrder` is true (line 167-169) **without** the same "release date past → not really preorder" downgrade applied in the feed (Issue 2.3.A). Mismatch.

**Issue 3.2.D — Medium.** `"price": product.price.toFixed(2)` (line 164) — no `priceSpecification`, no original_price / discount representation. JSON-LD doesn't reflect sale state.

**Issue 3.2.E — Medium.** `"priceValidUntil"` is set to `now + 1 year` (line 165) computed at request time. Acceptable. For statically generated pages this string is built once at build time and never updates — Google may flag stale `priceValidUntil`. Use ISR.

**Issue 3.2.F — Medium.** `"seller": { "name": "TCG Lore LLC" }` (line 172-174). Legal entity is "A Toy Haulerz LLC" (per `app/layout.tsx:113`, `/about`, `/payment-and-orders`). "TCG Lore LLC" does not exist. Use `"A Toy Haulerz LLC"` or the trading name `"TCG Lore"` (no "LLC" suffix). Inconsistent entity naming is a misrepresentation flag.

**Issue 3.2.G — Low.** Shipping tiers in JSON-LD use a fixed standard rate that branches at `>= $75` — feed has no shipping at all (Issue 2.5.A). Reconcile.

### 3.3 Alt text patterns

Reviewed `app/products/[slug]/page-client.tsx:269,366,1020,1086`. All use `alt={product.name}` or `alt={\`${product.name} ${index+1}\`}`. Acceptable.

**Issue 3.3.A — Low.** Multi-image alt is generic. Add brand/set/rarity for richer image search.

---

## 4. Category / collection pages

File: `app/products/page.tsx`

### 4.1 generateMetadata — Good but…

- Per-category title/description (line 18-83). Good.
- Canonical set to `?category=<slug>` when category param present, else `/products`. Good.
- `robots: { index: true, follow: true }` (line 69) — **see issue.**

**Issue 4.1.A — High.** Every variant including filtered states is set to `index: true, follow: true`. The page accepts `productType`, `rarity`, `priceMin`, `priceMax`, `inStock`, `outOfStock`, `isPreOrder`, `sortBy`, `page`, `search`. None of these contribute to canonical, none triggers `noindex`. Result: Google can crawl `?category=pokemon&rarity=rare&priceMin=10&sortBy=price-desc&page=3` and treat each as indexable. The canonical points to a different URL (just `?category=`), which IS canonicalization, but Search Console will still log thousands of "Alternate page with proper canonical tag" entries — bloats crawl budget. Either add `noindex` when any filter beyond `category` is present, or block these via `robots.ts`.

**Issue 4.1.B — Medium.** Paginated category URLs (`?page=2`) collapse to canonical `?category=<slug>` (no page param) — Google may not index deeper pages. For deep catalogs add `?page=N` to canonical when page > 1, or use `rel="next/prev"` semantics (deprecated but still used).

**Issue 4.1.C — Medium.** The 301-redirect block (line 180-184) is good UX (cleans dirty category params) but uses Next.js `redirect()` which issues 307 by default in app router. For SEO you want 301 on canonical-cleanup redirects. Verify.

### 4.2 CollectionPage JSON-LD

Lines 100-142. Has BreadcrumbList nested inside CollectionPage — works but conventionally BreadcrumbList is its own top-level item. Acceptable. JSON-LD includes `provider.contactPoint` with phone — good NAP consistency.

### 4.3 Explore subroutes — Critical 404 bug

File: `app/explore/[brand]/[attribute]/page.tsx`

**Issue 4.3.A — CRITICAL.** Lines 197, 227, 246, 261, 272 link to `/product/${slug}` (singular). The PDP route is `/products/[slug]` (plural). Every product card on every explore page produces a 404. Verified: `app/product/` directory does not exist; only `app/products/[slug]/page.tsx` exists.

**Issue 4.3.B — High.** `getExploreProducts` builds `slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")` (line 90). PDP route uses DB `product.slug` (Issue 1.5.B). Even if 4.3.A is fixed, the slug formula must match.

**Issue 4.3.C — Medium.** `unslugify` (line 31-36) is lossy: `wizards-of-the-coast` becomes `Wizards Of The Coast`, but the actual DB brand might be `Wizards of the Coast`. Then `ILIKE '%Wizards Of The Coast%'` happens to match (case-insensitive), but for multi-word brands with apostrophes/commas this fails silently. SQL `ILIKE` masks the problem.

**Issue 4.3.D — Medium.** Explore pages have no canonical that signals their relation to `/products?category=...`. If both index, Google sees parallel taxonomy and dilutes link equity.

---

## 5. Static page SEO & duplicates

### 5.1 Pages WITH metadata (good)
- `app/about/page.tsx:10` — full metadata. Hardcodes `https://tcglore.com/about` in OG URL (line 19) — drift if site moves to `www`.
- `app/contact/page.tsx:6` — basic metadata.
- `app/faq/page.tsx:8` — basic metadata.
- `app/preorder-policy/page.tsx:8` — full metadata.
- `app/payment-orders/page.tsx:4` — sets canonical to `https://www.tcglore.com/payment-and-orders` (line 8). **`www` here, `tcglore.com` everywhere else.**
- `app/page.tsx:12` — homepage metadata.

### 5.2 Pages WITHOUT metadata (inherit root)

These all silently use the root layout's "TCG Lore - Premium Trading Cards..." title and description, causing duplicate titles in Search Console:

- `app/shipping/page.tsx` — Critical
- `app/returns/page.tsx` — Critical
- `app/privacy/page.tsx` — Critical
- `app/terms/page.tsx` — Critical
- `app/cookies/page.tsx` — Critical (also `"use client"` — metadata cannot be exported from client comps; would need a server wrapper)
- `app/preorder-info/page-client.tsx` — page is client-only via `app/preorder-info/page.tsx`, which doesn't export metadata.
- `app/best-price-guarantee/page.tsx` — client component, no metadata.
- `app/payment-and-orders/page.tsx` — server component but exports no metadata.
- `app/payment/page.tsx` — exports no metadata.

**Issue 5.2.A — Critical.** ~8 important static pages share identical title and description. Direct Search Console signal "Duplicate meta description". Add `metadata` exports to each (cookies and best-price-guarantee need a server wrapper since they're `"use client"`).

### 5.3 Duplicate-content cluster

**Issue 5.3.A — Critical.**
- `app/payment/page.tsx` — full page component.
- `app/payment-and-orders/page.tsx` — almost identical full page (verified diff: minor copy difference — "Payment Policy" hero title vs "Payment & Orders" hero title). Both indexable.
- `app/payment-orders/page.tsx` — re-exports `PaymentOrdersPage`. So `/payment-orders` and `/payment-and-orders` serve byte-identical HTML.
- `app/preorder-info/page.tsx` and `app/preorder-policy/page.tsx` — distinct content but topically overlapping, both indexable.

Sitemap includes `/payment` and `/payment-and-orders` but NOT `/payment-orders`. The `/payment-orders` route still resolves and is crawlable via links/feed. Result: minimum 2 (possibly 3) URLs returning highly similar content. Triple duplicate-content signal. Recommended action: 301-redirect `/payment` and `/payment-orders` to `/payment-and-orders` (or pick one canonical).

**Issue 5.3.B — High.** `/payment-orders/page.tsx` sets canonical `https://www.tcglore.com/payment-and-orders` with `www` while `siteUrl` returns `https://tcglore.com` (no www). If the prod domain is `tcglore.com`, this canonical points to a wrong host and Google may not honor it. If the prod domain is `www.tcglore.com`, then ALL other canonicals on the site are wrong. **Pick one canonical host and standardize.**

### 5.4 Best Price Guarantee — verifiability risk

**Issue 5.4.A — High (GMC).** `/best-price-guarantee` claims "we'll match it and beat it by 5%". The terms section excludes auctions, individual sellers, clearance, etc. This is fine as a written policy, but GMC editorial sometimes flags "Best price guarantee" hero claims as unsubstantiated unless paired with verifiable independent evidence. Lower severity since the policy IS explained with terms, but consider softening the headline ("Competitive Pricing" + "Price match available subject to terms below").

---

## 6. Global structured data

File: `app/layout.tsx:110-144`.

- `Organization` JSON-LD: present. Has `name`, `alternateName`, `url`, `logo`, `contactPoint`, `address`. Good NAP. **Issue 6.A — Medium**: missing `sameAs` (social profiles), missing `taxID` / `vatID` if applicable. Optional.
- `WebSite` JSON-LD with `SearchAction`: present. Target `${siteUrl}/products?search={search_term_string}`. Good.

**Issue 6.B — Medium.** No global `BreadcrumbList` schema. The category pages embed breadcrumbs inside the CollectionPage (`app/products/page.tsx:124-140`), but PDPs do not. Add a `BreadcrumbList` JSON-LD on PDP (Home → Products → Category → Product) — eligible for breadcrumb rich result in SERP.

**Issue 6.C — Low.** `Organization.contactPoint.email = "cs@tcglore.com"` is fine but adding `areaServed: "US"` would be explicit.

---

## 7. GMC-specific risk summary

| # | Risk | Severity | Surface |
|---|------|----------|---------|
| 1 | Brand fallback to "TCG Lore" (retailer-as-brand) | Critical | Feed line 203 |
| 2 | PDP JSON-LD MPN = internal numeric ID | Critical | PDP line 143 |
| 3 | Feed downgrades stale preorders; PDP does not. Availability mismatch. | Critical | Feed lines 193-201 vs PDP lines 167-169 |
| 4 | Feed lacks `g:shipping`; PDP JSON-LD declares 3 tiers | High | Feed + PDP lines 182-264 |
| 5 | Feed never emits `g:sale_price` despite `original_price` in DB | High | Feed buildItemXml |
| 6 | Static PDP description embeds price/stock (cache staleness vs feed/live) | High | PDP lines 41-46 |
| 7 | `seller.name = "TCG Lore LLC"` (legal entity is "A Toy Haulerz LLC") | High | PDP line 173 |
| 8 | Canonical host inconsistency (`tcglore.com` vs `www.tcglore.com`) | High | `payment-orders/page.tsx:8`, `about/page.tsx:19` vs `siteUrl` |
| 9 | Duplicate static pages: /payment, /payment-and-orders, /payment-orders | Critical (duplicate content) | App router |
| 10 | 8 static pages inherit homepage metadata (duplicate titles) | Critical (SEO) | shipping, returns, privacy, terms, cookies, preorder-info, best-price-guarantee, payment, payment-and-orders |
| 11 | `/explore/[brand]/[attribute]` links to non-existent `/product/{slug}` (singular) | Critical (404 internal) | `explore/.../page.tsx:197,227,246,261,272` |
| 12 | Indexable filter-state URLs on /products with `index:true` | High | `products/page.tsx:69` |
| 13 | "Best Price Guarantee" claim verifiability | Medium | `/best-price-guarantee` |
| 14 | preorder availability_date fabricated (+30d) when no release_date | Medium | Feed line 162 |
| 15 | XML escape missing on sitemap URLs | Medium | `sitemaps/categories.xml`, `sitemaps/[file]` |

---

## 8. Prioritized Remediation Order

1. **(Critical)** Fix `/explore` → `/product` 404s — change to `/products/`.
2. **(Critical)** Remove `mpn` from PDP JSON-LD (or only emit when real value present).
3. **(Critical)** Remove "TCG Lore" brand fallback in feed; omit `g:brand` when DB null.
4. **(Critical)** Centralize preorder normalization (release_date past → in_stock/out_of_stock) so feed AND PDP agree. Recommended: do it inside `getProductBySlug` and the feed query consumer.
5. **(Critical)** Canonicalize host once. Choose `https://tcglore.com` or `https://www.tcglore.com`, update `payment-orders/page.tsx`, `about/page.tsx`, set 301 redirect on the other.
6. **(Critical)** Remove `app/payment-orders/page.tsx` and `app/payment/page.tsx` (or 301 to `/payment-and-orders`). Pick one canonical preorder explainer (`/preorder-policy` recommended) and 301 the other.
7. **(Critical)** Add `metadata` exports to shipping, returns, privacy, terms, cookies (server wrapper), preorder-info, best-price-guarantee (server wrapper), payment-and-orders.
8. **(High)** Add `g:shipping` to feed matching PDP JSON-LD shipping tiers.
9. **(High)** Emit `g:sale_price` when `original_price > price`.
10. **(High)** Remove price/stock from PDP meta description, OR force PDP to dynamic rendering for these fields.
11. **(High)** Fix `seller.name` to `"A Toy Haulerz LLC"` (or just `"TCG Lore"`).
12. **(High)** Add `noindex` to filter-state product pages.
13. **(Medium)** Add `BreadcrumbList` JSON-LD to PDPs.
14. **(Medium)** XML-escape all URLs in sitemaps.
15. **(Medium)** Store and honor real `release_date` instead of +30d fabrication.

---

## Summary (~250 words)

The site has a working sitemap/robots foundation and largely complete PDP metadata, but several critical issues likely contribute to the recent Google Merchant Center friction referenced in commit `9b195d4`. The product feed and PDP do not agree on (a) preorder status — the feed downgrades a "preorder" whose release date has passed, the PDP does not, producing availability mismatch — (b) brand — feed defaults missing brands to "TCG Lore" (the retailer, not the manufacturer), a textbook misrepresentation flag — (c) shipping — PDP JSON-LD declares three tiers, the feed declares none — and (d) seller identity — PDP says "TCG Lore LLC" but the legal entity is "A Toy Haulerz LLC". The PDP JSON-LD also asserts `mpn` equal to the internal numeric product ID, which is fabricated structured data and contradicts the feed's `identifier_exists=no`. On the SEO side, eight key static pages (shipping, returns, privacy, terms, cookies, preorder-info, best-price-guarantee, payment-and-orders) inherit the homepage's title/description, producing site-wide duplicate metadata. Three nearly-identical pages (`/payment`, `/payment-and-orders`, `/payment-orders`) exist and at least two are crawlable — direct duplicate content. The `/explore/[brand]/[attribute]` pages link product cards to `/product/{slug}` (singular), but the PDP route is `/products/{slug}` — every explore product card is a 404. The host canonical is inconsistent (`tcglore.com` versus `www.tcglore.com`). Faceted `/products` URLs are all `index:true` with no noindex on filter combinations. Fix order: explore 404s, MPN, brand fallback, preorder normalization, host canonical, duplicate /payment* pages, and missing static-page metadata — in that order — to clear the highest-severity GMC and indexing risks.
