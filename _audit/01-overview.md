# 01 — Codebase Overview & Junk Inventory

Audit target: `C:/Users/admin/Documents/Web Store App/Toy App/b_UOCfTeKk43v-1774686443811/`
Repo: `tcg-store` (private, Next.js 14 ecommerce). Git branch: `main`. Total tracked files: 462 (`git ls-files | wc -l`).

---

## 1. Tech stack

From `package.json`:

| Concern             | Choice                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| Framework           | **Next.js 14.2.29** (App Router) + React 18                             |
| Language            | TypeScript 5                                                            |
| Styling             | Tailwind 3.4.17 + tailwindcss-animate + Radix UI primitives + lucide-react |
| Database driver     | `@neondatabase/serverless` (latest) + `postgres` 3.4.9 (Neon Postgres)  |
| ORM (declared)      | Prisma schema present (`prisma/schema.prisma`) generating to `lib/generated/prisma`, but no `@prisma/client` runtime dep in `package.json` and no imports outside the generated dir — schema is effectively dead code |
| Auth                | Custom JWT (`jose` 6, `jsonwebtoken`, `bcryptjs`) — verified in `middleware.ts` lines 41-59 |
| Payments            | No payment SDK package — webhook-based `webhooks/gateway`, custom `payment_methods` PCI schema (`database/schema.sql`); CSP allows `js.stripe.com` (`middleware.ts:18`) but no Stripe lib installed |
| Email               | Resend + `@react-email/components`                                      |
| Image / asset storage | Cloudflare R2 via `@aws-sdk/client-s3` (`lib/storage/r2.ts`); `sharp` for resize |
| Rate limit / cache  | `@upstash/ratelimit` + `@upstash/redis`                                 |
| Observability       | `@sentry/nextjs` 10.46, `@vercel/analytics`, `@vercel/speed-insights`   |
| Validation          | `zod` 4                                                                 |
| PDF/export          | `jspdf`, `html2canvas`                                                  |
| Charts              | `recharts`                                                              |
| Dev/test            | `playwright` 1.59 (only in devDeps; no test scripts in `package.json`)  |

### Top-level structure

```
app/            Next.js App Router (pages + API routes + admin)
components/     Shared shadcn-style UI (24 ui/ files + root primitives)
hooks/          4 React hooks
lib/            DB, auth, email, repositories, storage, contexts
scripts/        54 one-off SQL/TS/JS scripts (numbered SQL migrations + ad-hoc check/fix/test scripts)
prisma/         schema.prisma (dead — not used at runtime)
database/       schema.sql (PCI payment-methods schema, not auto-applied)
data/           products.json (5.7 KB seed used by lib/search.ts + lib/product-filters.ts)
public/         static assets
styles/         globals.css (duplicate of app/globals.css?)
types/          google-maps.d.ts
hooks/          4 files
skills/         (Claude skill defs)
_audit/         existing audit reports
```

### File totals (tracked + untracked, on disk)

| Dir            | Files | Notes |
| -------------- | ----- | ----- |
| `app/`         | 135 (`.ts/.tsx/.js/.jsx`) | 41 `page.tsx`, 45 API `route.ts` |
| `lib/`         | 82    | includes 23 MB `lib/generated/prisma/` (untracked, gitignored) |
| `components/`  | 25    | 24 in `ui/` + `theme-provider.tsx`; mirrors with separate `app/components/ui` (empty) |
| `hooks/`       | 4     | `use-analytics.ts`, `use-auth.tsx`, `use-toast.ts`, `useProductFilters.ts` |
| `scripts/`     | 54    | all tracked in git |

---

## 2. Junk / scratch / temp file inventory

`.gitignore` already excludes: `/node_modules`, `/.next/`, `/out/`, `/build`, `*.tsbuildinfo`, `.env*`, `/lib/generated/prisma`, `scratch/`, `db_backups/`, `*.dump`, `*.sql.gz`, `pgsql/`, `tmp/`.

| Path                                   | Size       | What it is                                                                   | Gitignored | git-tracked                          | Verdict   |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------------- | ---------- | ------------------------------------ | --------- |
| `scratch/` (60 files, mix `.ts`/`.js`/`.html`) | 1.2 MB | Ad-hoc migration/check/fix/update TS scripts + 10 scraped `tcglore.com` HTML snapshots (`https___www_tcglore_com_*.html`, biggest is the homepage at 540 KB) | yes (line 33) | no (`git ls-files scratch/` empty) | **SAFE to delete** |
| `tmp/` (7 files)                       | 4.4 MB     | Sitemap snapshots (`sitemap-index.xml`, `categories.xml`, `core.xml`, `products-1.xml` 4.1 MB) and 3 HTML scrapes of payment pages (`payment.html`, `payment-and-orders.html`, `payment-orders.html`, ~126 KB each) | yes (line 41) | no | **SAFE to delete** |
| `db_backups/` (5 dated dirs)           | 94 MB      | Local pg_dump backups from 2026-05-04; biggest dir `2026-05-04_12-15-24/` has `full_backup.dump`, `full_backup.sql`, `data_only.sql`, `schema_only.sql` + zipped copies + SHA256SUMS | yes (lines 36-38) | no | **SAFE to delete** (assuming backups already exist elsewhere) |
| `pgsql/`                               | **1.4 GB** | An entire bundled **PostgreSQL + pgAdmin 4 install** (`pgsql/pgsql/bin`, `share`, `pgAdmin 4`, `StackBuilder`, etc.) accidentally placed inside repo | yes (line 40) | **YES — 120 files leaked** (e.g. `pgsql/pgsql/doc/README-pldebugger.md`, several Python lib LICENSE.md inside pgAdmin's bundled venv) | **SAFE to delete + `git rm`** the 120 already-tracked files |
| `tcglore.com-Coverage-2026-05-10/`     | empty (28 B) | Empty directory (likely leftover from a Google Search Console coverage export) | no | no | **SAFE to delete** |
| `tsconfig.tsbuildinfo` (root)          | 468 KB     | TS incremental build cache | yes (line 26 `*.tsbuildinfo`) | no | **SAFE to delete** |
| `.next/`                               | 917 MB     | Local build artifacts | yes (line 7) | no | **SAFE to delete** (will rebuild) |
| `audit-products.js`                    | 3.9 KB     | Root-level one-shot product audit script, dated May 3 | no | **YES** | **VERIFY → move to `scripts/` or delete** |
| `create-feed.js`                       | 465 B      | Root-level one-shot, dated May 3 | no | **YES** | **VERIFY → likely SAFE delete** |
| `db-query.js`                          | 367 B      | Root-level ad-hoc query, dated May 3 | no | **YES** | **VERIFY → likely SAFE delete** |
| `fix_others.js`                        | 1.1 KB     | Root-level one-shot, dated Apr 24 | no | **YES** | **VERIFY → likely SAFE delete** |
| `fix_products.js`                      | 788 B      | Root-level one-shot, dated Apr 24 | no | **YES** | **VERIFY → likely SAFE delete** |
| `lib/generated/prisma/` (23 MB, incl. `query_engine-windows.dll.node`) | 23 MB | Prisma-generated client; only imports are intra-directory; **no app/lib code imports it** | yes | no | **KEEP only if Prisma will be used**; otherwise **SAFE delete** along with `prisma/schema.prisma` |
| `prisma/schema.prisma`                 | 32 KB dir  | Mirrors `database/schema.sql` tables; no runtime client → unused | no | **YES** | **VERIFY → likely SAFE delete** |
| `database/schema.sql`                  | 12 KB dir  | PCI payment_methods schema; not auto-applied at startup, not imported by code | no | **YES** | **KEEP** (reference / manual migration) |
| `data/products.json`                   | 5.7 KB     | **Actively used** by `lib/product-filters.ts` and `lib/search.ts` (`import productsData from "@/data/products.json"`) | no | **YES** | **KEEP** (or migrate consumers to DB) |
| `app/components/ui/`                   | empty dir  | Empty directory shadowing `components/ui/` | no | no (no tracked files) | **SAFE to delete** |
| `app/api/debug/`, `app/api/payment/`   | empty dirs | No `route.ts` inside | no | no | **SAFE to delete** |

### `scripts/` triage (54 files, all tracked)

**Numbered SQL migrations** — keep as historical record (idempotent migrations could be re-applied):
`01-create-analytics-tables.sql` … `14-feed-preorder-status.sql`, plus `seed-products.sql` (15 files).

**Likely one-shot, candidates for removal** (33 files):
- `check-*.mjs/cjs/ts` (12): `check-active-preorders`, `check-beta-starter`, `check-billing`, `check-categories`, `check-db-connection`, `check-db-stats`, `check-inventory-schema`, `check-payload`, `check-pokemon-pattern`, `check-schema`, `check-slug-column`, `check-top-preorders`, `check-yugioh-past`
- `delete-*.mjs` (4): `delete-pokemon-zero`, `delete-yugioh-past-date`, `delete-yugioh-zero`, `delete-zero-price`
- `fix-*.mjs` (3): `fix-brand-column`, `fix-null-preorders`, `fix-schema-overflows`
- `test-*.{mjs,cjs,ts}` (8): `test-category.cjs`, `test-category.mjs`, `test-full.cjs`, `test-get-preorders.ts`, `test-pdp-lookup.ts`, `test-pwd.ts`, `test-resend-email.ts`, `test-sql.mjs`
- `clear-past-releasedates.mjs`, `null-pokemon-past-date.mjs`, `null-yugioh-past-date.mjs`, `normalize-preorders.mjs`, `widen-order-number.mjs`, `update-image-url.cjs`, `full-schema-audit.mjs`, `audit-product-landing-pages.ts`

**Probable keepers**: `run-sql-file.cjs`, `create-admin-direct.mjs`, `verify-admin.mjs` (operational utilities).

Verdict: ~33 scripts are **SAFE to delete after a quick scan**; numbered SQL + 3 operational utilities should stay.

---

## 3. Routes inventory

### Pages (`page.tsx`, 41 total)

Public marketing: `/about`, `/best-price-guarantee`, `/contact`, `/cookies`, `/faq`, `/preorder-info`, `/preorder-policy`, `/privacy`, `/returns`, `/shipping`, `/terms`, `/` (home).

Commerce: `/cart`, `/checkout`, `/checkout/success`, `/products`, `/products/[slug]`, `/explore/[brand]/[attribute]`, `/wishlist`.

Account: `/account`, `/account/addresses/new`, `/account/addresses/edit/[addressId]`.

Auth: `/auth/{demo-reset, forgot-password, login, register, resend-verification, reset-password, verify-email}` (7 pages).

Admin: `/admin`, `/admin/{analytics, customers, feeds, orders, products, reviews, settings, settings/payments}` (8 pages).

**Legacy / duplicate routes — flagged:**

| Route                  | File                                  | What it is |
| ---------------------- | ------------------------------------- | ---------- |
| `/payment-and-orders`  | `app/payment-and-orders/page.tsx`     | Canonical source (full component) |
| `/payment-orders`      | `app/payment-orders/page.tsx`         | 12-line re-export of `payment-and-orders`, sets canonical to `https://www.tcglore.com/payment-and-orders` (kept for old links) |
| `/payment`             | `app/payment/page.tsx`                | **Near-verbatim copy** of `payment-and-orders/page.tsx` (same imports, same `paymentSteps` array, function renamed `PaymentPage`) — looks like an unintentional duplicate, not a thin redirect |

Recommendation: keep `payment-and-orders` as canonical, leave `payment-orders` as redirect/re-export, and either delete `app/payment/page.tsx` or convert it to a 301 redirect.

### API routes (`route.ts`, 45 total)

Account: `account/addresses`, `account/addresses/[addressId]`, `account/orders`, `account/profile`.

Admin: `admin/analytics`, `admin/analytics/export`, `admin/customers`, `admin/db-stats`, `admin/feeds`, `admin/feeds/[id]`, `admin/low-stock`, `admin/orders`, `admin/orders/[id]`, `admin/products/revalidate`, `admin/reviews/import`, `admin/reviews/[id]`, `admin/settings`, `admin/stats`, `admin/test-email`, `admin/upload`.

Public: `analytics`, `auth/*` (9 endpoints), `cart`, `checkout/process`, `contact`, `cron/sync-preorders`, `feeds/[uuid]`, `health`, `health/db`, `orders/complete`, `orders/create`, `reviews`, `search`, `taxes/calculate`, `version`, `webhooks/gateway`, `wishlist`.

Empty (no `route.ts`): `app/api/debug/`, `app/api/payment/` — likely leftover scaffolding, safe to delete.

---

## 4. Key infra summary

- **`middleware.ts`** (120 lines): JWT verification via `jose`; gates `/admin` (admin role only) and `/account`; sends already-logged-in users away from `/auth/login|register`; rewrites legacy `/products/foo--bar` slugs (double-hyphen → single, 301); applies a full CSP+HSTS+frame-deny security-header set on every response. CSP permits Stripe, Cloudflare Turnstile, Google Maps, Trustpilot, Vercel scripts. `unsafe-inline` is allowed for `script-src`, and `unsafe-eval` only in dev.
- **`instrumentation.ts`** (50 lines): only initializes Sentry if `SENTRY_DSN` is set; sample rate 0.1 in prod, 1.0 in dev; separate init for `nodejs` and `edge` runtimes; the dev `beforeSend` swallows events (`return null`) which is correct for not spamming Sentry, but means dev-stack errors never reach Sentry.
- **`sentry.{client,server,edge}.config.ts`** all present. `sentry.client.config.ts` always inits when `SENTRY_DSN` is set with `tracesSampleRate: 1.0` (no env-aware down-sampling — overrides what `instrumentation.ts` does on the server). Worth aligning.
- **`app/robots.ts`** present (App Router metadata route).
- **Sitemap is NOT `app/sitemap.ts`** — it's custom XML routes:
  - `app/sitemap.xml/route.ts` — sitemap index, 24-hour ISR, `runtime = "nodejs"`, paginates products into `products-N.xml` chunks of 5000 (queries `getTotalActiveProductsCount`).
  - `app/sitemaps/core.xml/route.ts` — static core routes.
  - `app/sitemaps/categories.xml/route.ts` — category URLs.
  - `app/sitemaps/[file]/route.ts` — dynamic `products-N.xml` handler.
  - Note the `middleware.ts` matcher already excludes `sitemap.xml` and `sitemap/` from the catch-all (line 118).
- **`vercel.json`** present at root (not inspected here).
- **No test runner** in `package.json` scripts despite Playwright being installed.

---

## 5. Quick cleanup magnitudes

Estimated reclaimable disk by removing the items above (excluding `.next/` and `node_modules/` which always rebuild):

- `pgsql/`        ~1.4 GB (plus a `git rm` of 120 leaked files)
- `db_backups/`   ~94 MB
- `lib/generated/prisma/` ~23 MB (if Prisma confirmed unused)
- `tmp/`          ~4.4 MB
- `scratch/`      ~1.2 MB
- root junk JS + `tsconfig.tsbuildinfo` ~475 KB
- empty `tcglore.com-Coverage-2026-05-10/`, empty `app/components/ui/`, empty `app/api/{debug,payment}/`

That is **~1.5 GB on disk** plus ~33 stale `scripts/*.mjs|cjs|ts` and ~5 root-level scratch `.js` files that should never have been committed (they are tracked even though their ad-hoc cousins in `scratch/` are correctly ignored).
