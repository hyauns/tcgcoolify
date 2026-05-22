# 07 — Code Quality Audit (Legacy & Duplication)

Scope: read-only review focused on duplication, legacy code smells, type safety, and error-handling consistency. Other agents handle unused-code, deps, perf, SEO, and security — findings overlap only where unavoidable.

Repo root: `C:/Users/admin/Documents/Web Store App/Toy App/b_UOCfTeKk43v-1774686443811/`

---

## 1. Duplicate code patterns

### 1.1 Two Postgres drivers in active use — High

`package.json:15` declares `"@neondatabase/serverless": "latest"` and `package.json:46` declares `"postgres": "^3.4.9"`. Application code (`lib/db-client.ts:1`) uses only `postgres`:

```ts
// lib/db-client.ts:1
import postgres from "postgres"
```

`@neondatabase/serverless` is imported only from disposable root scripts (`db-query.js:1`, `create-feed.js:1`) and never from anything in `lib/`, `app/`, `hooks/`, or `middleware.ts`. The comment block at `lib/db-client.ts:5-19` explicitly explains the move away from the Neon HTTP driver to `postgres.js` for the Coolify Docker target.

- **Severity:** High (dead dependency, ~MB-class install bloat, confuses future contributors about which driver is canonical)
- **Suggestion:** Remove `@neondatabase/serverless` from `dependencies` and delete `db-query.js` / `create-feed.js` (see 2.1 below). Coordinate with the deps agent.

### 1.2 Two JWT libraries — High

Both `jsonwebtoken` and `jose` are used:

- `jose` — `middleware.ts:2` (`import { jwtVerify } from "jose"`). Required because the Next.js Edge runtime forbids `jsonwebtoken` (Node `crypto`).
- `jsonwebtoken` — `app/api/auth/login/route.ts:7` (`sign`), `app/api/auth/session/route.ts:5`, `app/api/orders/complete/route.ts:5`, `lib/auth-guard.ts:13` (all `verify`).

The duplication is *partially* justified (Edge vs Node runtime), but the sign/verify logic should be centralized:

```ts
// lib/auth-guard.ts:34-41 — verifies tokens
function getJwtSecret(): string { … }
// app/api/auth/login/route.ts:14-17 — re-reads JWT_SECRET inline
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) { … }
// app/api/orders/complete/route.ts:15-25 — getOptionalSession() reimplements verify+cookie read
```

Three near-identical "read cookie, verify token, type as SessionPayload" blocks. The signing path (`login/route.ts:7`) is the only `sign()` caller — moving sign+verify into one helper would make a future jose-only migration mechanical.

- **Severity:** High (security-sensitive code duplicated → any fix to one path silently diverges)
- **Suggestion:** Create `lib/jwt.ts` with `signSession`, `verifySession`, `getOptionalSession`. Keep `middleware.ts` on `jose` (Edge constraint) but call a shared `verifyEdgeSession` from the same module using runtime-conditional import. Eventually drop `jsonwebtoken`.

### 1.3 `/payment-and-orders` vs `/payment-orders` — Low

`app/payment-and-orders/page.tsx` is the real 396-line component. `app/payment-orders/page.tsx` is a 12-line shim:

```tsx
// app/payment-orders/page.tsx:1-12
import { Metadata } from 'next'
import PaymentOrdersPage from '../payment-and-orders/page'
export const metadata: Metadata = {
  title: 'Payment & Orders | TCG Lore',
  alternates: { canonical: 'https://www.tcglore.com/payment-and-orders' },
}
export default PaymentOrdersPage
```

It exists purely to keep an old URL alive with a canonical pointing at the real page. This is fine functionally but creates a maintenance hazard — re-exporting a default Server/Client Component across route segments is brittle in App Router (any later "use client" change to the source page will affect both routes silently).

- **Severity:** Low
- **Suggestion:** Replace `app/payment-orders/page.tsx` with a `redirects` entry in `next.config.mjs` (`{ source: '/payment-orders', destination: '/payment-and-orders', permanent: true }`) and delete the route entirely.

### 1.4 `getSqlConnection()` helper duplicated 15 times — High

This 4-line try/catch wrapper is reimplemented verbatim across the codebase:

```ts
function getSqlConnection() {
  try { return getSql() } catch { return null }
}
```

Occurrences:

- `lib/products.ts:91`
- `lib/admin-actions.ts:48`
- `lib/repositories/feeds.ts:70`
- `lib/repositories/sitemap.ts:11`
- `lib/repositories/reviews.ts:15`
- `lib/repositories/filters.ts:11`
- `app/actions/settings.ts:8`
- `app/cart/actions.ts:5`
- `app/api/cart/route.ts:10`
- `app/api/webhooks/gateway/route.ts:10`
- `app/api/account/addresses/route.ts:8`
- `app/api/account/addresses/[addressId]/route.ts:8`
- `app/api/orders/complete/route.ts:54`

Plus two arrow-style copies:

- `lib/analytics.ts:3` — `const getSqlConnection = () => getSql()` (note: no try/catch, **inconsistent behavior**)
- `lib/database.ts:3` — `const getSqlConnection = () => getSql()` (same inconsistency)

The two `lib/analytics.ts` and `lib/database.ts` versions silently throw rather than returning `null`, so error-handling assumptions break depending on which file the caller is in.

- **Severity:** High (real behavioral inconsistency, not just style)
- **Suggestion:** Export `getSqlSafe()` from `lib/db-client.ts`, delete all 15 local copies, and pick one contract (recommended: return `null` on connection failure — matches the more common variant).

### 1.5 Repository layer half-finished — Medium

`lib/repositories/` was clearly an in-flight migration from the monolithic `lib/database.ts`:

- `lib/repositories/feeds.ts` (387 lines) — well-factored
- `lib/repositories/filters.ts` (112 lines)
- `lib/repositories/reviews.ts` (56 lines)
- `lib/repositories/sitemap.ts` (65 lines)

But `lib/database.ts:72` still exposes the `adminDb` god-object with `getStats`, `getRevenueData`, `getTopProducts`, `getOrders`, `getCustomers`, etc., and `lib/products.ts` (1,307 lines) still owns all product reads. The repository pattern was started but only ~25% complete.

- **Severity:** Medium (architectural debt)
- **Suggestion:** Either finish the migration (`lib/repositories/products.ts`, `lib/repositories/orders.ts`, `lib/repositories/customers.ts`, `lib/repositories/admin-stats.ts`) or remove `lib/repositories/` and put everything back. The current split makes "where does product data live?" ambiguous.

### 1.6 Context providers — Low (pattern is fine, one outlier)

Files: `lib/auth-context.tsx` (60 lines), `lib/cart-context.tsx` (338), `lib/category-context.tsx` (32), `lib/cookie-consent-context.tsx` (242), `lib/wishlist-context.tsx` (215). All follow the same `createContext` + `Provider` + `useX()` shape.

`lib/auth-context.tsx:1-16` is a thin re-export shim:

```tsx
export { useAuth } from "@/hooks/use-auth"
export type { User, AuthState } from "@/hooks/use-auth"
```

with a comment explaining "rather than editing every import". This is fine but adds an extra indirection and a permanently-misleading filename (it doesn't define a context anymore).

- **Severity:** Low
- **Suggestion:** Do a codemod to point every `from "@/lib/auth-context"` to `from "@/hooks/use-auth"` and delete the shim. The Address/Order/OrderItem types at `lib/auth-context.tsx:18-58` should move to `lib/types/account.ts`.

---

## 2. Legacy code smells

### 2.1 Root-level junk scripts — Critical

Five disposable `.js` files sit at the repo root, none of them referenced by `package.json` scripts, Dockerfile, CI, or any other source file. Grep for their filenames yields zero hits outside `_audit/`:

- `audit-products.js` (uses `node-fetch` which is **not** in `package.json` — broken)
- `create-feed.js` (8 lines, one-shot Neon insert)
- `db-query.js` (8 lines, one-shot SELECT)
- `fix_others.js` (29 lines — a mass `fs.writeFileSync` codemod that wraps repository functions in `cache()`; was clearly a one-time refactor)
- `fix_products.js` (27 lines — same idea applied to `lib/products.ts`)

**Two of these leak production database credentials in plaintext:**

```js
// db-query.js:2  AND  create-feed.js:2
const sql = neon('postgresql://neondb_owner:npg_8BrKlzA7iUeW@ep-old-night-amnklcih.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require');
```

- **Severity:** Critical (production credentials in tracked source — `git log` will preserve them even after deletion; rotate the password)
- **Suggestion:** Delete all five files immediately. Rotate the Neon password. Add `*.local.js`, `fix_*.js`, `db-query.js` to `.gitignore`. The bare-minimum scratch directory `scratch/` already exists — use it for future one-offs.

### 2.2 Mixed hook filename conventions — Low

`hooks/` directory mixes two conventions:

- `hooks/useProductFilters.ts` (camelCase)
- `hooks/use-auth.tsx` (kebab-case)
- `hooks/use-analytics.ts` (kebab-case)
- `hooks/use-toast.ts` (kebab-case)

Three vote kebab-case, one votes camelCase. `useProductFilters.ts` is the outlier.

- **Severity:** Low
- **Suggestion:** Rename `useProductFilters.ts` → `use-product-filters.ts` and update the single import site (`app/products/page-client.tsx` per the convention). Add a brief NOTE to `CLAUDE.md` (or equivalent) stating "hooks use kebab-case".

### 2.3 Files over 500 lines — Medium/High

| File | Lines | Notes |
|---|---|---|
| `app/checkout/page.tsx` | **2,678** | Single `"use client"` component handling form state, address autocomplete, payment selection, tax calc, order submission. Highest-risk file in the repo. |
| `lib/products.ts` | 1,307 | 14 exported `cache(async function ...)` data accessors. Split candidates: queries, mappers, sort-SQL constants. |
| `app/products/[slug]/page-client.tsx` | 1,157 | PDP UI — tabs, image gallery, reviews, related products all inlined. |
| `app/returns/page.tsx` | 934 | Static marketing page. |
| `app/shipping/page.tsx` | 933 | Static marketing page. |
| `app/checkout/components/payment-processing-modal.tsx` | 825 | |
| `app/page-client.tsx` | 776 | Home page hero + featured + bestsellers + preorders inlined. |
| `app/cart/cart-page-client.tsx` | 760 | |
| `app/products/page-client.tsx` | 753 | |
| `app/preorder-info/page-client.tsx` | 683 | |
| `app/best-price-guarantee/page.tsx` | 661 | |
| `app/admin/analytics/page.tsx` | 659 | |
| `app/account/page.tsx` | 647 | |
| `app/checkout/success/page.tsx` | 643 | |
| `app/components/header.tsx` | 591 | |
| `app/admin/feeds/page.tsx` | 589 | |
| `lib/email/send-email.ts` | 503 | |

- **Severity:** High for `app/checkout/page.tsx` (2.6k LOC client component is genuinely dangerous to modify); Medium for the rest.
- **Suggestion:** Break `checkout/page.tsx` into `<CheckoutForm>`, `<ShippingStep>`, `<PaymentStep>`, `<ReviewStep>` with state lifted into a single reducer. For static marketing pages (`returns`, `shipping`, `best-price-guarantee`), extract section components — they are mostly JSX with no shared state.

### 2.4 `lib/generated/prisma/` is orphaned — High

Contents: `browser.ts`, `client.ts`, `commonInputTypes.ts`, `enums.ts`, `internal/`, `models.ts`, `models/`, plus a Windows-only native binary `query_engine-windows.dll.node`.

- **Zero imports**: `grep "lib/generated/prisma"` and `grep "@prisma/client"` across `**/*.{ts,tsx,js,mjs,json}` (excluding `node_modules`, `.next`, `_audit`) return no matches.
- **Schema source**: `prisma/schema.prisma` exists but `package.json` has no `prisma generate`, no `postinstall` hook, no `prisma:*` scripts, and `@prisma/client` is not a declared dependency.
- The `.node` binary is platform-locked to Windows and would fail in the Docker/Coolify build.

This was almost certainly an abandoned ORM evaluation. It currently contributes 0 runtime value and bloats the Docker image / repo.

- **Severity:** High (dead code that ships in `git`, will trip up future contributors who assume Prisma is used)
- **Suggestion:** Delete `lib/generated/` and `prisma/schema.prisma`. If keeping schema-as-documentation has value, move `schema.prisma` to `docs/` and add a top-of-file comment "REFERENCE ONLY — runtime uses raw postgres.js via lib/db-client.ts".

### 2.5 TODO / FIXME / HACK / XXX — Low

Only one match across the codebase (excluding `node_modules`, `.next`, generated):

- `lib/payment-security.ts:258` — `// TODO: Re-enable enforcement there after Paygate testing is complete.`

- **Severity:** Low (single stale TODO)
- **Suggestion:** Either resolve (re-enable the enforcement) or convert to a GitHub issue and remove the comment.

### 2.6 `console.log` in non-test source — Medium

106 `console.log/warn/error` occurrences across 24 files including `lib/products.ts`, `lib/db-profiler.ts`, `lib/email/send-email.ts`, `app/api/auth/login/route.ts`, `app/api/orders/create/route.ts`, `app/api/webhooks/gateway/route.ts`, `app/api/checkout/process/route.ts`. Most are intentional structured logs guarded by `process.env.NODE_ENV !== "production"` (e.g. `lib/products.ts:296-298`), which is the correct pattern. Sentry is installed (`@sentry/nextjs` per `package.json:29`) but the codebase doesn't route operational errors through it — it relies on `console.error`.

- **Severity:** Medium
- **Suggestion:** Pipe error-path logs through a thin `lib/logger.ts` wrapper that delegates to `Sentry.captureException` server-side and `console.error` in dev. Webhook and order routes (`webhooks/gateway/route.ts`, `orders/create/route.ts`, `checkout/process/route.ts`) are the highest-priority targets — silent webhook failures are debugging nightmares.

---

## 3. Type safety

### 3.1 `any` usage — Medium

99 occurrences of `: any` or `as any` across 45 `.ts`/`.tsx` files. Top offenders:

| File | Count |
|---|---|
| `lib/database.ts` | 12 |
| `app/api/admin/db-stats/route.ts` | 6 |
| `app/products/page-client.tsx` | 5 |
| `app/page-client.tsx` | 4 |
| `app/checkout/success/page.tsx` | 4 |
| `lib/analytics.ts` | 4 |
| `lib/email/send-email.ts` | 3 |
| `app/explore/[brand]/[attribute]/page.tsx` | 3 |
| `lib/sales-generator.ts` | 3 |
| `app/api/orders/create/route.ts` | 3 |
| `app/api/orders/complete/route.ts` | 3 |
| `app/admin/products/admin-product-edit-sheet.tsx` | 3 |

Concrete examples:

```ts
// lib/database.ts:11-12  — Customer.address typed `any`
address?: any
// lib/database.ts:68-69  — Order shipping/billing untyped
shipping_address?: any
billing_address?: any
// lib/database.ts:118  — row mapper
return result.map((row: any) => ({ … }))
// lib/repositories/sitemap.ts:53
return rows.map((r: any) => ({ … }))
```

The `row: any` pattern is the most common — it bypasses every type guarantee `postgres.js` could give back.

- **Severity:** Medium (concentrated in DB mapping layer where types matter most)
- **Suggestion:** Define `interface DbXxxRow` types (the pattern is already used in `lib/products.ts:54` with `DbProductRaw`) and cast at the boundary. Forbid `any` going forward via an ESLint rule.

### 3.2 `@ts-ignore` / `@ts-expect-error` — None

Zero matches across the codebase. Good.

---

## 4. Error-handling consistency — Medium

Three patterns coexist with no apparent rule:

**Pattern A — swallow and return empty**
```ts
// lib/products.ts:282-300, lib/repositories/sitemap.ts:38-64, lib/repositories/feeds.ts:85-115
try { … } catch (e) {
  if (process.env.NODE_ENV !== "production") console.error(…)
  return [] // or null
}
```

**Pattern B — return `{success, error}` object**
```ts
// lib/auth-database.ts (4 sites), lib/admin-actions.ts (3 sites), lib/email/send-email.ts (7 sites)
return { success: false, error: "..." }
```

**Pattern C — throw**
```ts
// lib/auth-guard.ts:38-41, lib/db-client.ts:33, lib/env.ts (2 sites), lib/payment-security.ts (6 sites)
throw new Error("…")
```

The same logical operation (DB read failure) is treated differently in `lib/products.ts` (return `[]`) vs `lib/database.ts` (will throw because `getSqlConnection` at `database.ts:3` doesn't catch). Callers can't tell from the type signature which pattern applies.

- **Severity:** Medium
- **Suggestion:** Standardize: throw for unexpected/infra errors (DB down, JWT misconfigured), return `Result<T, E>`-style objects for validation failures (already done in `auth-database.ts`), and never silently swallow in API routes. The `Result<T>` shape from `lib/email/send-email.ts` is the best existing model.

---

## 5. Pages with both server and client variants — OK (with one exception)

Six pairs follow the documented Next.js App Router pattern: server component handles `metadata` + data fetching, passes serialized props to a `"use client"` sibling:

- `app/page.tsx` (server, 40+ lines of metadata + 3 data fetches) → `app/page-client.tsx` (776 lines, `"use client"`)
- `app/products/page.tsx` → `app/products/page-client.tsx` (753 lines)
- `app/products/[slug]/page.tsx` → `app/products/[slug]/page-client.tsx` (1,157 lines)
- `app/preorder-info/` (same pattern)
- `app/admin/products/` (same pattern)
- `app/admin/reviews/` (same pattern)

This is idiomatic Next.js 14 — flagged as Medium only because the client halves are oversized (see 2.3). The split itself is correct.

**Exception:** `app/checkout/page.tsx:2` is `"use client"` at the top level (2,678 lines, no server companion). Metadata is missing for the page, and the order-submission logic runs entirely client-side. This is the inverse of the pattern used everywhere else.

- **Severity:** Medium (inconsistency + missing SEO metadata on a critical funnel page; the client-only architecture also forces every `useState` hook to hydrate before checkout works)
- **Suggestion:** Introduce `app/checkout/page.tsx` (server, `noindex` metadata) and rename current file to `app/checkout/checkout-client.tsx`. Then break it down per 2.3.

---

## Summary

Examined ~50 representative files plus targeted greps across the repo. Headline duplication: `getSqlConnection()` is reimplemented 15 times with subtly different error semantics (High), two JWT libraries duplicate sign/verify across four routes (High), two Postgres drivers ship to production with only one used at runtime (High). Headline legacy: five root-level `.js` scratch scripts including `db-query.js:2` and `create-feed.js:2` which contain hardcoded Neon production credentials (`npg_8BrKlzA7iUeW`) — **Critical, rotate immediately**. `lib/generated/prisma/` ships a Windows DLL and a full client for an ORM the codebase never imports (High). `app/checkout/page.tsx` at 2,678 lines is a single client component handling the entire purchase flow — highest-risk file to modify (High). `lib/products.ts` at 1,307 lines and the half-finished `lib/repositories/` split create ambiguity over the data-access boundary (Medium). Type safety is acceptable (99 `any` uses, zero `@ts-ignore`) but the row-mapper layer leaks `any` consistently — fixable with `DbXxxRow` types already modeled in `lib/products.ts:54`. Error handling mixes throw / swallow-return-null / `{success,error}` with no convention. Routes `/payment-orders` → `/payment-and-orders` should become a `next.config.mjs` redirect. Merge recommendation for the codebase as-is: **BLOCK** until the credential leak in `db-query.js` / `create-feed.js` is purged and the password rotated; everything else is normal refactoring debt.
