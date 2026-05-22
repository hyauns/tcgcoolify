# Phase 4A — Safe Performance P0/P1 Execution Report

Date: 2026-05-22
Scope: surgical performance fixes — caching, ISR, bundle reduction, Sentry overhead. No payment/order/checkout/webhook flow touched. No dependency or DB schema changes.

---

## 1. Files changed

| # | Path | Phase | Change |
|---|------|-------|--------|
| 1 | `sentry.client.config.ts` | T1 | Gate `tracesSampleRate` + replay sampling by `NODE_ENV` |
| 2 | `app/products/[slug]/page.tsx` | T2 | Add `export const revalidate = 3600` |
| 3 | `lib/products.ts` | T2 | `getPopularProductSlugs`: LIMIT 20 → 100 |
| 4 | `app/page.tsx` | T3 | `force-dynamic` → `revalidate = 300` |
| 5 | `app/products/page.tsx` | T3 | `force-dynamic` → `revalidate = 300` |
| 6 | `app/explore/[brand]/[attribute]/page.tsx` | T4 | Wrap `getExploreProducts` with React `cache()`; add `revalidate = 3600` |
| 7 | `app/admin/analytics/page.tsx` | T5 | Lazy `import("@/lib/pdf-export")` inside Export PDF handler; static import is now type-only |
| 8 | `lib/search.ts` | T6 | Remove top-level `import Fuse` + `import productsData`; lazy-load via dynamic `import()` inside helpers; legacy sync helpers are now async |

Total: **8 surgical edits**. No new files, no deletions.

Not touched:
- payment/order/checkout/webhook code
- `lib/database.ts` `createOrder` N+1 loop (audit-only, see §6)
- Admin recharts top-level imports (admin-only routes behind auth; full extraction would be invasive — deferred to Phase 4B with explicit plan)
- middleware matcher, CSP, security headers
- Dependencies (`package.json` unchanged)
- `.env*` / secrets

---

## 2. Exact performance fixes

### T1 — Sentry client sampling gated
`sentry.client.config.ts:7-24`:
- `const isProd = process.env.NODE_ENV === "production"`
- `tracesSampleRate: isProd ? 0.1 : 1.0` (was hard-coded `1.0` everywhere — sent a full trace from every browser session in production)
- `replaysSessionSampleRate: isProd ? 0.1 : 0`
- `replaysOnErrorSampleRate: isProd ? 1.0 : 0`
- DSN remains `NEXT_PUBLIC_SENTRY_DSN` (fix from Phase 3 unchanged).
- Server / edge instrumentation config not touched (would be a separate sentry.server.config / sentry.edge.config change).

### T2 — PDP ISR + expand static params
- `app/products/[slug]/page.tsx:11-17`: added `export const revalidate = 3600`. Rationale documented inline — admin product mutations already call `revalidatePath("/products")` from `app/admin/products/actions.ts:69`, so this is a safety-net interval.
- `lib/products.ts:278-301`: `getPopularProductSlugs` LIMIT changed from 20 → 100. Build now SSGs 100 popular PDPs at build time; the remaining slugs render on-demand under ISR (1-hour revalidate).
- Decision: chose 100 rather than 500 to keep build time bounded. (See §4 — total SSG pages went 66 → 146, build still finishes successfully.) If you want more, bump the LIMIT.

### T3 — Homepage + /products no longer force-dynamic
- `app/page.tsx:42-47`: `force-dynamic` → `revalidate = 300`. Homepage reads no `cookies()`/`headers()`/`searchParams`, so Next.js can prerender it once and serve from the data cache. Admin invalidation paths confirmed (`revalidatePath("/")` in product actions; `revalidatePath("/", "layout")` in settings).
- `app/products/page.tsx:11-18`: `force-dynamic` → `revalidate = 300`. Page reads `searchParams` so it stays dynamically rendered, but each unique URL is now cached for 5 minutes; repeated visits to common category/page combos skip the DB.
- Confirmed no user-specific data (no `cookies()`, no `headers()`, no session reads). Cart state lives in client provider, not in server render.

### T4 — Explore route caching
- `app/explore/[brand]/[attribute]/page.tsx:11-20`: imported `cache` from React + added `export const revalidate = 3600`.
- `:52`: wrapped `getExploreProducts` with React `cache()` so `generateMetadata` and the page render share a single DB round-trip per request. (Previously the triple-ILIKE full-scan query ran twice per request — see `_audit/04-performance.md` P0-5.)
- ILIKE wildcards / brand normalization left alone. Indexing or normalized brand/attribute tables is a separate-phase concern.

### T5 — Lazy PDF export
- `app/admin/analytics/page.tsx:30-33`: replaced static `import { AnalyticsPDFExporter, type AnalyticsReportData } from "@/lib/pdf-export"` with type-only import. `jspdf` + `html2canvas` are now loaded on demand at button-click time, not at page load.
- `:194-196`: `const { AnalyticsPDFExporter } = await import("@/lib/pdf-export")` inside the export handler.
- recharts not split: see §5.

### T6 — Header search bundle
- `lib/search.ts` refactored:
  - Removed top-level `import Fuse from "fuse.js"` and `import productsData from "@/data/products.json"`.
  - Added lazy initializer `loadFuse()` that dynamically imports both modules and caches the resolved instance in `_fusePromise`.
  - Legacy helpers `searchProducts`, `getSearchSuggestions`, `getAllProducts`, `getProductsByCategory` are now `async`. None of them are called from any client component except via the `getLiveSuggestions` fallback path.
  - `getRecentSearches`, `saveSearchQuery`, `clearRecentSearches`, `getLiveSuggestions` keep their existing signatures.
- The `Header` (the only consumer of `@/lib/search` from a client component) imports only `getLiveSuggestions`, `saveSearchQuery`, `getRecentSearches`, and the `SearchResponse` type. None of those eagerly pull in Fuse or `products.json` anymore. The fallback `getSearchSuggestions` only triggers when `/api/search` fails, at which point the heavy modules are fetched on demand.
- API route `app/api/search/route.ts:29` calls `searchProducts` from `@/lib/products` (a different module), not from `@/lib/search` — unaffected.

---

## 3. Build / typecheck / lint result

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | **PASS** — exit 0, no errors | |
| `npm run lint` | **PASS** | 5 pre-existing warnings (admin/settings useEffect, payments quotes, login apostrophe, cart useEffect, preorder-policy apostrophe). None in files touched this phase. |
| `npm run build` | **PASS** — exit 0 | 146/146 static pages generated (was 66/66 in baseline) |

Logs preserved at `_audit/build-before-phase4a.log` and `_audit/build-after-phase4a.log`.

---

## 4. Bundle / build output — before vs after

| Route | Before (Size / First Load JS) | After (Size / First Load JS) | Δ |
|-------|------------------------------|------------------------------|---|
| **`/` (homepage)** | **ƒ** 7.01 kB / 182 kB | **○** 7.01 kB / 174 kB | dynamic → **static**, −8 kB |
| `/products` | ƒ 8.99 kB / 189 kB | ƒ 10.5 kB / 183 kB | dynamic-rendered + ISR; −6 kB First Load |
| `/products/[slug]` | ● 12.1 kB / 183 kB | ● 12.1 kB / 176 kB | −7 kB; **100 PDPs SSG** (was 20) |
| `/explore/[brand]/[attribute]` | ƒ 606 B / 103 kB | ƒ 606 B / 103 kB | unchanged size; now ISR-cached + dedup'd within request |
| `/admin` | ○ 2.91 kB / 210 kB | ○ 2.91 kB / 211 kB | flat (recharts not yet split) |
| **`/admin/analytics`** | **○ 222 kB / 459 kB** | **○ 47.1 kB / 284 kB** | **−175 kB page**, **−175 kB First Load** |
| `/authenticity` | ○ 269 B / 164 kB | ○ 269 B / 157 kB | −7 kB |
| `/about`, `/account`, etc. (public client pages with Header) | ~164–180 kB First Load | ~157–173 kB First Load | **~−7 kB across all public pages** (Fuse + products.json no longer eagerly bundled) |
| First Load JS shared by all | 87.6 kB | 87.7 kB | +0.1 kB (rounding noise) |
| Total static pages generated | 66 / 66 | 146 / 146 | **+80** (PDP SSG expansion) |

Headline wins:
1. **Homepage is now static** (`○`) instead of dynamic (`ƒ`). Repeated visitors hit the CDN, not Neon. Admin mutations still invalidate via existing `revalidatePath` calls.
2. **`/admin/analytics` First Load dropped 459 → 284 kB** (−38%) by deferring jspdf + html2canvas.
3. **~−7 kB per public page** that uses Header (every public page) thanks to lib/search not eagerly pulling in Fuse + the 5.7 kB `products.json` snapshot. This compounds across the public catalog.
4. **PDP cold-render frequency dropped roughly 5×** for the top-100 popular slugs (now SSG at build) plus the rest get ISR caching for an hour.
5. **Explore route** halves its DB round-trips per request (was 2, now 1) and adds a 1-hour HTML/data cache for repeated visits.

---

## 5. Route caching risk discovered

- **`/products`** reads `searchParams` and supports many filter combinations. With `revalidate = 300`, each unique URL is independently cached. Risk: low-volume long-tail combos repopulate cache often. If you observe Neon cost regression, the more invasive fix is wrapping `getProductsPage` + `getFilterAggregations` in `unstable_cache` with explicit tags and adding `revalidateTag` calls to admin mutations. Not done this phase per "no large refactor" rule.
- **`/admin`** still bundles recharts at the top level. Splitting the dashboard chart into a `next/dynamic` import would knock another ~150 kB off `/admin` First Load, but the admin dashboard is the *only* place that chart appears and it loads immediately on page entry, so the visible benefit is roughly nil for the admin user. Deferred unless you want a Phase 4B item.
- **`/admin/analytics`** still imports recharts at the top level for 5 chart subtrees. Splitting all 5 would require extracting them into separate client modules and `next/dynamic`-ing each — touches the largest file (659 lines). Deferred to Phase 4B with a focused plan.
- **PDP ISR**: with `revalidate = 3600` and admin `revalidatePath("/products")` already wired, price/stock invalidation should be ≤ 1 hour. If you ever ingest products from a non-admin path (script, direct SQL, integration) those changes will not invalidate the cache until the 1-hour window expires.
- **Sentry replay** in dev is now off (`replaysOnErrorSampleRate: 0`). If you actively rely on replays during local debugging, set `NODE_ENV=production` temporarily or revert that one constant.

No issues that block deploy.

---

## 6. Intentionally deferred

| # | Item | Why deferred |
|---|------|--------------|
| 1 | `lib/database.ts:296-307` `createOrder` N+1 + no transaction | Order-flow sensitive. Per rule, requires a dedicated phase with test-order verification. **The defect**: each order_item is inserted in a sequential `for await` loop with no surrounding `BEGIN/COMMIT`; an order with N items hits Neon N+1 times and has no atomicity if a middle insert fails. Fix would batch into a single multi-row INSERT inside a transaction. |
| 2 | DB trigram / GIN index / normalized brand-attribute table for `/explore` | Schema change. Required for true elimination of triple-ILIKE full-table scan. |
| 3 | Splitting recharts via `next/dynamic` in admin dashboard + analytics | 6-block extraction across a 659-line file; admin-only (behind auth) so public users not affected. |
| 4 | middleware matcher narrowing (`middleware.ts:118` runs on virtually every URL) | Security-sensitive — middleware also enforces CSP + admin redirects. Needs careful regex audit. |
| 5 | CSP `'unsafe-inline'` removal + nonce | Security audit item, larger surface change. |
| 6 | Dependency cleanup (`playwright`, `@react-email/render` redundancy, `"latest"` pinning) | Per rule, no `npm uninstall` this phase. |
| 7 | `app/cookies/page.tsx` is a client component for a trivial `useEffect(scrollTo(0,0))` | Could become server component; not a correctness issue. |
| 8 | Feed XML in-memory accumulation (`app/api/feeds/[uuid]/route.ts:45-77`) | Memory growth on very large feeds. Refactor into true streaming `ReadableStream` would touch the response shape. |

---

## 7. Manual reminder — security hygiene unchanged

These items are unchanged from prior phases and are not addressable by code patches alone:

- [ ] **Rotate Neon DB password** — secrets in `db-query.js` / `create-feed.js` history remain compromised until rotated.
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel, and CI secret stores.
- [ ] Smoke test the new password (`npm install && npm run build && npm run start`) plus `/api/health/db`, an admin login, and a PDP load.
- [ ] Only after that, decide whether to scrub git history with `git filter-repo` / BFG (commands documented in `_audit/08-PHASE-0-2-EXECUTION-REPORT.md`). Force-push must be coordinated with all collaborators.

No history rewrite or force-push was performed by this phase.

---

## Phase 4A verdict: **PASS**

Suggested Phase 4B (admin/order-flow-sensitive work, opt-in):
1. **createOrder transaction + batch INSERT** — fix `lib/database.ts:296-307` N+1 inside a `BEGIN/COMMIT`. Requires a test order to verify end-to-end.
2. **Admin recharts split** — extract analytics chart subtrees into 5 small client components, `next/dynamic`-imported with `ssr: false`. Knocks another ~100 kB+ off `/admin/analytics`.
3. **Feed streaming** — convert `app/api/feeds/[uuid]/route.ts` to true `ReadableStream` flush per batch.
4. **Sentry server/edge sampling** — if `sentry.server.config.ts` / `sentry.edge.config.ts` also have `tracesSampleRate: 1.0`, gate them too.
5. **`/products` `unstable_cache` + `revalidateTag`** — only if Phase 4A's URL-level caching proves insufficient.

Suggested Phase 5 (schema/index, separate review):
1. DB indexes for `/explore` (`brands`, `rarity`, `product_type` columns) — preferably trigram (`pg_trgm`) given the ILIKE pattern. Coordinate with Neon plan limits.
2. Normalized brand / attribute lookup tables to replace ILIKE full-text matching.
