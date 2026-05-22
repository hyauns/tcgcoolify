# 02 — Unused Code Audit

Date: 2026-05-22
Mode: READ-ONLY (no files deleted / edited).

Scope: `app/`, `lib/`, `components/`, `hooks/`, `app/components/`, plus `public/` asset scan.

Search exclusions: `node_modules`, `.next`, `_audit`, `db_backups`, `scratch`, `tmp`.

Methodology: ripgrep for basename, exported symbol name, and `from "..."` path patterns. For Next.js App Router, files that match conventions (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx`, `robots.ts`, `sitemap.*`, `instrumentation.ts`, `middleware.ts`, `sentry.*.config.ts`, `template.tsx`, `default.tsx`, `opengraph-image.tsx`, `icon.tsx`, `manifest.ts`) are NOT flagged as unused even with zero static importers — they are auto-loaded by the framework.

---

## A. Files with 0 importers (non-convention)

### A1. `app/components/delivery-calculator.tsx`
- type: component (React)
- evidence:
  - `rg "DeliveryCalculator"` shows only the export site + self-reference. No `import { DeliveryCalculator }` anywhere.
  - `rg "from .*['\"][^'\"]*components/delivery-calculator['\"]"` -> 0 importers (only `enhanced-delivery-calculator.tsx` and `delivery-calculator.tsx` self-reference `@/lib/delivery-calculator`, not this file).
  - The component that IS used everywhere is `EnhancedDeliveryCalculator` from `app/components/enhanced-delivery-calculator.tsx`.
- risk: client component, no dynamic-import string match. Pure DOM widget.
- classification: **SAFE TO REMOVE**

### A2. `app/components/product-verification-modal.tsx`
- type: component (React)
- evidence:
  - `rg "product-verification-modal"` -> 0 matches outside the file itself.
  - `rg "ProductVerificationModal"` -> not found anywhere (the file exports a default/named component but nothing imports it).
- risk: client modal, no dynamic-import reference.
- classification: **SAFE TO REMOVE**

### A3. `app/checkout/components/payment-processing-modal.tsx`
- type: component (React)
- evidence:
  - `rg "PaymentProcessingModal"` finds 4 matches: 2 inside this file's own export, and 2 inside `app/checkout/page.tsx` that are an INLINE component definition (`const PaymentProcessingModal = () => {...}` at line 1186 and `<PaymentProcessingModal />` at line 2671 — not an import).
  - `rg "payment-processing-modal"` (filename) -> 0 importers.
  - Top of `app/checkout/page.tsx` confirms no import of `./components/payment-processing-modal`.
- risk: superseded by an inline duplicate inside `checkout/page.tsx`.
- classification: **SAFE TO REMOVE**

### A4. `components/theme-provider.tsx`
- type: component (provider wrapper around `next-themes`)
- evidence:
  - `rg "theme-provider"` -> only the file itself.
  - `rg "ThemeProvider"` -> only the file itself (declaration, no imports).
  - `next-themes` provider is not wired into `app/layout.tsx` or `app/providers.tsx`.
- risk: low — it's a thin wrapper; no `next-themes` usage exists in app yet.
- classification: **SAFE TO REMOVE**

### A5. `lib/email-service.tsx`
- type: lib (legacy email facade)
- evidence:
  - `rg "email-service"` -> 0 importers anywhere.
  - File internally re-exports from `lib/email/send-email.ts`, but no consumer imports this re-export shim. All call sites (`api/webhooks/gateway`, `api/checkout/process`, `api/auth/forgot-password`) import directly from `@/lib/email/send-email`.
- risk: legacy backward-compatibility shim that nothing actually uses.
- classification: **SAFE TO REMOVE**

### A6. `lib/email-templates.tsx`
- type: lib (HTML email template strings)
- evidence:
  - `rg "email-templates"` -> 0 importers.
  - `rg "getPasswordResetTemplate|getEmailVerificationTemplate"` (exports) -> 0 importers other than the file itself.
  - Modern templates live under `lib/email/templates/*.tsx` (React Email) and ARE used by `lib/email/send-email.ts`.
- risk: legacy raw-HTML templates replaced by the React Email system.
- classification: **SAFE TO REMOVE**

---

## B. Files with 0 static importers, BUT Next.js convention or external entry

These are NOT safe to remove without checking — listed for completeness:

### B1. `app/payment-orders/page.tsx`
- type: page (App Router)
- evidence: contents is `import PaymentOrdersPage from '../payment-and-orders/page'` then re-exports. No `Link href="/payment-orders"` anywhere in the codebase (`rg "/payment-orders"` -> 0 in app/, only the file itself + `sitemaps/core.xml` references `/payment-and-orders`).
- risk: may be a legacy redirect URL still present in external links (Google index, emails). Removing would 404 those.
- classification: **NEEDS VERIFICATION**

### B2. `app/auth/demo-reset/page.tsx`
- type: page
- evidence: `rg "demo-reset"` -> 0 references anywhere in the repo.
- risk: convention file (auto-routed) but no internal navigation. Possibly used by manual QA / demo flow.
- classification: **NEEDS VERIFICATION**

### B3. `app/api/health/route.ts`, `app/api/health/db/route.ts`, `app/api/version/route.ts`
- type: api route
- evidence: `rg "/api/health"` and `rg "/api/version"` -> 0 in-repo callers.
- risk: typically hit by external uptime monitors, Coolify health checks, or k8s probes. The `Dockerfile`/`vercel.json` may rely on these — do not remove.
- classification: **NEEDS VERIFICATION** (likely **DO NOT TOUCH** if used by `COOLIFY_DEPLOYMENT.md`).

### B4. `app/api/cron/sync-preorders/route.ts`
- type: api route
- evidence: triggered by a cron platform (Vercel cron / Coolify). Not directly imported.
- classification: **NEEDS VERIFICATION**

### B5. `app/api/admin/test-email/route.ts`, `app/api/admin/db-stats/route.ts`
- type: api route (diagnostic)
- evidence: no in-repo callers, but they are admin tooling endpoints invoked manually from a browser or curl.
- classification: **NEEDS VERIFICATION**

---

## C. Unused named exports inside used files

### C1. `lib/admin-actions.ts` -> `updateProduct`
- evidence: `rg "\\bupdateProduct\\b"` returns only `lib/admin-actions.ts` itself (1 file). The only imported symbol from `@/lib/admin-actions` is `revalidateProductPages` (used by `api/admin/products/revalidate/route.ts` and `api/admin/orders/[id]/route.ts`).
- classification: **NEEDS VERIFICATION** — server actions can sometimes be invoked via `<form action={...}>` references; double-check the admin UI doesn't reference it dynamically before removing.

---

## D. Unused public/ assets

Method: `rg "<filename>"` excluding node_modules/_audit/db_backups.

| Asset | Hits in source | Classification |
|---|---|---|
| `public/placeholder-logo.png` | 0 | **SAFE TO REMOVE** |
| `public/placeholder-logo.svg` | 0 | **SAFE TO REMOVE** |
| `public/placeholder-user.jpg` | 0 | **SAFE TO REMOVE** |
| `public/images/trustwave.png` | 0 | **SAFE TO REMOVE** |
| `public/images/positivessl.png` | 0 | **SAFE TO REMOVE** |
| `public/images/credit-cards.png` | 0 | **SAFE TO REMOVE** |
| `public/images/edge-eternities-bundle.webp` | only in `data/products.json` (static seed) | **NEEDS VERIFICATION** — referenced by seed JSON but not actually served from `<Image src=...>` in any rendered component; `data/products.json` is itself only used as a Fuse.js fallback in `lib/search.ts`/`lib/product-filters.ts`. |
| `public/images/tarkir-dragonstorm-bundle.webp` | only in `data/products.json` | **NEEDS VERIFICATION** (same reason) |
| `public/images/tarkir-play-boosters.webp` | only in `data/products.json` | **NEEDS VERIFICATION** (same reason) |
| `public/placeholder.svg` | 12 hits (`image-with-fallback.tsx`, many pages) | KEEP |
| `public/placeholder.png` | 1 hit (cart-page-client) | KEEP |
| `public/logo.png` | used in layout/header/footer + skills md | KEEP |
| `public/images/visa.svg`, `mastercard.svg`, `amex.svg`, `discover.svg` | used in checkout/footer/payment pages | KEEP |
| `public/images/lock-icon.png` | used in `cart-page-client.tsx` | KEEP |
| `public/images/shield-verified.png` | used in `cart-page-client.tsx`, `product-verification-modal.tsx` | KEEP (note: if A2 is removed, recheck) |
| `public/images/Pokemon.png`, `Magic.png`, `Yugioh.png`, `One Piece.png`, `Digimon Card.png`, `Star Wars Unlimited.png`, `Disney Lorcana.png`, `Flesh and Blood.png` | referenced in `app/page-client.tsx` brand grid | KEEP |

---

## E. Confirmed in use (sample, for transparency)

These had 0 obvious importers at first glance but were verified used:

- `app/components/demo-account-banner.tsx` -> imported by `app/account/page.tsx`.
- `app/components/password-reset-demo.tsx` -> imported by `app/auth/forgot-password/page.tsx`.
- `app/components/formatted-description.tsx` -> imported by `app/products/[slug]/page-client.tsx` and `quick-view-modal.tsx`.
- `app/components/rarity-badge.tsx` -> imported by 6 files.
- `app/components/manage-cookies-button.tsx` -> imported by `app/components/footer.tsx`.
- `app/components/footer-social.tsx` -> imported by `app/components/footer.tsx`.
- `app/components/social-icons.tsx` -> imported by `footer-social.tsx` and `admin/settings/components/BrandingSettings.tsx`.
- `app/components/scroll-to-top.tsx` -> imported by `app/providers.tsx`.
- `app/components/trustpilot-widget.tsx` -> imported by `app/page-client.tsx`.
- `app/components/analytics-wrapper.tsx` -> imported by `app/layout.tsx`.
- `app/components/quick-view-modal.tsx` -> imported by 3 page-clients + header.
- `app/components/hero.tsx`, `add-to-cart-popup.tsx`, `write-review-modal.tsx`, `enhanced-delivery-calculator.tsx`, `header.tsx`, `footer.tsx` -> all imported.
- `hooks/use-toast.ts`, `hooks/use-auth.tsx`, `hooks/useProductFilters.ts`, `hooks/use-analytics.ts` -> all imported.
- `components/ui/*` -> all imported (calendar/popover only via `date-range-picker`, which is imported by `app/admin/analytics/page.tsx`).
- `lib/*-context.tsx` (`auth`, `cart`, `wishlist`, `category`, `cookie-consent`) -> all used in `app/providers.tsx` or downstream.

---

## F. Out of scope per audit rules (DO NOT TOUCH)

The following are explicitly out of scope per the brief — listed for completeness, not analyzed:

- `middleware.ts`
- `instrumentation.ts`
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `lib/payment-security.ts`
- `lib/auth-context.tsx`, `lib/auth-database.ts`, `lib/auth-guard.ts`
- `lib/csrf.ts`
- `lib/rate-limiter.ts`
- `lib/database.ts`, `lib/db-client.ts`, `lib/db-retry.ts`, `lib/db-profiler.ts`
- `app/api/webhooks/**`
- `app/api/checkout/**`
- `app/api/orders/**`
- All admin server-action files (`app/actions/settings.ts`, `app/admin/products/actions.ts`)

---

## Summary counts

- **SAFE TO REMOVE** (component/lib files): 6
  - `app/components/delivery-calculator.tsx`
  - `app/components/product-verification-modal.tsx`
  - `app/checkout/components/payment-processing-modal.tsx`
  - `components/theme-provider.tsx`
  - `lib/email-service.tsx`
  - `lib/email-templates.tsx`
- **SAFE TO REMOVE** (public assets): 6
  - 3 placeholder-* in `public/`
  - `images/trustwave.png`, `images/positivessl.png`, `images/credit-cards.png`
- **NEEDS VERIFICATION**: 5 route/page convention files + 1 named export (`updateProduct`) + 3 webp bundle images
- **DO NOT TOUCH**: security / payment / webhook / auth / db / sentry / middleware (as listed)
