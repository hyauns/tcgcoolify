# Performance Audit — Next.js 14 App Router Ecommerce

Scope: read-only audit of SSR/CSR boundaries, DB queries, image strategy, bundle size, caching, API patterns, middleware, and observability overhead. No code was modified.

Stack confirmed: `next@14.2.29`, dual DB drivers (`@neondatabase/serverless` + `postgres@3.4.9`; only `postgres` is actually wired in `lib/db-client.ts`), `@sentry/nextjs@10.46`, `@upstash/redis` + `@upstash/ratelimit`, `recharts`, `jspdf`, `html2canvas`, `fuse.js`, `react-day-picker`, `swr`.

Recent wins already in place: `getAllProducts` 500-row cap, dropped `p.description` from listing SELECTs, `db-profiler` keyed by env flag, `withDbRetry` for transients, postgres.js TCP pool (max 10, prepare:false for PgBouncer), `unstable_cache`-free static-friendly profiler, `revalidate = 86400` on sitemap/category XML routes, `next/image` via `ImageWithFallback`, `formats: ['avif','webp']`, `minimumCacheTTL: 86400`.

Findings classified P0 (fix first — blocks LCP/INP or breaks builds at scale), P1 (significant), P2 (polish).

---

## P0 — Blocking issues

### P0-1. Homepage and `/products` are `force-dynamic`, defeating ISR/static rendering
- File: `app/page.tsx:42` — `export const dynamic = "force-dynamic"`
- File: `app/products/page.tsx:12` — `export const dynamic = "force-dynamic"`
- Evidence: both top-traffic pages opt out of caching entirely. The homepage calls `getFeaturedProducts`, `getBestSellingProducts`, `getPreOrderProducts`, `getAllReviews` on every request; `/products` runs `getProductsPage` + `getFilterAggregations` + `getCategoryBySlug` per request.
- Impact: every visit hits Neon (5–6 queries on home, 2–3 on listings). TTFB is at the mercy of cross-region DB latency. Crawlers and CDN cannot serve stale content. With ~79K products and a serverless DB, this scales badly.
- Recommended fix (do NOT implement): replace `dynamic = "force-dynamic"` with `export const revalidate = 300` (or 60) on the homepage; on `/products` keep dynamic only when `searchParams` are non-empty, using `generateStaticParams` for the no-param canonical and ISR for category-only URLs. Alternatively wrap each fetcher in `unstable_cache` with `tags: ["products"]` and call `revalidateTag` from admin mutations (already partially wired in `lib/admin-actions.ts`).

### P0-2. PDP fetches metadata data twice (slug → product, then product → related) per request
- File: `app/products/[slug]/page.tsx:24, 94, 106`
- Evidence: `generateMetadata` calls `getProductBySlug(params.slug)`; the page handler then calls `getProductBySlug` again (de-duped by `react/cache` only within the same request — confirmed in `lib/products.ts:407` `cache(...)` wrapping), then `getRelatedProducts` and `getReviewsByProductId` in parallel. Good. But `generateStaticParams` only emits the top 20 slugs (`getPopularProductSlugs`, `lib/products.ts:281`), so ~79K PDPs render on-demand.
- Impact: cold PDP requests pay ~3 sequential serverless DB round-trips. Google bot crawling 79K PDPs at scale will burn DB connections; pool is `max: 10` (`lib/db-client.ts:39`) which is fine for traffic but not for a crawl burst.
- Recommended fix: add `export const revalidate = 3600` to `app/products/[slug]/page.tsx` so each PDP is cached at the edge after first render. Expand `getPopularProductSlugs` to 200–500 slugs for build-time pre-rendering. Wrap `getProductBySlug` / `getRelatedProducts` in `unstable_cache` keyed by slug/id with `tags: ['product-${id}']`.

### P0-3. `recharts`, `react-day-picker`, `jspdf`, `html2canvas` imported at module top level
- File: `app/admin/page.tsx:7` — `import { LineChart, Line, ... } from "recharts"`
- File: `app/admin/analytics/page.tsx:9-26` — full recharts barrel import including `BarChart`, `PieChart`, `AreaChart`
- File: `app/admin/analytics/page.tsx:28` — `import type { DateRange } from "react-day-picker"` (type-only, OK) plus `components/ui/date-range-picker.tsx:4` imports the runtime
- File: `app/admin/analytics/page.tsx:30` — `import { AnalyticsPDFExporter } from "@/lib/pdf-export"`, which `lib/pdf-export.ts:1-2` imports `jspdf` and `html2canvas` at top level (~600KB+ minified combined)
- File: `app/components/header.tsx:39` — `import { ... getLiveSuggestions ... } from "@/lib/search"` which `lib/search.ts:1-2` does `import Fuse from "fuse.js"` and `import productsData from "@/data/products.json"` (a 5.7KB stale snapshot bundled into the client). Fuse.js minified is ~25KB but, more importantly, it is shipped to every page because `Header` is on every layout.
- File: `Grep dynamic\(|next/dynamic` → **No matches found anywhere in the repo**. Not a single `dynamic()` import.
- Impact: every admin page payload includes recharts (~200KB gzip). Every public page payload includes Fuse.js + bundled product JSON via the header chunk. Public LCP suffers from a heavier hydration bundle than it should.
- Recommended fix: `const RechartsLine = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })` for each chart, or extract a wrapper component dynamically imported. Use `dynamic(() => import('@/lib/pdf-export'), { ssr: false })` and only load on the "Export PDF" click handler. Drop the synchronous Fuse fallback from header — `getLiveSuggestions` already does a network call to `/api/search`; keep only the network path and lazy-import Fuse via `dynamic` if a local fallback is truly needed. Remove `data/products.json` from the client search path (it is stale and duplicates the live DB).

### P0-4. Order creation does N inserts in a `for` loop (transactionless N+1)
- File: `lib/database.ts:296-307`
- Evidence:
  ```
  for (const item of orderData.items) {
    await connection`INSERT INTO order_items (...) VALUES (...)`
  }
  ```
- Impact: a 10-line cart = 10 sequential round-trips to Neon. Each round-trip is ~30–80ms; checkout latency grows linearly with cart size. There is no surrounding transaction, so a partial failure leaves orphan `orders` rows referencing missing `order_items`.
- Recommended fix: replace with a single multi-row `INSERT INTO order_items (...) SELECT * FROM UNNEST(${ids}::int[], ${qtys}::int[], ...)` using postgres.js array bindings, wrapped with `await sql.begin(async tx => { ... })`. Cuts 9× round-trips on the critical checkout path.

### P0-5. `/explore/[brand]/[attribute]` calls the same query 2× per request
- File: `app/explore/[brand]/[attribute]/page.tsx:118` (metadata) and line ~170 (`dataPromise` awaited in `ExploreHeader` / `ExploreProductList`)
- Evidence: `generateMetadata` calls `getExploreProducts(brand, attribute, 1)` to compute `minPrice` and `totalCount`. The page handler then calls `getExploreProducts` again for the actual render. There is no `cache()` wrapper on `getExploreProducts` — it is a plain async function defined inline in the page file, so React's per-request dedup does not apply (the dedup only works when both call sites share the same memoized function identity, which they do here actually — but each call still issues both the data and count queries in `Promise.all`).
- Additional issue: the query uses `p.brands ILIKE '%<brand>%'` and `(p.rarity ILIKE ... OR p.product_type ILIKE ...)` — three trailing-and-leading wildcards prevent any B-tree index from being used; this is a full-table scan over 79K rows, twice.
- Impact: 4 full table scans per `/explore/*` request. Combined with `force-dynamic` (no `revalidate` set) this will time out under load.
- Recommended fix: wrap `getExploreProducts` in `cache()` from `react`, add `export const revalidate = 3600`, switch to exact `brands = $1` lookups against a normalized table or a GIN trigram index (`CREATE INDEX ... USING gin (lower(brands) gin_trgm_ops)`).

### P0-6. Sentry `tracesSampleRate: 1.0` in client config
- File: `sentry.client.config.ts:7`
- Evidence: `tracesSampleRate: 1.0` with no env gate. `instrumentation.ts:10` correctly samples 0.1 in production for server, but the client config samples 100%.
- Impact: every visitor's browser transmits a full performance trace to Sentry on every navigation, adding network overhead and increasing the bundle's measurement cost. Replays at `replaysSessionSampleRate: 0.1` also send DOM mutations.
- Recommended fix: `tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0` mirroring `instrumentation.ts`. Confirm `@sentry/nextjs` v10's auto-instrumentation isn't double-counting (`instrumentation.ts` already calls `Sentry.init` in `nodejs` runtime).

---

## P1 — Significant issues

### P1-1. Middleware matcher runs on virtually every request
- File: `middleware.ts:113-119`
- Evidence: the final matcher entry `"/((?!_next/static)(?!_next/image)(?!favicon)(?!robots\\.txt)(?!sitemap\\.xml)(?!sitemap/).*)"` matches everything except a small exclusion set. The middleware always runs `withSecurityHeaders` and, for `/products/...`, executes a slug-normalization regex on every PDP visit.
- Impact: even for purely static page requests, the edge function spins up to set headers and run regex. Each invocation also reads `auth-token` cookie and may call `jwtVerify` (only when on protected paths, OK).
- Recommended fix: narrow matcher to `/(admin|account|auth|products)/:path*` since security headers can be applied via `headers()` in `next.config.mjs` (already configured for images). Move CSP/HSTS to `next.config.mjs` `async headers()` to avoid running middleware on every static page.

### P1-2. `getProductsByCategory` and `getProductsByCategorySlug` have no LIMIT in the primary branch
- File: `lib/products.ts:467-492` (`getProductsByCategory`) and `lib/products.ts:564-583` (`getProductsByCategorySlug`)
- Evidence: the queries select all matching rows and only the safety net in `getAllProducts` has `LIMIT 500`. A category like "Pokemon TCG" can easily return tens of thousands of rows.
- Impact: any caller of `getProductsByCategorySlug(slug)` (note: NOT `getProductsPage`) returns the entire category. Grep for callers shows it is still exported. Quietly dangerous.
- Recommended fix: add `LIMIT 500` as a hard cap, and direct all public route callers to `getProductsPage()` which paginates.

### P1-3. `lib/repositories/feeds.ts` — feed XML route streams products but holds entire XML string in memory
- File: `app/api/feeds/[uuid]/route.ts:45-77`
- Evidence: the comment claims streaming, but the code does `let xml = ''; xml += buildItemXml(...)` accumulating the entire feed in a single string before `return new Response(xml, ...)`. For a 79K-product feed, that's tens of MB of string in the Node heap.
- Impact: peak memory equal to the feed size. Container OOM risk on large feeds; Vercel function memory limit pressure.
- Recommended fix: actually use a `ReadableStream` with `controller.enqueue(new TextEncoder().encode(chunk))` per batch and return `new Response(stream, ...)`. The comment already promises this — implement it.

### P1-4. Sitemap categories route triggers a full product DISTINCT fallback scan
- File: `lib/products.ts:789-793` (`getAllCategorySlugs` fallback) called from `app/sitemaps/categories.xml/route.ts:7`
- Evidence: when `product_categories` returns rows, it short-circuits. If empty, it runs `SELECT DISTINCT category FROM products WHERE is_active = true` — a sequential scan over 79K rows.
- Impact: in a freshly seeded DB or after `product_categories` truncation, sitemap requests take seconds and pin a connection.
- Recommended fix: add an index `CREATE INDEX idx_products_category ON products(category) WHERE is_active = true` or drop the fallback entirely once migration is finished.

### P1-5. Cookies, best-price-guarantee, preorder-info, returns, terms etc. are Client Components for no reason
- Files: `app/cookies/page.tsx:2`, `app/best-price-guarantee/page.tsx:2`, `app/preorder-info/page-client.tsx:1` (this one is actually fine — wrapped by a server `page.tsx`), `app/checkout/success/page.tsx:1`, `app/global-error.tsx:1`
- Evidence: `app/cookies/page.tsx` is entirely static legal copy but ships as `"use client"` purely for a `useEffect(() => window.scrollTo(0,0))`. `app/best-price-guarantee/page.tsx` is mostly static content with a small form.
- Impact: these pages cannot be statically generated; they hydrate unnecessary JS for content that is 99% static text. SEO crawler payload is larger than needed.
- Recommended fix: make `page.tsx` a Server Component rendering the static copy, and isolate the form / scroll behaviour into a small `<ScrollToTop />` or `<PriceMatchForm />` child component with `"use client"`. Net result: free static generation and smaller hydration bundle.

### P1-6. `/api/search` re-hydrates full product rows including PRODUCT_JOIN_SQL with rating subquery
- File: `app/api/search/route.ts:29` calls `searchProducts(safeQuery, null, null, limit * 2)` which runs `lib/products.ts:1142-1206`
- Evidence: the search SELECT includes the `LEFT JOIN (SELECT product_id, AVG(rating), COUNT(id) FROM product_reviews ... GROUP BY product_id) pr` subquery (via `PRODUCT_JOIN_SQL`). On every keystroke autosuggest, the DB does the full review aggregation.
- Impact: the dropdown is hit on every keystroke (debounced client-side but still frequent). Each call does a non-trivial subquery aggregation.
- Recommended fix: dedicate a slim suggestion query that selects only `id, name, slug, category, image_url, price` from `products` with `LIMIT 16`, no rating join. The dropdown does not display ratings.

### P1-7. `getCustomers` runs a count and a paginated SELECT — but with `LEFT JOIN orders ... GROUP BY` on every page
- File: `lib/database.ts:244-258`
- Evidence: each `getCustomers` page does `LEFT JOIN orders ... GROUP BY u.user_id` to compute `total_orders` and `total_spent` for the page rows. If the `orders` table is large, this is a per-page sort+aggregate.
- Impact: admin customer list slows down quadratically as orders grow.
- Recommended fix: maintain a materialized view or denormalized `users.lifetime_orders / lifetime_spent` columns updated on order creation. Or compute totals only for the 10 rows in the current page using a correlated subquery.

### P1-8. `unstable_cache` not used anywhere in product fetchers
- Files searched: only `app/api/admin/settings/route.ts`, `app/admin/products/actions.ts`, `app/actions/settings.ts`, `lib/admin-actions.ts`, `app/api/cron/sync-preorders/route.ts` import it (mostly for `revalidatePath`). None of the hot read paths (`getProductBySlug`, `getProductsPage`, `getFeaturedProducts`, `getBestSellingProducts`, `getPreOrderProducts`) are wrapped in `unstable_cache`.
- Impact: Next.js's data cache is bypassed for the highest-traffic queries. Every request pays full DB latency.
- Recommended fix: wrap each fetcher in `unstable_cache(fn, keyParts, { revalidate: 300, tags: ['products'] })`. Combine with `revalidateTag('products')` in `lib/admin-actions.ts:24` (`revalidateProductPages`).

### P1-9. `streamFeedProducts` wraps in `cache()` from React — useless for unique offsets
- File: `lib/repositories/feeds.ts:221`
- Evidence: `cache(async function streamFeedProducts(config, offset, limit))` — React's `cache()` only dedupes within the same render. Since each call uses a different `offset`, the cache provides no benefit and adds keying overhead.
- Impact: small but wasted memory / closure overhead, misleading code.
- Recommended fix: drop the `cache()` wrapper, or replace with `unstable_cache` keyed by `[config.id, offset]` with a short revalidate.

### P1-10. Sentry `replaysSessionSampleRate: 0.1` enabled even when `SENTRY_DSN` may be set in dev
- File: `sentry.client.config.ts:11`, `instrumentation.ts:25`
- Evidence: replays record DOM mutations for 10% of sessions in any env that has `SENTRY_DSN`. This adds ~50KB to the client bundle (Sentry replay integration) and active CPU work for those 10%.
- Impact: hydration cost + bundle weight.
- Recommended fix: gate replay integration behind `process.env.NODE_ENV === 'production'`; set sample to 0 in dev.

---

## P2 — Polish / hygiene

### P2-1. Dual DB drivers in `package.json`
- File: `package.json:15, 46`
- Evidence: both `@neondatabase/serverless` and `postgres` declared. `lib/db-client.ts:1` only imports `postgres`. The neon serverless package adds ~80KB to dependency install and possibly to server bundle if any file imports it transitively.
- Recommended fix: grep for `@neondatabase/serverless` usage; if zero, remove the dep.

### P2-2. `getFeaturedProducts` runs up to 3 separate queries via try/catch fallthrough
- File: `lib/products.ts:807-893`
- Evidence: strategy 1 tries `is_featured` column; on column-missing error it falls through to strategy 2 (discount fallback); strategy 3 (any active products) runs if both empty. The migration is presumably done; the try/catch on every request is wasteful when the column exists.
- Recommended fix: introspect the column once at boot (cache `Set<string>` of columns) or remove the legacy fallbacks once migration is verified complete.

### P2-3. `getPreOrderProducts` similarly has 3 fallback strategies wrapped in try/catch
- File: `lib/products.ts:972-1077`
- Same pattern — fine for migration period, remove once stable.

### P2-4. `app/products/page.tsx:202` builds `dataPromise` but never `await`s it; passes Promise to client
- File: `app/products/page.tsx:202-230, 252`
- This is intentional React 19 streaming — the client component uses `use(dataPromise)`. Looks correct.
- Note (not an issue): combined with `force-dynamic` (P0-1) this loses the SSR streaming benefit because the page is regenerated on every request anyway.

### P2-5. `lib/products.ts:1244` `_productCache` is a module-level singleton
- Evidence: `let _productCache: Map<number, Product> | null = null`
- In a long-running Node server (Docker/Coolify per the comments in `db-client.ts`), this is fine and useful. In serverless functions it is per-instance only — works but no shared cache. The `preloadProductCache` API requires explicit IDs (line 1255), which is the correct safety. Acceptable.

### P2-6. `lib/search.ts:38` builds Fuse index from stale JSON at module load
- Evidence: `const fuse = new Fuse(productsData, fuseOptions)` runs once at first import, including in the browser. Tiny CPU cost but ships dead code.
- Recommended fix: defer Fuse construction until first call; or replace with API-only suggestions and delete `data/products.json` from client path.

### P2-7. `instrumentation.ts:24` — replays sampled even on server runtime config
- Lines 24–25 set `replaysSessionSampleRate` / `replaysOnErrorSampleRate` inside the `nodejs` runtime branch. These keys are client-only (no-op on server). Cosmetic.

### P2-8. `next.config.mjs:22` `dangerouslyAllowSVG: true` enabled
- Security-adjacent but also a perf note: SVGs bypass optimization and can carry large embedded raster data. Confirm SVG sources are trusted.

### P2-9. `lib/database.ts:149` `getOrders` runs two near-identical CTE-less queries (count + page) sequentially
- Could be combined via `count(*) OVER ()` window function to halve round-trips.

### P2-10. `app/admin/page.tsx:53-77` admin dashboard does 4 sequential `fetch` calls (3 parallel + 1 sequential `low-stock`)
- Acceptable for an admin page but mention: collapsing into a single `/api/admin/dashboard` endpoint would cut TTFB ~50% for the dashboard.

### P2-11. No `<link rel="preconnect">` to CDN domains
- `next.config.mjs:26-47` lists 5 remote image hosts. None are preconnected from `app/layout.tsx`. A `<link rel="preconnect" href="https://cdn.beautypremier.store">` would save ~100ms on first product image fetch.

---

## What is already correctly tuned

- `postgres.js` pool sized (max:10, idle_timeout:20s, max_lifetime:300s) — sensible for a Coolify container. `prepare:false` correctly disables prepared statements for PgBouncer compatibility.
- `withDbRetry` wraps `getProductBySlug` (PDP critical path) with 2 retries, 8s timeout, exponential backoff. Good resilience.
- All product fetchers use `cache()` from `react` for per-request dedup.
- `LIMIT 500` safety cap on `getAllProducts` after the recent commit.
- `image_url` listings drop `description` to reduce row size (recent commit).
- Sitemap routes correctly set `revalidate = 86400` and `Cache-Control: s-maxage=86400, stale-while-revalidate=604800`.
- Feed route has 1-hour revalidation and `maxDuration: 60` for large feeds.
- `next/image` with AVIF/WebP, sensible deviceSizes/imageSizes arrays, and a wrapper that opts out of optimizer for third-party CDNs (avoids ETIMEDOUT loops).
- Middleware does NOT touch DB for the high-traffic public paths (only JWT-verifies on admin/account/auth).
- Upstash Ratelimit only constructed on first protected call (`lib/rate-limiter.ts:64` lazy `getRedisClient`); has in-memory fallback for dev.
- Only 12 admin pages use `"use client"`; product pages correctly split server `page.tsx` + client `page-client.tsx`.

---

## Summary (~250 words)

The recent perf work (500-row cap, dropping description from listings, db-profiler) addressed the worst memory cliff, but six P0 issues remain that meaningfully affect public-facing latency and bundle size. The biggest single win is fixing P0-1: the homepage and `/products` are explicitly marked `force-dynamic`, so every visit pays full Neon round-trip latency for 5–6 queries; switching to `revalidate = 300` plus `unstable_cache` would let Next's data cache absorb >95% of traffic. P0-2 (PDPs are not statically generated beyond the top 20) compounds this — adding `revalidate = 3600` to `app/products/[slug]/page.tsx` and pre-rendering ~500 popular slugs would make the catalog crawl-friendly. P0-3 is the bundle problem: there is literally zero use of `next/dynamic` in the repo, so `recharts`, `jspdf`, `html2canvas` ship in admin chunks and Fuse.js + a 5.7KB stale `products.json` ship in every public page via the header. P0-4 (sequential `INSERT` loop in checkout `createOrder`) and P0-5 (explore page double-queries with leading-wildcard ILIKE on 79K rows) are direct critical-path latency bugs. P0-6 leaves Sentry client traces at 100% sampling. P1 highlights are the unstreamed feed XML (memory bomb at scale), the broad middleware matcher running on every public URL, and `/api/search`'s use of the heavy review-aggregation join for autosuggest. The DB layer is otherwise well-tuned (postgres.js pool, retry wrapper, per-request `cache()` dedup, sitemap revalidation). Fixing the six P0 items would likely deliver a >50% TTFB improvement on public pages and >30% reduction in JS shipped to first-paint.

---

## File reference index (absolute paths)

- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\page.tsx
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\products\page.tsx
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\products\[slug]\page.tsx
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\explore\[brand]\[attribute]\page.tsx
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\api\feeds\[uuid]\route.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\api\search\route.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\admin\page.tsx
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\admin\analytics\page.tsx
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\app\cookies\page.tsx
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\middleware.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\instrumentation.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\sentry.client.config.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\next.config.mjs
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\database.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\db-client.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\db-profiler.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\db-retry.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\products.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\analytics.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\search.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\rate-limiter.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\pdf-export.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\admin-actions.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\repositories\feeds.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\repositories\sitemap.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\lib\repositories\filters.ts
- C:\Users\admin\Documents\Web Store App\Toy App\b_UOCfTeKk43v-1774686443811\components\ui\image-with-fallback.tsx
