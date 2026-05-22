# Phase 3 Execution Report

Date: 2026-05-22
Scope: GMC Consistency + Raw HTML Policy Visibility + Trust Page (+ db-stats hardening + Sentry DSN fix)

Business context confirmed by owner:
- Legal entity: **A Toy Haulerz LLC**. "TCG Lore" is the brand/store name only.
- Public format: `TCG Lore, operated by A Toy Haulerz LLC`.
- Checkout offers 3 real US shipping tiers: Standard ($9.99, free ≥ $75), Priority ($19.99), Express ($39.99).

---

## 1. Files changed

| # | Path | Phase | Type |
|---|------|-------|------|
| 1 | `app/products/[slug]/page.tsx` | T1 | edit — PDP JSON-LD seller |
| 2 | `lib/env.ts` | T1 | edit — EMAIL_FROM default |
| 3 | `lib/email/send-email.ts` | T1 | edit — 4 subject lines |
| 4 | `lib/email/templates/email-verification.tsx` | T1 | edit — alt + text body |
| 5 | `lib/email/templates/order-confirmation.tsx` | T1 | edit — alt + footer + text body |
| 6 | `lib/email/templates/admin-order-notification.tsx` | T1 | edit — all "Operated by TCG Lore" |
| 7 | `lib/email/templates/welcome.tsx` | T1 | edit — alt + footer + text body |
| 8 | `lib/email/templates/password-changed.tsx` | T1 | edit — alt + footer + text body |
| 9 | `lib/email/templates/password-reset.tsx` | T1 | edit — alt + footer + text body |
| 10 | `app/api/feeds/[uuid]/route.ts` | T2, T3 | edit — add Priority + Express g:shipping; use shared preorder helper |
| 11 | `lib/preorder.ts` | T3 | **NEW** — shared `normalizePreorderFlag` helper |
| 12 | `lib/products.ts` | T3 | edit — use shared helper, simplify date branch |
| 13 | `app/authenticity/page.tsx` | T5 | **NEW** — Authenticity & Trust static page |
| 14 | `app/components/footer.tsx` | T5 | edit — add `/authenticity` link |
| 15 | `app/api/admin/db-stats/route.ts` | T6 | edit — replace CRON_SECRET with `requireAdmin` |
| 16 | `sentry.client.config.ts` | T7 | edit — `SENTRY_DSN` → `NEXT_PUBLIC_SENTRY_DSN` |

Total: **2 new files, 14 edits**.
Not touched: payment/order/checkout/webhook/Shopify-connect logic; database schema; cart actions; auth library internals; admin UI components.

---

## 2. Exact fixes

### T1 — Legal entity / seller consistency

1. **PDP JSON-LD seller** (`app/products/[slug]/page.tsx:174-178`)
   - Before: `seller.name = "TCG Lore LLC"` (which is not a real legal entity).
   - After: `seller.name = "A Toy Haulerz LLC"` with `alternateName = "TCG Lore"`. Matches the Organization JSON-LD in `app/layout.tsx:113-114` which already uses this pattern.

2. **EMAIL_FROM default** (`lib/env.ts:40`)
   - Before: `"TCG Lore Operated by TCG Lore. <orders@email.tcglore.com>"` (find/replace bug — duplicate phrase, broken).
   - After: `"TCG Lore <orders@email.tcglore.com>"`.

3. **Email subjects** (`lib/email/send-email.ts`)
   - 4 subjects had the broken `"TCG Lore Operated by TCG Lore."` phrase. All changed to `"TCG Lore"` (Welcome, Verify, Password reset, Password changed).

4. **Email templates** (6 files under `lib/email/templates/*`)
   - All `<img alt="TCG Lore Operated by TCG Lore Logo">` → `<img alt="TCG Lore Logo">`
   - All in-body `"TCG Lore Operated by TCG Lore."` → `"TCG Lore"`
   - All copyright footers `"© 2026 TCG Lore Operated by TCG Lore. All rights reserved."` → `"© 2026 TCG Lore. Operated by A Toy Haulerz LLC. All rights reserved."`
   - One stray title `"TCG Lore LLC. - Verify Your Email Address"` → `"TCG Lore - Verify Your Email Address"`
   - HTML layouts unchanged; only string content fixed. Tone preserved.

> **What I did NOT touch (per rule):** The Organization JSON-LD in `app/layout.tsx` already uses the correct pattern (`name: "A Toy Haulerz LLC", alternateName: "TCG Lore"`). The public footer/about/terms/privacy/etc. already display the canonical `"TCG Lore is an online trading card store operated by A Toy Haulerz LLC"` phrase — left as-is.

### T2 — Feed shipping tiers

`app/api/feeds/[uuid]/route.ts:230-258`:
- Before: single `<g:shipping>` block (Standard only).
- After: three `<g:shipping>` blocks (Standard $9.99 or $0 if price≥$75 / Priority $19.99 / Express $39.99). All US, USD. Mirrors the three tiers in PDP JSON-LD `shippingDetails` (`app/products/[slug]/page.tsx:185-264`).

### T3 — Centralize preorder normalization

- New file `lib/preorder.ts` exports pure `normalizePreorderFlag(isPreOrderFlag, releaseDate): boolean`.
- `lib/products.ts:222`: inline 13-line block replaced with one call to the helper. Date-formatting logic kept inline (separate concern).
- `app/api/feeds/[uuid]/route.ts:197`: inline 7-line block replaced with one call to the helper.
- Rule preserved exactly per Phase 2.5 traced equivalence table.

**Manual equivalence test** (run via Node, no test framework in repo):

| `is_pre_order` | `release_date` | Expected | Got |
|----------------|----------------|----------|-----|
| false | null | false | ✓ false |
| false | future | false | ✓ false |
| true | null | true | ✓ true |
| true | undefined | true | ✓ true |
| true | future | true | ✓ true |
| true | past | false | ✓ false |
| true | "not-a-date" | true | ✓ true |
| null flag | future | false | ✓ false |

**8/8 PASS.**

### T4 — Raw HTML policy visibility (audit-only; no edits required)

Inspection of every page on the audit list:

| Page | Component type | Content in raw HTML | Verdict |
|------|----------------|----------------------|---------|
| `/shipping` | SERVER | Yes (direct JSX) | PASS |
| `/returns` | SERVER | Yes (direct JSX) | PASS |
| `/terms` | SERVER | Yes (direct JSX) | PASS |
| `/privacy` | SERVER | Yes (direct JSX) | PASS |
| `/contact` | SERVER | Yes (direct JSX) | PASS |
| `/about` | SERVER | Yes (direct JSX) | PASS |
| `/payment-and-orders` | SERVER | Yes | PASS |
| `/preorder-info` | SERVER (delegates to client component for product cards) | Page is server-rendered; preorder products fetched server-side; the static text content lives in the client component but is rendered at SSR pass (Next.js SSRs client components on first request). | PASS |
| `/preorder-policy` | SERVER | Yes | PASS |
| `/faq` | SERVER | Yes (also a JSON-LD FAQ schema) | PASS |
| `/cookies` | CLIENT (`"use client"` only for a trivial `useEffect(scrollTo(0,0))`) | Yes — content is unconditional JSX, not gated by client state, so Next still emits it in SSR HTML | PASS |

Footer link audit (`app/components/footer.tsx`): contains links to **all required policies** — Shipping, Returns, Terms, Privacy, Contact, About, FAQ, Cookies, Best Price Guarantee, Payment, Pre-Orders, Authenticity (added in T5).

> Out of scope but flagged for future: `/cookies` is a client component for no real reason (`useEffect(() => window.scrollTo(0,0))`). Converting to a server component would simplify hydration but is a tidiness refactor, not a correctness issue.

### T5 — Trust / Authenticity page

New file `app/authenticity/page.tsx` (server component, exports `metadata` + canonical URL). Five sections:
1. **Where Our Products Come From** — sourcing language matching the footer's existing copy ("U.S. supplier and distributor networks"). Explicitly states "TCG Lore is an independent online store. We are not an 'official partner,' licensee, or affiliated reseller of any game publisher."
2. **Inspection Before Listing & Shipping** — product identity / condition / packaging / shipping protection. Graded cards wording is conditional ("when applicable, we list the grading company and certification number as shown on the slab"). Sealed-product wording explicitly checks seals/shrink wrap/UPC where applicable.
3. **What We Do Not Claim** — explicit non-claims block (no per-card forensic authentication; no publisher affiliation; no guarantee beyond inspection).
4. **FAQ** — 4 Q&A. Are products authentic / sourcing / wrong item / returns. Cross-links to `/shipping` and `/returns`.
5. **Contact** — email + phone + footer reminder "TCG Lore is an online trading card store operated by A Toy Haulerz LLC."

Footer (`app/components/footer.tsx:104-112`) now links to `/authenticity` under "Customer Service" with label "Authenticity & Trust".

### T6 — `/api/admin/db-stats` security

`app/api/admin/db-stats/route.ts`:
- Removed `process.env.CRON_SECRET` check + `Authorization` header parse.
- Added `import { requireAdmin } from "@/lib/auth-guard"` and replaced the auth check with the standard `const admin = await requireAdmin(); if (admin instanceof NextResponse) return admin;` pattern used by the other admin routes.
- Response shape and SQL queries unchanged. Admin UI continues to work via the session cookie (the same one the admin dashboard already issues).

### T7 — Sentry client DSN

`sentry.client.config.ts`:
- Changed `process.env.SENTRY_DSN` → `process.env.NEXT_PUBLIC_SENTRY_DSN` (the env var Next.js actually inlines into the client bundle, and the one already declared in `lib/env.ts:110`).
- `tracesSampleRate: 1.0` left as-is per rule "không đổi sampling config lớn trong phase này".

---

## 3. Raw HTML policy verification result

**Status: PASS** for all 11 required policy/legal pages.

| Coverage area | Page | Raw-HTML evidence |
|---------------|------|-------------------|
| Shipping rates / timeframes | `/shipping` | Server-rendered (no `"use client"`) — full JSX |
| Return/refund window | `/returns` | Server-rendered — full JSX |
| Terms / legal entity | `/terms` | Server-rendered; mentions "A Toy Haulerz LLC" line 24 |
| Privacy | `/privacy` | Server-rendered; mentions "A Toy Haulerz LLC" line 24 |
| Contact | `/contact` | Server-rendered with form component below |
| Company info | `/about` | Server-rendered |
| Pre-order policy | `/preorder-policy`, `/preorder-info` | Server-rendered |
| Payment & orders | `/payment-and-orders` | Server-rendered |
| FAQ | `/faq` | Server-rendered + FAQ JSON-LD |
| Authenticity (new) | `/authenticity` | Server-rendered (this PR) |
| Footer link to each | `app/components/footer.tsx` | All present |

No content was invented. The Authenticity page sourcing language exactly mirrors the footer's existing wording. No fake authentication claims.

---

## 4. Feed / PDP shipping consistency result

**Status: PASS.** Both sources now declare the same three US tiers with the same prices and the same free-shipping threshold:

| Tier | PDP JSON-LD (`app/products/[slug]/page.tsx`) | Feed XML (`app/api/feeds/[uuid]/route.ts`) |
|------|----------------------------------------------|---------------------------------------------|
| Standard | `value = product.price >= 75 ? 0.00 : 9.99` USD, US | same formula at line 240 |
| Priority | `19.99` USD, US (PDP lines 213-236) | line 249-253 |
| Express | `39.99` USD, US (PDP lines 237-263) | line 254-258 |

> If shipping policy changes in the future, both files must be updated in lockstep. (A shared util is the next obvious refactor target, but doing it now would touch the PDP JSON-LD shape — postponed.)

---

## 5. Legal entity consistency result

**Status: PASS.**

| Surface | Value | OK? |
|---------|-------|-----|
| Organization JSON-LD `name` | `A Toy Haulerz LLC` | ✓ already correct (layout.tsx:113) |
| Organization JSON-LD `alternateName` | `TCG Lore` | ✓ already correct (layout.tsx:114) |
| Metadata `publisher` | `A Toy Haulerz LLC` | ✓ already correct (layout.tsx:31) |
| PDP JSON-LD `seller.name` | `A Toy Haulerz LLC` (+ alternateName `TCG Lore`) | ✓ fixed this phase |
| Footer copyright | `© YYYY TCG Lore. Operated by A Toy Haulerz LLC.` | ✓ pre-existing |
| Public footer/about/terms/privacy/faq prose | `TCG Lore, operated by A Toy Haulerz LLC` | ✓ pre-existing |
| Email subjects | `TCG Lore` brand only | ✓ fixed this phase |
| Email body / alt / footer | `TCG Lore` brand + `Operated by A Toy Haulerz LLC` copyright | ✓ fixed this phase |
| Authenticity page | Brand + legal entity, with non-claim disclaimer | ✓ new this phase |

Grep results:
- `"TCG Lore LLC"` in tracked source → **0 occurrences**
- `"Operated by TCG Lore"` (the broken phrase) in tracked source → **0 occurrences**

---

## 6. Trust / authenticity page summary

- URL: `/authenticity` (server-rendered, static at build per build output: `○ /authenticity 269 B 164 kB`).
- Footer link: `Customer Service → Authenticity & Trust`.
- Content principles followed:
  - No per-card forensic authentication promise.
  - No "official partner" or "licensed reseller" claim.
  - Graded cards mentioned only "when applicable".
  - Sealed-product wording uses "where applicable" for UPC / shrink-wrap checks.
  - FAQ cross-links to `/returns` and `/shipping`.
  - Explicit business identification: "TCG Lore is an online trading card store operated by A Toy Haulerz LLC."

No business-confidential information assumed; no TODO content placeholders left.

---

## 7. Commands run + pass/fail

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** — no errors |
| `npm run lint` | **PASS** — 5 pre-existing warnings, none in files touched this phase |
| `npm run build` | **PASS** — exit 0, all routes compile; `/authenticity` correctly emitted as a static page (`○`), feed `/api/feeds/[uuid]` and admin routes built clean |
| Manual `normalizePreorderFlag` equivalence test (Node) | **PASS** 8/8 cases |

---

## 8. Remaining business confirmations

None blocking. The following were resolved by your earlier confirmation: legal entity, public brand phrasing, three shipping tiers + thresholds.

Optional follow-up worth confirming before next phase:
- **Authenticity page wording**: please skim the new `app/authenticity/page.tsx` and flag any phrasing you disagree with. The page is deliberately conservative (no per-card forensic-authentication claim, no "official partner" claim).
- **`/payment` vs `/payment-and-orders` vs `/payment-orders`**: three near-duplicate pages still exist; per audit `_audit/05-seo-gmc.md` this is a duplicate-content risk. Footer currently links to `/payment`. Pick a canonical and 301 the others (not done this phase — needs decision).

---

## 9. Manual reminder — security hygiene

These items are unchanged from `_audit/08-PHASE-0-2-EXECUTION-REPORT.md` and are not addressable by code patches alone:

- [ ] **Rotate Neon DB password** in the Neon console — the password from the deleted scratch files (`db-query.js`, `create-feed.js`) remains in git history and must be considered compromised.
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel, and any CI / GitHub Actions secret store.
- [ ] Test locally after rotation (`npm install && npm run build && npm run start`) plus a smoke test of `/api/health/db`, an admin login, and a PDP load.
- [ ] Only after those succeed, decide whether to scrub git history with `git filter-repo` or BFG (commands documented in `_audit/08-PHASE-0-2-EXECUTION-REPORT.md`). Force-push must be coordinated with all collaborators.

No history rewrite, BFG, or force-push was performed by this phase.

---

## Phase 3 verdict: **PASS**

Suggested Phase 4: Performance P0/P1 from `_audit/04-performance.md` — add `unstable_cache` to product fetchers, expand `generateStaticParams` for PDPs, convert `recharts`/`jspdf`/`html2canvas` to `next/dynamic`, gate Sentry `tracesSampleRate` on env (currently `1.0` for client and unchanged this phase).
