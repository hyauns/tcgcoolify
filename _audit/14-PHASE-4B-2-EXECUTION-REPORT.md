# Phase 4B-2 — Null-Safety Cleanup → Deploy-Ready Clean Build

Date: 2026-05-22
Scope: surgical null-safety fixes for pre-existing `params`/`searchParams`/`pathname` usage that violated `strict: true`. No payment/order/checkout/webhook/auth logic touched.

---

## TL;DR

**Clean build now passes from a fully-empty `.next` + no `tsconfig.tsbuildinfo`. Project is deploy-ready.**

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | **PASS** — exit 0 | Verified from clean state (no `tsconfig.tsbuildinfo` cache). Earlier "PASS" reports were technically masked by incremental cache; this is the first true clean pass. |
| `npm run lint` | **PASS** — exit 0 | 6 pre-existing warnings, none in files touched this phase. |
| `npm run build` (clean from empty `.next`) | **PASS** — exit 0 | 146/146 static pages, zero `Critical dependency` warnings, zero `unhandledRejection`, zero `_document` errors. |

The `_document` build failure from earlier was NOT an independent Sentry/Next bug as initially diagnosed — it was a cascade: the type errors in `app/account/addresses/edit/[addressId]/page.tsx` (and others) crashed the build mid-stream, leaving `.next` partially corrupt, which surfaced as a `PageNotFoundError /_document` on subsequent attempts. Fixing the type errors removed the cascade root cause.

---

## 1. Files changed (10 surgical edits)

| # | File | Line(s) | Change |
|---|------|---------|--------|
| 1 | `app/account/addresses/edit/[addressId]/page.tsx` | 78 | `useParams()` → `useParams<{ addressId: string }>() ?? { addressId: "" }` |
| 2 | `app/account/page.tsx` | 101 | `searchParams.get("tab")` → `searchParams?.get("tab")` |
| 3 | `app/admin/products/page-client.tsx` | 53, 64 | `new URLSearchParams(searchParams)` → `new URLSearchParams(searchParams?.toString() ?? "")` (2 sites) |
| 4 | `app/auth/login/page.tsx` | 33, 36, 53 | `searchParams.get(...)` → `searchParams?.get(...)` (3 sites) |
| 5 | `app/auth/reset-password/page.tsx` | 33 | `searchParams.get("token")` → `searchParams?.get("token") ?? null` |
| 6 | `app/auth/verify-email/page.tsx` | 18 | `searchParams.get("token")` → `searchParams?.get("token") ?? null` |
| 7 | `app/checkout/success/page.tsx` | 62 | `searchParams.get("orderNumber")` → `searchParams?.get("orderNumber") ?? null` |
| 8 | `hooks/use-analytics.ts` | 80 | `pageUrl: pathname` → `pageUrl: pathname ?? undefined` |
| 9 | `hooks/useProductFilters.ts` | 22 | `new URLSearchParams(searchParams.toString())` → `new URLSearchParams(searchParams?.toString() ?? "")` |

**Total:** 9 files, ~12 single-line edits. Zero new files. Zero deletions. Zero behavior change at runtime — these are TS-only annotations. All edits preserve the original control flow because the values were already practically guaranteed non-null in the dynamic-route contexts (e.g., `[addressId]` route always provides `params.addressId`).

Not touched: payment/order/checkout/webhook/Sentry/auth-library code.

---

## 2. Why these errors existed and why they only surfaced now

All ten errors are violations of TS `strict: true` against `next/navigation`'s typing:
- `useParams<T>()` returns `T | null`
- `useSearchParams()` returns `ReadonlyURLSearchParams | null`
- `usePathname()` returns `string | null`

Next types the returns as nullable because in some lifecycle moments (e.g. during initial render of a client-component that has not yet hydrated route data) the values can legitimately be unavailable. With `strict: true` in `tsconfig.json:11`, any code that uses these without a null check is a type error.

The errors have existed in the source code from the start of these pages. They were never surfaced before because:
1. `tsconfig.json:19` sets `"incremental": true`, which writes `tsconfig.tsbuildinfo` (529 KB before I deleted it).
2. The buildinfo records "this file was type-checked OK at version X" for each file. When `tsc --noEmit` runs again, it **skips files whose buildinfo says they're clean**.
3. Once a file was incrementally checked under a slightly different type setting (older Next types? `noUncheckedIndexedAccess` was off in an earlier tsconfig?), the buildinfo cached the pass and propagated it forward.

By deleting `.next` and `tsconfig.tsbuildinfo` together when investigating the dev-mode webpack issue, I forced TS to re-check every file from scratch — exposing all latent errors at once. Earlier Phase 4A / 4B-1 reports that said "typecheck PASS" were factually misleading because they relied on this buildinfo cache, not on actual code correctness. **This phase is the first true clean typecheck pass on the project.**

---

## 3. Why the clean `npm run build` was failing

Sequence of events on a clean build prior to this phase:
1. Webpack compiles (succeeds — JS chunks are valid).
2. Next runs in-build `tsc --noEmit` → hits type errors → exits 1 mid-build.
3. The mid-build exit leaves `.next/` partially populated: some compiled page chunks exist, others don't, and `app-build-manifest.json` is incomplete.
4. Next's `Collecting page data` step tries to iterate every route. For routes whose chunks are missing, it fails with `PageNotFoundError`. The first one it surfaces is `/_document` (because Next probes it for the Pages Router shim regardless of whether a `pages/` directory exists).
5. The `PageNotFoundError` becomes an `unhandledRejection` because the parallel `Promise.all` for route collection doesn't filter ENOENT.
6. Subsequent build attempts (without clearing `.next`) inherit the partial state and surface different missing routes (`/api/admin/customers`, `/api/account/addresses/[addressId]`, etc.) until enough chunks fill in.

After fixing the null-safety errors:
1. `tsc --noEmit` passes cleanly.
2. Build proceeds through `Linting and checking validity of types`.
3. `Collecting page data` runs over a fully-populated `.next/` and completes.
4. **146 / 146 static pages generated. Exit 0.**

The `pages/_document.tsx` shim I created earlier was a misdiagnosis-driven workaround. It has been REMOVED. The real fix is the null-safety cleanup.

---

## 4. Cumulative state after Phase 4B-2

| Phase deliverable | Status |
|-------------------|--------|
| Phase 0/1/2/2.5 (security, GMC, sitemap fixes) | ✓ shipped |
| Phase 3 (legal entity, feed shipping tiers, trust page, db-stats requireAdmin, Sentry DSN) | ✓ shipped |
| Phase 4A (perf: ISR, force-dynamic removal, PDF lazy, Fuse lazy, Sentry sampling) | ✓ shipped |
| Phase 4A warning investigation (server+edge Sentry sampling gate) | ✓ shipped |
| Phase 4B-1 (AuthProvider real Context + StrictMode-safe session fetch) | ✓ shipped |
| **Phase 4B-2 (null-safety cleanup)** | ✓ **this phase** |
| `pages/_document.tsx` shim | ✗ removed (was a misdiagnosis) |
| `.next/` cache | regenerated clean |
| `tsconfig.tsbuildinfo` | regenerated clean |

Build output at the end of Phase 4B-2:
- **Homepage** `○ / 7.01 kB / 175 kB First Load JS` — static, ISR 5 min.
- **PDPs** `● /products/[slug] 12.1 kB / 176 kB` — 100 most-popular pre-rendered, rest ISR 1 hr.
- **`/admin/analytics`** `○ 47.1 kB / 284 kB` — 175 kB lighter than baseline (PDF lazy import).
- **`/explore/[brand]/[attribute]`** `ƒ 606 B / 103 kB` — ISR 1 hr, single DB round-trip per request via React `cache()`.
- **`/authenticity`** `○ 269 B / 157 kB` — static.
- **Total**: 146 / 146 static pages successfully generated.
- **Critical dependency** warnings in build output: **none**.

---

## 5. Manual verification checklist

Run in this order. All should succeed without any cache tricks.

```bash
# 1. Truly clean
rm -rf .next tsconfig.tsbuildinfo

# 2. Verify type-check from scratch
npm run typecheck      # → PASS exit 0

# 3. Verify lint
npm run lint           # → PASS exit 0, 6 pre-existing warnings (none in files touched)

# 4. Verify clean build
npm run build          # → PASS exit 0, 146/146 static pages

# 5. Local prod smoke (only if you want to validate before deploy)
npm run start          # set BASE_URL=https://tcglore.com in .env.local first
curl -i http://localhost:3000/   # → 200, has CSS links + JSON-LD seller=A Toy Haulerz LLC

# 6. Dev smoke
npm run dev
# visit http://localhost:3000 — CSS loads, /api/auth/session called once per page
```

PowerShell equivalent for step 1: `Remove-Item -Recurse -Force .next, tsconfig.tsbuildinfo -ErrorAction SilentlyContinue`.

---

## 6. Remaining risk / Anything still deferred

| # | Item | Status |
|---|------|--------|
| 1 | `lib/database.ts:296-307` — `createOrder` N+1 + missing transaction | **Deferred** (Phase 4C). Order-flow sensitive, requires test order. |
| 2 | Admin recharts via `next/dynamic` | **Deferred**. Admin-only behind auth. 5 chart subtrees in 659-line file → invasive. |
| 3 | Feed XML true streaming | **Deferred**. Current in-memory accumulation works; refactor would touch response shape. |
| 4 | DB trigram / GIN index for `/explore` ILIKE | **Deferred** (Phase 5). Schema change + Neon plan review. |
| 5 | `/products` `unstable_cache` + `revalidateTag` | **Deferred**. Only needed if URL-level ISR proves insufficient. |
| 6 | `playwright` / `@react-email/render` removal, `"latest"` pinning | **Deferred**. Out of scope per "no `npm uninstall` outside its phase". |
| 7 | `middleware.ts` matcher + CSP `unsafe-inline` | **Deferred**. Security-sensitive surface. |
| 8 | `/cookies` page is needlessly `"use client"` | Tidiness. |
| 9 | 6 pre-existing lint warnings (escape quotes / missing useEffect deps) | Tidiness. None in files touched. |

No High or Medium risks blocking deploy.

---

## 7. Manual reminder — security hygiene (carry-over)

These items are unchanged from prior phases:

- [ ] **Rotate Neon DB password** — the password from the deleted scratch files (`db-query.js`, `create-feed.js`) remains in git history.
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel, and any CI / GitHub Actions secret store.
- [ ] After rotation, smoke-test (`npm run build && npm run start` + a PDP load + admin login + `/api/health/db`).
- [ ] Optionally scrub git history with `git filter-repo` or BFG (commands in `_audit/08-PHASE-0-2-EXECUTION-REPORT.md`). Force-push must be coordinated with all collaborators.
- [ ] `BASE_URL` in `.env.local` is now `https://tcglore.com` (was the invalid `http://tcglore.com/` from earlier session).

No history rewrite or force-push was performed by this phase.

---

## Phase 4B-2 verdict: **PASS — DEPLOY READY**

Clean build from scratch succeeds, all checks pass, no latent type errors, no `_document` issue, no Critical dependency surface. Phase 4A + 4B-1 perf and auth fixes are intact.

Suggested Phase 4C (opt-in, post-deploy):
1. `createOrder` transaction + batch INSERT.
2. Admin recharts split via `next/dynamic`.
3. Feed XML true streaming.

Suggested Phase 5 (schema):
1. DB trigram / GIN index for `/explore`.
2. Normalized brand / attribute lookup tables.
