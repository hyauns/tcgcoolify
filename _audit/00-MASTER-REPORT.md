# Master Audit Report — TCG Lore (Next.js 14 ecommerce)

Date: 2026-05-22
Scope: read-only audit. No files were modified, deleted, or installed/uninstalled.

> Detail per-domain: see [01-overview](01-overview.md), [02-unused-code](02-unused-code.md), [03-dependencies](03-dependencies.md), [04-performance](04-performance.md), [05-seo-gmc](05-seo-gmc.md), [06-security](06-security.md), [07-code-quality](07-code-quality.md).

---

## 0. Top alarms (must address before anything else)

| # | Severity | Issue | File |
|---|----------|-------|------|
| A1 | **CRITICAL — leaked secret** | Hardcoded Neon prod credentials (password token `npg_8BrKlzA7iUeW`) committed in root scratch files | `db-query.js`, `create-feed.js` |
| A2 | **P0 security** | `/api/admin/upload` admin check is commented out — anonymous uploads to R2 | `app/api/admin/upload/route.ts:18-22` |
| A3 | **P0 security** | `/api/admin/settings` PUT/POST has commented-out auth — anonymous defacement + Search Console hijack | `app/api/admin/settings/route.ts:59-128` |
| A4 | **P0 security** | `/api/admin/test-email` bypassable in non-prod; hardcoded fallback `"admin-secret-replace-me"` | `app/api/admin/test-email/route.ts:11-19` |
| A5 | **P0 SEO** | Every `/explore/[brand]/[attribute]` product card links to `/product/{slug}` (singular). PDP route is `/products/{slug}`. Site-wide 404s | `app/explore/[brand]/[attribute]/page.tsx` |
| A6 | **P0 GMC misrepresentation** | PDP JSON-LD declares fake `mpn` (= internal numeric ID) while feed says `identifier_exists=no` — fabricated structured data | `app/products/[slug]/page.tsx`, `lib/repositories/feeds.ts` |
| A7 | **P0 GMC misrepresentation** | Feed defaults missing brand to "TCG Lore" (retailer, not manufacturer) | `lib/repositories/feeds.ts` |
| A8 | **P0 git hygiene** | 120 tracked files inside `pgsql/` (≈1.4 GB local PostgreSQL install) — gitignored too late | `pgsql/**` |

**Action order before any cleanup phase:** rotate the Neon password (A1), patch A2–A4 (one-line guard fixes), purge A1 files from git history.

---

## 1. Codebase overview

- **Framework**: Next.js 14.2.29 (App Router) + React 18 + TS 5.
- **DB**: Neon Postgres via `@neondatabase/serverless` (scripts) + `postgres.js` (runtime). No Prisma at runtime despite `prisma/` schema + `lib/generated/prisma/` (23 MB, untracked).
- **Auth**: custom JWT — `jose` (edge / middleware) + `jsonwebtoken` (node API). bcryptjs(12).
- **Email**: Resend + react-email.
- **Storage**: Cloudflare R2 via `@aws-sdk/client-s3`.
- **Observability**: Sentry (client / server / edge configs).
- **Caching**: Upstash Redis + ratelimit.
- **Sizes**: 135 files in `app/`, 81 in `lib/`, 25 in `components/`, 4 in `hooks/`, 54 in `scripts/`. 41 pages, 45 API routes. 462 git-tracked files.
- **Junk on disk**: `pgsql/` 1.4 GB, `db_backups/` 94 MB, `lib/generated/prisma/` 23 MB, `scratch/` ~50 ad-hoc TS/JS scripts, `tmp/` static snapshots, `tcglore.com-Coverage-2026-05-10/` (Search Console export).
- **Duplicate routes**: `app/payment/page.tsx` is a near-verbatim copy of `app/payment-and-orders/page.tsx`; `app/payment-orders/` is a redirect shim.

---

## 2. Unused files / routes / components

Full per-file evidence in `_audit/02-unused-code.md`.

### 2a. SAFE TO REMOVE (0 importers, 0 dynamic-import string match, not a Next convention file)

| Path | Type | Why safe |
|------|------|----------|
| `app/components/delivery-calculator.tsx` | Component | Superseded by `delivery-calculator-enhanced.tsx`. 0 importers via rg. |
| `app/components/product-verification-modal.tsx` | Component | 0 importers. |
| `app/checkout/components/payment-processing-modal.tsx` | Component | Logic duplicated inline in `app/checkout/page.tsx`. 0 importers. |
| `components/theme-provider.tsx` | Component | Not wired into providers tree (`app/providers.tsx` uses `next-themes` directly). 0 importers. |
| `lib/email-service.tsx` | Lib | Replaced by `lib/email/send-email.ts`. 0 importers. |
| `lib/email-templates.tsx` | Lib | Replaced by `lib/email/templates/*`. 0 importers. |
| `public/placeholder-*.{png,svg}` (3 files) | Asset | 0 grep hits across source. |
| `public/trustwave.png` | Asset | 0 references. |
| `public/positivessl.png` | Asset | 0 references. |
| `public/credit-cards.png` | Asset | 0 references. |
| `lib/admin-actions.ts` — exported `updateProduct` | Named export | 0 callers; sibling exports are still used. |
| `audit-products.js`, `create-feed.js`, `db-query.js`, `fix_others.js`, `fix_products.js` (root) | Scratch | Tracked-but-ignored-pattern equivalents already in `scratch/`. **`create-feed.js` and `db-query.js` contain hardcoded prod credentials — REMOVE FROM HISTORY, not just delete.** |
| `tsconfig.tsbuildinfo` | Build artifact | Should be in `.gitignore`. |

### 2b. NEEDS VERIFICATION (cannot prove unused without external check)

| Path | Type | Why uncertain |
|------|------|---------------|
| `app/payment-orders/page.tsx` | Page | Default re-export; may be backlinked from old emails / GSC index. Recommended: keep as 301 redirect in `next.config.mjs` instead. |
| `app/payment/page.tsx` | Page | Near-duplicate of `payment-and-orders`. Pick the canonical, 301 the others. |
| `app/auth/demo-reset/page.tsx` | Page | Demo flow, possibly used in QA. |
| `app/api/health/*`, `app/api/version/*` | API | Likely called by Coolify / external uptime monitors. |
| `app/api/cron/*` | API | Called by external cron scheduler (Vercel cron or Coolify). |
| `app/api/admin/db-stats/*` | API | Internal diagnostics. |
| `lib/generated/` | Generated dir | Prisma client output. Prisma is in `package.json` neither dep nor scripts. Confirm `prisma generate` is not required at build time. |
| `data/`, `database/` (root dirs) | Mixed | Static seed JSON / SQL — need diff against migrations in `scripts/0X-*.sql`. |
| `lib/repositories/` | Lib | Half-finished split from `lib/products.ts` / `lib/database.ts`. Some files have callers, some may not. |
| `public/<tarkir/edge bundle webp>` (3 files) | Asset | Only referenced in static seed JSON, not in TSX. Verify the JSON is loaded at runtime. |
| ~33 `scripts/*.{mjs,cjs,ts}` matching `check-*`, `delete-*`, `fix-*`, `test-*` | Scripts | One-shot ops. Keep numbered SQL migrations + 3 ops utilities; rest move to `scripts/_archive/` or delete. |

### 2c. DO NOT TOUCH (out of scope per audit rules)

- All of `app/api/webhooks/**`, `app/api/payment/**`, `app/api/orders/**`, `app/api/checkout/**`.
- `middleware.ts`, `instrumentation.ts`, `sentry.{client,server,edge}.config.ts`.
- `lib/payment-security.ts`, `lib/csrf.ts`, `lib/rate-limiter.ts`, `lib/auth-*`, `lib/token-utils.ts`, `lib/password-utils.ts`.
- `lib/database.ts`, `lib/db-client.ts`, `lib/db-profiler.ts`, `lib/db-retry.ts`.
- All `app/admin/**` and `app/api/admin/**`.

---

## 3. Dependencies

Full table in `_audit/03-dependencies.md`.

### 3a. Likely safe to remove

| Package | Type | Evidence |
|---------|------|----------|
| `playwright` | devDep | `rg "from ['\"]playwright"` → 0 results. No `playwright.config.*`, no `tests/` or `e2e/`, no `*.spec.ts` outside node_modules. |

### 3b. Possibly redundant

| Package | Note |
|---------|------|
| `@react-email/render` | Only used transitively via `@react-email/components`. Direct dep can probably be dropped. |

### 3c. NOT duplicates (despite appearance)

- `jose` (edge runtime / middleware) vs `jsonwebtoken` (node) — both required for current architecture.
- `@neondatabase/serverless` (scripts) vs `postgres` (Next runtime) — both required.
- `bcryptjs` is the only bcrypt; no `bcrypt` to dedupe (P1 perf recommendation is to switch, not deduplicate).

### 3d. Stability risk — `"latest"` pins

24 packages pinned to `"latest"`: all 11 `@radix-ui/*`, both `@react-email/*`, `@neondatabase/serverless`, `bcryptjs`, `date-fns`, `fuse.js`, `html2canvas`, `jsonwebtoken`, `jspdf`, `next-themes`, `react-day-picker`, `recharts`, `resend`.

→ Replace with `^x.y.z` ranges derived from `package-lock.json`. **Read-only audit cannot fix this.**

---

## 4. Performance

Full detail in `_audit/04-performance.md`.

### P0

| # | File:line | Issue | Recommended fix |
|---|-----------|-------|-----------------|
| P0-1 | `app/page.tsx:42`, `app/products/page.tsx:12` | `export const dynamic = "force-dynamic"` — every visit pays 5–6 Neon round-trips | Switch to `export const revalidate = 300` + wrap fetchers in `unstable_cache` (currently used **0 times** anywhere) |
| P0-2 | PDP build config | Only top 20 slugs statically generated via `getPopularProductSlugs` → ~79K PDPs render on-demand with no revalidate | Add `revalidate` + ISR; expand `generateStaticParams` for top N |
| P0-3 | repo-wide | `rg "next/dynamic"` → 0 matches. `recharts`, `jspdf`, `html2canvas`, `fuse.js` all imported at module top-level → bloat admin and public bundles | Convert to `dynamic()` with `ssr: false` |
| P0-4 | `lib/database.ts:296-307` | `createOrder` inserts order items in sequential `for await` with NO transaction | Single batch insert + `BEGIN/COMMIT`. **Caveat: this touches order logic — out of audit scope, defer to manual fix.** |
| P0-5 | `app/explore/[brand]/[attribute]/page.tsx` | Same triple `ILIKE '%...%'` full-scan runs twice (generateMetadata + page) | `React.cache()` the fetch or precompute |
| P0-6 | `sentry.client.config.ts:7` | `tracesSampleRate: 1.0` ungated → full trace from every browser | Gate on env (e.g., 0.1 in prod) |

### P1

| # | Issue | File |
|---|-------|------|
| P1-1 | Feed XML claims streaming but accumulates entire string in memory | `app/api/feeds/[uuid]/route.ts:45` |
| P1-2 | Middleware matcher runs on virtually every URL | `middleware.ts:118` |
| P1-3 | `/api/search` calls full review-aggregation join on each autosuggest keystroke | `app/api/search/*`, `lib/search.ts` |
| P1-4 | `lib/search.ts` ships 5.7 KB `products.json` into header (every public page) | `lib/search.ts` |

### P2

- Image `priority` flag distribution across PDP/category pages.
- No `unstable_cache` anywhere → no data cache benefits.
- Sitemap generation not cached.

---

## 5. SEO / Google Merchant Center

Full detail in `_audit/05-seo-gmc.md`. **All of these likely contributed to commit `9b195d4` (GMC misrep removal).**

### Critical (must fix before GMC re-review)

| # | Issue | Evidence |
|---|-------|----------|
| S-C1 | Explore product cards link to `/product/{slug}` (singular). PDP route is `/products/{slug}`. **All explore product cards 404.** | `app/explore/[brand]/[attribute]/page.tsx` |
| S-C2 | PDP JSON-LD asserts `mpn` = internal numeric product ID. Feed says `identifier_exists=no`. Fabricated structured data — GMC misrep. | `app/products/[slug]/page.tsx`, `lib/repositories/feeds.ts` |
| S-C3 | Feed defaults missing brand to `"TCG Lore"` (the retailer). GMC requires the manufacturer. | `lib/repositories/feeds.ts` |
| S-C4 | Preorder status mismatch — feed downgrades preorders whose release date has passed; PDP does not. Availability inconsistent. | feed builder vs PDP renderer |
| S-C5 | Seller identity mismatch: PDP shows "TCG Lore LLC"; legal entity is "A Toy Haulerz LLC". | static text vs site-config |
| S-C6 | Shipping declared on PDP JSON-LD (3 tiers) but absent from feed. | feed builder |

### High

| # | Issue |
|---|-------|
| S-H1 | Three near-identical pages `/payment`, `/payment-and-orders`, `/payment-orders` all crawlable → duplicate content |
| S-H2 | 8 static pages (shipping, returns, privacy, terms, cookies, preorder-info, best-price-guarantee, payment-and-orders) inherit homepage title/desc → site-wide duplicate metadata |
| S-H3 | Host canonical inconsistent — `tcglore.com` vs `www.tcglore.com` |
| S-H4 | Faceted `/products?...` URLs are `index:true` with no noindex |

### Medium

| # | Issue |
|---|-------|
| S-M1 | Missing global `Organization`/`WebSite`/`BreadcrumbList` JSON-LD |
| S-M2 | Sitemap `lastmod` / `changefreq` defaults need review |

---

## 6. Security

Full detail in `_audit/06-security.md`. P0 items also surfaced in §0 alarms.

| Sev | ID | Issue |
|-----|----|-------|
| P0 | SEC-1 | `/api/admin/upload` — no auth, no magic-byte check |
| P0 | SEC-2 | `/api/admin/settings` PUT/POST — no auth |
| P0 | SEC-3 | `/api/admin/test-email` — bypassable + hardcoded fallback secret |
| P0 | SEC-4 | Hardcoded Neon password in `db-query.js`/`create-feed.js` |
| P1 | SEC-5 | Webhook: no timestamp freshness check (`webhooks/gateway/route.ts:60-92`) |
| P1 | SEC-6 | Webhook: no idempotency on `event_id` (`webhooks/gateway/route.ts:101-249`) |
| P1 | SEC-7 | `sentry.client.config.ts` reads server-only `SENTRY_DSN` → client telemetry silently dropped |
| P1 | SEC-8 | `/api/admin/db-stats`, `/api/admin/test-email` use shared CRON_SECRET bearer not `requireAdmin()` |
| P1 | SEC-9 | `/api/admin/reviews/import` no size cap, no Zod, no transaction |
| P1 | SEC-10 | Guest order PII fetched by `orderNumber` alone (`orders/complete/route.ts:128-163`) |
| P1 | SEC-11 | JWT verification not algorithm-pinned (4 sites) |
| P1 | SEC-12 | `bcryptjs` blocks event loop — soft DoS amplifier |
| P2 | SEC-13–21 | CSP `unsafe-inline`, SVG allow, password policy gaps, account enumeration on login, `Referer` fallback CSRF, client-trusted `shippingAmount`, missing `assertSameOrigin` on auth/reviews/analytics POSTs, admin order status no enum, unvalidated `WEBHOOK_SECRET` fallback |
| P3 | SEC-22–36 | Logging hygiene, COOP/COEP, debug paths, etc. |

---

## 7. Phased cleanup plan

Each phase is independently revertable. **Run the checks in §8 before AND after every phase. Do not proceed if any check fails.**

### Phase 0 — SECRET ROTATION (do this first, manually, today)
- [ ] Rotate Neon DB password in Neon console.
- [ ] Update `.env.local` and Coolify/Vercel env vars.
- [ ] Decide: also rotate `JWT_SECRET`, `CRON_SECRET`, `WEBHOOK_SECRET`, Resend API key, Sentry DSN (any of these in scratch files? grep first).
- [ ] `git rm --cached db-query.js create-feed.js audit-products.js fix_others.js fix_products.js`
- [ ] `git filter-repo` (or BFG) to scrub from history.
- [ ] Force-push (coordinate with team; this is one of the few legitimate force-push cases — explicit user authorization required first).

### Phase 1 — Patch P0 security holes (3 routes, ~10 lines of code each)
*Out of strict audit scope (touches admin auth) — flag to user, do not autoexecute.*
- [ ] `app/api/admin/upload/route.ts` — uncomment `requireAdmin()` guard; add `sharp().metadata()` validation; ignore client `?filename=`.
- [ ] `app/api/admin/settings/route.ts` (PUT, POST) — uncomment `requireAdmin()` guard; Zod-validate URL fields.
- [ ] `app/api/admin/test-email/route.ts` — switch to `requireAdmin()`; remove `"admin-secret-replace-me"` literal.

### Phase 2 — SEO/GMC critical fixes (highest business-impact bucket)
- [ ] Fix the `/product/` → `/products/` link in `app/explore/[brand]/[attribute]/page.tsx` (1-line typo).
- [ ] Remove fabricated `mpn` field from PDP JSON-LD (`app/products/[slug]/page.tsx`).
- [ ] Change feed brand fallback from `"TCG Lore"` → omit when unknown (`lib/repositories/feeds.ts`).
- [ ] Align feed preorder status with PDP normalizer.
- [ ] Pick one canonical of `/payment`, `/payment-and-orders`, `/payment-orders` — 301 the other two in `next.config.mjs`.
- [ ] Add per-page `generateMetadata` to the 8 static pages.
- [ ] Settle host canonical (apex vs www) in `lib/site-config.ts`, robots, sitemap, middleware.

### Phase 3 — Junk file purge (low risk)
- [ ] `git rm` tracked files under `pgsql/` (after confirming they truly came from the local PG install).
- [ ] Move `scratch/`, `tmp/`, `tcglore.com-Coverage-2026-05-10/`, `db_backups/` to `.gitignore` (already done) and `git rm --cached` anything still tracked.
- [ ] Move ~33 one-shot scripts in `scripts/` matching `check-*`, `delete-*`, `fix-*`, `test-*` to `scripts/_archive/` (don't delete — they document past data fixes).
- [ ] Add `tsconfig.tsbuildinfo` to `.gitignore`.
- [ ] Remove `prisma/` + `lib/generated/` ONLY after confirming `prisma generate` is not called at build (read `Dockerfile` and Coolify build config first).

### Phase 4 — Unused code removal (medium risk — type/build verify before commit)
- [ ] Delete the 6 files in §2a (component + lib).
- [ ] Delete the 6 unused public assets.
- [ ] Delete `updateProduct` named export from `lib/admin-actions.ts` (verify no string-based dynamic invocation first).

### Phase 5 — Dependency cleanup (low risk)
- [ ] `npm uninstall playwright` (devDep, 0 imports).
- [ ] `npm uninstall @react-email/render` (transitive only).
- [ ] Re-pin all 24 `"latest"` packages to caret-ranged versions matching `package-lock.json` (separate PR — touches many lines but no behavior change).

### Phase 6 — Performance P0s (medium risk — verify with real prod traffic)
- [ ] Add `unstable_cache` to product fetchers; remove `force-dynamic` from home + products listing.
- [ ] Expand `generateStaticParams` for PDPs.
- [ ] Convert `recharts`, `jspdf`, `html2canvas`, `fuse.js` to `dynamic()` imports.
- [ ] Stop shipping `products.json` from `lib/search.ts` into client.
- [ ] Memoize the dual-fetch in `explore/[brand]/[attribute]`.
- [ ] Gate Sentry `tracesSampleRate` on env (0.1 in prod).

### Phase 7 — Security P1s
- [ ] Webhook: add timestamp window + idempotency table.
- [ ] Fix `sentry.client.config.ts` → `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] Pin JWT algorithms to `HS256` on all verify sites.
- [ ] Move `/api/admin/db-stats` + `/api/admin/test-email` to `requireAdmin()`.
- [ ] Cap `/api/admin/reviews/import` length + Zod + transaction.
- [ ] Guest-order token cookie for `/api/orders/complete` GET.
- [ ] Replace `bcryptjs` with `bcrypt` or `@node-rs/bcrypt`.

### Phase 8 — Code quality cleanup (lowest urgency)
- [ ] Consolidate 15 implementations of `getSqlConnection()` into one.
- [ ] Decide canonical between `lib/products.ts` (1307 LoC) vs `lib/repositories/` and finish migration.
- [ ] Consolidate `lib/auth-context.tsx` + `hooks/use-auth.tsx`.
- [ ] Decide canonical of `useProductFilters.ts` (camel) vs `use-analytics.ts` (kebab) naming.

---

## 8. Pre/post-phase verification commands

Run BEFORE starting a phase to capture a clean baseline, then AFTER finishing the phase. Any new failure → revert and investigate.

### Baseline checks (cheap — run every phase)

```bash
# 1. Type check (no emit)
npm run typecheck

# 2. Lint
npm run lint

# 3. Full production build (catches missing imports, undefined exports, route conflicts)
npm run build
```

### After Phase 0 (secret rotation)

```bash
# Confirm no secret left in working tree
git grep -nE "npg_[A-Za-z0-9]+" -- ':!_audit' ':!node_modules' ':!package-lock.json'

# Confirm not in latest commit
git log -p -1 | grep -E "npg_[A-Za-z0-9]+" || echo "clean"

# After filter-repo / force-push: every collaborator must reclone or hard-reset.
```

### After Phase 1 (admin auth patches)

```bash
# Admin guards present
rg "requireAdmin" app/api/admin/upload app/api/admin/settings app/api/admin/test-email

# Smoke: unauthenticated should 401 (run against local dev)
curl -i http://localhost:3000/api/admin/upload?filename=x.jpg -X POST
curl -i http://localhost:3000/api/admin/settings -X PUT -d '{}'
curl -i http://localhost:3000/api/admin/test-email -X POST
```

### After Phase 2 (SEO/GMC)

```bash
npm run build
npm run start &
# PDP renders, JSON-LD has no fake mpn
curl -s http://localhost:3000/products/<known-slug> | grep -E "application/ld\+json" -A 30
# Explore links resolve (no 404)
curl -s http://localhost:3000/explore/<brand>/<attr> | grep -oE 'href="/product[s]?/[^"]+"' | sort -u
# Sitemap + robots + feed parse as XML
curl -s http://localhost:3000/sitemap.xml | head -5
curl -s http://localhost:3000/robots.txt
curl -s http://localhost:3000/api/feeds/<uuid> | xmllint --noout - && echo "feed XML valid"
# 301 redirects on duplicates
curl -I http://localhost:3000/payment
curl -I http://localhost:3000/payment-and-orders
curl -I http://localhost:3000/payment-orders
```

### After Phase 3 (junk purge)

```bash
# Repo size sanity
git count-objects -vH

# No tracked junk
git ls-files | grep -E "^(pgsql/|db_backups/|scratch/|tmp/|tcglore\.com-Coverage)" && echo "STILL TRACKED" || echo "clean"

# Build still works after migration/script reorganization
npm run build
```

### After Phase 4 (unused code)

```bash
# Type check first — many failures here mean a "supposedly unused" file was actually imported
npm run typecheck

# Build catches dead imports
npm run build

# Spot-check pages that touched deleted files
# - delivery calculator: /checkout or /shipping
# - payment processing modal: /checkout flow
# - theme provider: dark/light toggle
npm run start &
# manually click through: /, /products, /products/<slug>, /checkout, /admin
```

### After Phase 5 (dependency cleanup)

```bash
# 1. Wipe and reinstall to catch peer issues
rm -rf node_modules package-lock.json
npm install

# 2. Build
npm run build

# 3. Verify removed packages truly gone
npm ls playwright @react-email/render 2>&1 | grep -E "playwright|render" || echo "removed"
```

### After Phase 6 (performance)

```bash
# Build size comparison — capture BEFORE first
npm run build 2>&1 | tee build-after.log
# Compare First Load JS columns vs the saved before-log

# Bundle analyzer (optional, requires @next/bundle-analyzer)
ANALYZE=true npm run build

# Lighthouse / WebPageTest against prod URL after deploy
# Confirm: home + listings serve from cache after first hit (check Vercel/Coolify cache hit headers)
```

### After Phase 7 (security)

```bash
# Webhook signature still verifies (use a synthetic captured payload + secret)
node scripts/test-webhook-signature.mjs  # may need to write this; do not commit secrets

# JWT algorithm pinned — grep
rg "jwtVerify\(|jwt\.verify\(" lib middleware.ts app | grep -v "algorithms"
# Above should return empty after the fix.

# Sentry client DSN
rg "process\.env\.SENTRY_DSN" sentry.client.config.ts && echo "STILL WRONG" || echo "fixed"
```

### After Phase 8 (code quality)

```bash
npm run typecheck
npm run build
# Smoke through every page that was touched.
```

---

## 9. What was NOT touched (per audit rules)

- No file edited, deleted, moved.
- No `npm install` / `npm uninstall` / `npm update`.
- No database migration or schema change.
- No change to `app/api/{checkout,orders,payment,webhooks}/**` or `lib/payment-security.ts`.
- No change to admin auth logic.
- No access to `.env*` or secret values.
- `git status` should show only the new `_audit/` directory as added.

---

## 10. Suggested execution order

1. **Today**: Phase 0 (rotate secrets) + Phase 1 (admin auth holes). These are real exploit risks, not cleanup.
2. **This week**: Phase 2 (SEO/GMC) — unblocks Google Merchant.
3. **Next**: Phase 3 (junk) → Phase 4 (unused code) → Phase 5 (deps). These are confidence-building, low-risk.
4. **Following sprint**: Phase 6 (perf) + Phase 7 (security P1s).
5. **Continuous**: Phase 8 (code quality) as PR-by-PR refactors.

Each phase should be one PR. Run §8 checks before and after.
