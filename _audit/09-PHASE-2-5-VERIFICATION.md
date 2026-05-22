# Phase 2.5 — Post-fix Verification Report

Date: 2026-05-22
Status: **PASS** (1 surgical patch applied, 3 issues reported for next phase)

---

## Check 1 — Secret & Env

| Item | Result |
|------|--------|
| `db-query.js` / `create-feed.js` staged as deletion | ✓ confirmed (`git status -- db-query.js create-feed.js` → `D D`) |
| `db-query.js` / `create-feed.js` still in `git ls-files` | ✓ no (clean) |
| `postgresql://` in tracked source (excl. _audit, node_modules, .next) | only 1 hit: `lib/env.ts:25` — Zod **error message string**, not a secret. False positive. |
| `npg_` in tracked source | only 1 hit: `scripts/check-db-connection.mjs:9` — **masking regex** that replaces `npg_xxx` with `npg_***` in console output. False positive. |
| `neondb_owner` in tracked source | 0 hits |
| `DATABASE_URL=` with literal value | 0 hits |
| `admin-secret-replace-me` | 0 hits |

**No real secret remains in tracked source.** Working tree is clean.

> History note: the password tokens are still present in git history for the deleted files. Phase 2.5 does not (and per rule, must not) scrub history. See Manual Actions below.

---

## Check 2 — Admin routes auth regression

For every patched route, verified at byte level:

| Route | `requireAdmin` is first statement | Returns NextResponse on guard fail | Hardcoded fallback secret | CRON_SECRET used |
|-------|-----------------------------------|-----------------------------------|---------------------------|------------------|
| `app/api/admin/upload/route.ts:22-23` | ✓ | ✓ | ✗ none | ✗ none |
| `app/api/admin/settings/route.ts:97-98` (PUT; POST delegates to PUT) | ✓ | ✓ | ✗ none | ✗ none |
| `app/api/admin/test-email/route.ts:9-10` | ✓ | ✓ | ✗ none | ✗ none |

Upload route specifics:
- Client `?filename=` is **read but not used**. The server constructs `safeFilename = \`upload${detected.ext}\`` from sharp's detected format and passes only that to `uploadToR2`. `uploadToR2` in turn only uses the filename for extension-extraction, and generates its own random key (`uploads/YYYY/MM/<32hex><ext>`). No client filename component reaches the R2 object key.
- `sharp(buffer).metadata()` is called inside a try/catch; any non-image rejected with 400.
- `FORMAT_MAP` whitelist limits accepted formats to `jpeg`, `png`, `webp`, `gif`, `avif`. Anything else (svg, pdf, mp4, html, exe disguised as image, etc.) → 400.
- MIME forwarded to R2 is `detected.mime`, not the client's `Content-Type` header.

Settings route Zod compatibility — **1 regression risk found and patched**:

- **Before patch**: `optionalHttpsUrl` enforced `.startsWith('https://')` on all URL fields (logo/favicon/hero AND social_*). The admin UI lets admins paste social URLs (`socialFacebook`, `socialInstagram`, etc.) which may legitimately be `http://` for some platforms or even bare hostnames typed without a protocol. Existing data in the DB may also be in non-https form. Strict https-only would have rejected saves where the only changed field is unrelated (the entire PUT body is re-validated).
- **After patch (`app/api/admin/settings/route.ts:11-18`)**: schema now accepts any valid URL (http or https) via `z.string().url()`. Empty string and `null` are still coerced to `null`. Length caps and the `googleSiteVerification` token regex (`^[A-Za-z0-9_-]+$`, ≤128 chars) are unchanged.

Other compat checks:
- `optionalText()` uses `.nullish()` so the property may be `undefined` in the payload.
- Form sends every field every time (admin/settings/page.tsx:141-156 builds the full state); no partial-payload edge case.
- All keys are accepted; unknown keys are silently dropped (Zod default — non-strict object).

**`/api/admin/db-stats/route.ts:14` still uses `CRON_SECRET` for admin auth.** Out of scope for Phase 1/2.5 (it was P1-4 in the original security audit, not P0). Flagged for Phase 3.

---

## Check 3 — Feed/PDP GMC consistency

### 3.1 — Singular `/product/` link audit
`grep -rn '"/product/\|`/product/\|href="/product/' app --include="*.tsx" --include="*.ts" | grep -v "/products/"` → **0 hits**. All 3 previous occurrences in `app/explore/[brand]/[attribute]/page.tsx` are now `/products/`.

### 3.2 — PDP JSON-LD MPN audit
`grep -n '"mpn"' app/products/[slug]/page.tsx` → **0 hits**. Internal `product.id` is no longer emitted as MPN. `sku` is kept as the retailer's internal identifier (legitimate).

### 3.3 — Feed brand fallback audit
`grep -nE "brands?\s*\|\|\s*['\"][^'\"]*TCG" app/api/feeds` → **0 hits**. Feed now emits `<g:brand>` only when `product.brands` is truthy (`brandLine` conditional at `app/api/feeds/[uuid]/route.ts:231-233`).

### 3.4 — Sale price logic (traced)
`app/api/feeds/[uuid]/route.ts:217-225`:
```
originalPriceNum = parseFloat(product.original_price) or NaN
onSale = isFinite(originalPriceNum) && originalPriceNum > priceNum
regularPrice = onSale ? originalPriceNum : priceNum
salePriceLine = onSale ? "<g:sale_price>price USD" : ""
```
- `original_price > price` → emits `<g:price>=original_price` AND `<g:sale_price>=price`. ✓ (matches user spec 5a)
- `original_price <= price` OR `original_price` null/missing/non-numeric → emits only `<g:price>=price`. ✓ (matches user spec 5b)
- Edge case: `original_price === price` → not on sale (strict `>`), only `<g:price>` emitted. ✓ (correct — equal is not a discount)

### 3.5 — Shipping consistency
**The feed currently emits Standard tier only; the PDP JSON-LD declares Standard + Priority + Express. This IS a consistency risk per user spec 6c.**

- Feed (`app/api/feeds/[uuid]/route.ts:248-254`): one `<g:shipping>` block, US Standard, rate = `priceNum >= 75 ? 0 : 9.99`.
- PDP (`app/products/[slug]/page.tsx:134, 182-264`): `shippingDetails` array with three `OfferShippingDetails` entries — Standard ($0 or $9.99), Priority ($19.99), Express ($39.99).

Diff impact for GMC:
- Cheapest advertised rate matches between feed and PDP (Standard). GMC normally compares the cheapest available rate, so this should not directly trigger a misrepresentation flag.
- However, the existence of declared Priority/Express tiers on the PDP without any backing reality (no shipping selector in checkout for these tiers — would need separate audit) is itself a separate misrepresentation risk.

**Recommendation** (not patched in this phase — requires business confirmation):
1. Confirm whether Priority and Express are actually offered at checkout.
2. If yes → add the corresponding `<g:shipping>` blocks to the feed too.
3. If no → remove the Priority and Express entries from PDP JSON-LD (`app/products/[slug]/page.tsx:210-263`).

### 3.6 — Preorder normalization (traced both paths)

**Feed path** (`app/api/feeds/[uuid]/route.ts:199-205`):
```
isActuallyPreorder = Boolean(product.is_pre_order)
if (isActuallyPreorder && product.release_date) {
  if (new Date(product.release_date).getTime() < Date.now()) isActuallyPreorder = false
}
```
Then `mapAvailability(stock_quantity, isActuallyPreorder)` → `"preorder"` / `"in_stock"` / `"out_of_stock"`.

**PDP path** (`lib/products.ts:197-232`, then `app/products/[slug]/page.tsx:167-170`):
```
isPreOrder = Boolean(row.is_pre_order)
if (row.release_date && new Date(row.release_date).getTime() < Date.now()) {
  isPreOrder = false
}
// later: JSON-LD availability:
product.isPreOrder ? "schema.org/PreOrder" : (product.inStock ? "schema.org/InStock" : "schema.org/OutOfStock")
```
where `inStock = stockQuantity > 0` (`lib/products.ts:198`).

**Equivalence table** (same product, same DB row):

| `is_pre_order` | `release_date` | `stock_quantity` | Feed `g:availability` | PDP JSON-LD `availability` | Match? |
|:--:|:--:|:--:|:--:|:--:|:--:|
| true | future | any | `preorder` | `schema.org/PreOrder` | ✓ |
| true | past | >0 | `in_stock` | `schema.org/InStock` | ✓ |
| true | past | 0 | `out_of_stock` | `schema.org/OutOfStock` | ✓ |
| true | null | any | `preorder` | `schema.org/PreOrder` | ✓ |
| false | any | >0 | `in_stock` | `schema.org/InStock` | ✓ |
| false | any | 0 | `out_of_stock` | `schema.org/OutOfStock` | ✓ |

**Verdict: byte-identical logic; no divergence today.** The two functions are *coincidentally* identical, not *enforced* identical. A future edit in one place could silently desync.

**Proposed (not yet applied) low-risk centralization:**
- Add a pure helper `normalizePreorderFlag(isPreOrderFlag: boolean | null, releaseDate: string | Date | null): boolean` to `lib/utils.ts` (or new `lib/preorder.ts`).
- Replace the inline block in `lib/products.ts:220-232` with a call to the helper (the PDP mapper still does the date formatting locally; only the flag-normalization moves out).
- Replace the inline block in `app/api/feeds/[uuid]/route.ts:199-205` with the same helper call.
- 3 file changes, ~10 lines moved, no behavior change. Recommend doing it as part of Phase 3 GMC consistency, not now.

---

## Check 4 — Seller / legal entity mismatch

Canonical legal entity used in **most places**: `A Toy Haulerz LLC`. Confirmed at:

- `app/layout.tsx:31` — metadata.publisher
- `app/layout.tsx:113` — Organization JSON-LD `name`
- `app/components/footer.tsx:24,181`
- `app/components/header.tsx:250`
- `app/contact/contact-form.tsx:384`
- `app/about/page.tsx:252`
- `app/terms/page.tsx:24`, `app/privacy/page.tsx:24`
- `app/faq/page.tsx:168,270`
- `app/shipping/page.tsx:905`, `app/returns/page.tsx:905`
- `app/preorder-policy/page.tsx:141,153`
- `app/payment-and-orders/page.tsx:387`, `app/payment/page.tsx:387`
- `lib/email/templates/email-verification.tsx:163`

**Mismatches found** (saying `TCG Lore LLC` — likely incorrect):

| File:line | Context | Severity | Reason for severity |
|-----------|---------|----------|---------------------|
| `app/products/[slug]/page.tsx:176` | PDP JSON-LD `offers.seller.name` = `"TCG Lore LLC"` | **High** | Visible to Google crawler in structured data; combined with the GMC misrepresentation cleanup in commit `9b195d4`, this is exactly the kind of inconsistency GMC flags. |
| `lib/email/templates/email-verification.tsx:179` | Plain-text email title says `TCG Lore LLC.` (with trailing dot, suggesting this was a hand-typed copy of the company name) | Medium | Customer-facing email content. Same template line 183 also has a duplicated `TCG Lore Operated by TCG Lore.` phrase that looks like a separate typo. |

**Not auto-patched per user rule "Không sửa ngay nếu chưa chắc legal entity."** Two recommendation paths:

**Option A (recommended) — Standardize on `A Toy Haulerz LLC`** (the entity 17 other places use):
- Patch `app/products/[slug]/page.tsx:176` → `"name": "A Toy Haulerz LLC"`
- Patch `lib/email/templates/email-verification.tsx:179` → `"A Toy Haulerz LLC - Verify Your Email Address"` (drop the period after LLC for cleanliness)
- Audit `lib/email/templates/email-verification.tsx:183` separately — the phrase `TCG Lore Operated by TCG Lore.` is grammatically broken and probably mis-templated from an env value; verify against `EMAIL_FROM` env (which is `"TCG Lore Operated by TCG Lore. <orders@email.tcglore.com>"` in `lib/env.ts:40` — that env-default value itself looks malformed).

**Option B — Standardize on `TCG Lore LLC`** (if "A Toy Haulerz" is the parent and "TCG Lore" is a DBA you want to surface):
- Requires updating ~17 other locations. Larger blast radius. Not recommended unless legal review explicitly says so.

To be safe, propose Option A as a single PR after you confirm with the business/legal owner.

---

## Check 5 — Final validation

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** — no errors |
| `npm run lint` | **PASS** — 5 pre-existing warnings, none in files touched this session or in Phase 1/2 |
| `npm run build` | **PASS** — exit 0, all routes compile, no errors, no new warnings, PDP SSG generates same slug set as before, feed and admin routes build cleanly |

Scripts present in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`. All three required commands exist.

---

## Summary

### 1. Phase 2.5 status: **PASS**

### 2. Files patched in this verification phase
- `app/api/admin/settings/route.ts` — relaxed `optionalHttpsUrl` → `optionalUrl` (accept http OR https) to avoid breaking admin save when social URLs are non-https. Single Zod schema change, no behavioral regression.

No other files touched. The verification was read-only for every other check.

### 3. Remaining risks before commit
- **History**: deleted scratch files (`db-query.js`, `create-feed.js`) and any plain-text secrets they contained are still recoverable from git history. Rotating the Neon password is the only mitigation; history scrub is optional but recommended.
- **Settings POST endpoint accepts arbitrary unknown keys** (silently dropped by Zod default non-strict mode). Low risk; if you want stricter rejection use `.strict()` on `settingsSchema`. Not patched.
- **Admin `/api/admin/db-stats`** still uses `CRON_SECRET` as a shared bearer. Out of Phase 1/2.5 scope; recommend moving to `requireAdmin` in the next security pass.
- **PDP declares Priority/Express shipping tiers not mirrored in feed** — risk is contained today (Standard rate matches), but the PDP itself may be making claims that don't survive scrutiny if those tiers aren't actually offered at checkout.
- **Preorder logic duplicated** between feed and PDP — currently identical, may drift. Centralize via a shared helper next pass.

### 4. Manual actions required before deploy

- [ ] **Rotate Neon DB password** in the Neon console.
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel, and any CI / GitHub Actions secret store.
- [ ] Test locally: `npm install && npm run build && npm run start` against the new password, plus a smoke test of `/api/health/db` (DB read), an admin login, and a PDP load.
- [ ] **Only after the above succeeds**, decide whether to scrub git history with `git filter-repo` (see commands in `_audit/08-PHASE-0-2-EXECUTION-REPORT.md` — coordinate force-push with all collaborators).
- [ ] (Optional, recommended next) Confirm with the business owner which legal entity is canonical (`A Toy Haulerz LLC` vs `TCG Lore LLC`) and patch the two mismatches identified in Check 4.
- [ ] (Optional, recommended next) Confirm with the business owner whether Priority / Express shipping tiers exist at checkout. If yes → mirror them in the feed; if no → remove from PDP JSON-LD.

### 5. Phase 3 recommendation: **GMC consistency first, then Performance P0**

**Rationale:**
- The remaining GMC items (seller-entity mismatch, shipping-tier mismatch, preorder centralization) all carry direct GMC misrepresentation risk and stem from the same incident that motivated commit `9b195d4`. The fixes are small, surgical, and reviewer-friendly.
- Performance P0s (force-dynamic on home/listing, no `unstable_cache` usage anywhere, no `next/dynamic` for heavy admin deps) are higher impact on visitor experience but require a wider blast radius and a way to verify (cache hit headers, bundle size diff). Tackle after the GMC consistency PR ships and is verified in Search Console + Merchant Center.

Suggested Phase 3 scope (one PR):
1. Patch the two seller-entity mismatches (`app/products/[slug]/page.tsx:176`, `lib/email/templates/email-verification.tsx:179` + line 183 audit).
2. Extract preorder-flag normalization into `lib/preorder.ts` (or `lib/utils.ts`) and update the two call sites.
3. Resolve PDP shipping tiers — either add the missing tiers to feed, or remove them from PDP, based on business confirmation.
4. Move `/api/admin/db-stats` from `CRON_SECRET` to `requireAdmin`.

Phase 4 (separately) = Performance P0–P1 from `_audit/04-performance.md`.
