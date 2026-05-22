# Phase 0–2 Execution Report

Date: 2026-05-22
Scope: Phase 0 (secret hygiene), Phase 1 (P0 admin security), Phase 2 (SEO/GMC critical).

---

## Files changed

| # | Path | Change | Phase |
|---|------|--------|-------|
| 1 | `db-query.js` | **Deleted** (`git rm`) — contained hardcoded Neon production credentials | 0 |
| 2 | `create-feed.js` | **Deleted** (`git rm`) — contained hardcoded Neon production credentials | 0 |
| 3 | `app/api/admin/upload/route.ts` | Added `requireAdmin`, sharp magic-byte validation, server-side filename, ignore client `?filename=` | 1 |
| 4 | `app/api/admin/settings/route.ts` | Added `requireAdmin` to PUT/POST; added Zod schema (HTTPS URLs + length caps + verification-token regex) | 1 |
| 5 | `app/api/admin/test-email/route.ts` | Removed hardcoded `"admin-secret-replace-me"`, removed CRON_SECRET reliance, switched to `requireAdmin` | 1 |
| 6 | `app/explore/[brand]/[attribute]/page.tsx` | Fixed 3 occurrences of `/product/{slug}` → `/products/{slug}` (lines 197, 227, 246) | 2 |
| 7 | `app/products/[slug]/page.tsx` | Removed fabricated `"mpn": product.id.toString()` from PDP JSON-LD; left `sku` as the retailer's own internal identifier with explanatory comment | 2 |
| 8 | `app/api/feeds/[uuid]/route.ts` | (a) Removed brand fallback to `"TCG Lore"` — emits `<g:brand>` only when manufacturer brand exists. (b) Added `<g:sale_price>` when `original_price > price`. (c) Added `<g:shipping>` US standard tier matching the PDP JSON-LD rate ($0 if price≥$75 else $9.99). (d) Documented that preorder normalization matches the PDP rule in `lib/products.ts`. | 2 |

Total: **2 deletions, 6 edits**. Zero changes to payment/checkout/orders/webhooks/auth-library/database/middleware/CSP.

---

## Exact fixes — details and rationale

### Phase 0

- **db-query.js / create-feed.js**: removed from both working tree and git index (`git rm`). These contained inline Neon connection strings with real credentials. Working-tree no longer holds secret material.
- Other root scratch files (`audit-products.js`, `fix_others.js`, `fix_products.js`): inspected (no secrets) and **left in place** per phase rule "Không xóa hàng loạt cleanup ở phase này, trừ khi file chứa secret". They will be addressed in Phase 3 of the master cleanup plan.
- `lib/env.ts` and `COOLIFY_DEPLOYMENT.md`: matched the grep pattern but contain only Zod placeholders / doc placeholders. No real secret.
- `scripts/check-db-connection.mjs`: uses `process.env.DATABASE_URL` and explicitly masks `npg_` in any console output. Clean.

### Phase 1

**`/api/admin/upload`**
- `requireAdmin()` is called as the first statement of the handler; if it returns a `NextResponse`, that response is returned immediately.
- Client-supplied `?filename=` is **no longer used**. Filename is derived server-side from sharp's detected image format.
- File bytes are read into a buffer with a streaming size cap of 5 MB (independent of the spoofable `Content-Length` header).
- `sharp(buffer).metadata()` is called to confirm the bytes really are an image and to read the detected format.
- The MIME type passed to `uploadToR2` comes from sharp's detected format, not the client `Content-Type` header.
- Only `jpeg`, `png`, `webp`, `gif`, `avif` are accepted.

**`/api/admin/settings`**
- `requireAdmin()` at the top of `PUT` (POST is a re-export of PUT, so it inherits the guard).
- A Zod schema (`settingsSchema`) validates the body before any SQL. All URL-bearing fields require `https://` prefix; lengths are capped (200 chars for titles, 500 for descriptions); `googleSiteVerification` is constrained to alnum-dash-underscore, max 128 chars.
- Empty strings and nulls are coerced to `null` so the existing DB upsert keeps working unchanged.
- DB schema unchanged. No behavior change for valid admin requests.

**`/api/admin/test-email`**
- The entire `CRON_SECRET`-or-`"admin-secret-replace-me"` block is gone. `CRON_SECRET` remains valid only for `/api/cron/*` routes (not touched here).
- Replaced with `requireAdmin()` at the top of the handler.
- All email-sending behavior below the guard is unchanged.

### Phase 2

**Explore route**
- Changed `Link href={\`/product/${product.slug}\`}` → `Link href={\`/products/${product.slug}\`}` at three call sites (image link, title link, "View Details" button). Verified `app/product/` does not exist; only `app/products/[slug]/` exists.

**PDP JSON-LD MPN**
- Removed `"mpn": product.id.toString()`. The internal numeric `product.id` is not a manufacturer part number; emitting it as MPN combined with `g:identifier_exists=no` in the feed is contradictory and a GMC misrepresentation flag.
- `"sku": product.id.toString()` is **kept**. SKU is the retailer's own internal stock-keeping identifier — using the internal product ID is legitimate and matches the feed's `g:id`. Documented in code via comment.

**Feed XML builder (`/api/feeds/[uuid]`)**
- **Brand fallback removed**. `const brand = product.brands || "TCG Lore"` is gone. The new `brandLine` is empty when `product.brands` is null/empty, otherwise it emits `<g:brand>${escapeXml(product.brands)}</g:brand>`. Combined with `<g:identifier_exists>no</g:identifier_exists>` already present, this is GMC-acceptable.
- **Sale price**: when `original_price` is a finite number greater than `price`, the feed now emits `<g:price>` as the original price and `<g:sale_price>` as the actual price, per GMC convention. Otherwise `<g:price>` is the regular price and no `<g:sale_price>` is emitted.
- **Shipping**: a `<g:shipping>` block is now emitted for US Standard, reflecting the same rule used by the PDP JSON-LD (free when `price >= $75`, else `$9.99`). Priority/Express tiers from the PDP are NOT included in the feed to avoid mismatching the cheapest advertised rate. **Confirm with you before going live**: if the PDP standard-shipping policy changes, this block must be updated too.
- **Preorder normalization**: the existing logic already matches the PDP mapper in `lib/products.ts:225-232` (release_date < now → not preorder). A code comment was added so future contributors keep the two in sync. No behavior change.

---

## Checks passed / failed

### Grep checks (all pass)

| Check | Result |
|-------|--------|
| `/product/` link in explore cards | **none** (clean) |
| `"mpn":` in `app/products/[slug]/page.tsx` | **none** (clean) |
| `brands? \|\| ['\"]TCG Lore['\"]` in `app/api/feeds/**` | **none** (clean) |
| `admin-secret-replace-me` in `app/`, `lib/` | **none** (clean) |
| `npg_` (Neon password prefix) in any tracked source under `app/`, `lib/`, `components/`, `hooks/`, `scripts/`, `middleware.ts`, `instrumentation.ts` | **none** (clean) — only matches remaining are in `_audit/*` docs that reference the masked indicator |
| `db-query.js`, `create-feed.js` still tracked | **none** (clean — staged as deletions) |
| `requireAdmin` present in all 3 patched admin routes | **yes** in all three |

### Build / lint / typecheck

| Command | Status | Notes |
|---------|--------|-------|
| `npm run typecheck` | **PASS** | No errors |
| `npm run lint` | **PASS** | 5 pre-existing warnings, none in files touched by this session |
| `npm run build` | **PASS** | All routes compile, no errors, no new warnings. PDP SSG still generates the top-N popular slugs as before. Feed route and admin routes build cleanly. |

---

## Manual actions required (cannot/should not automate)

> The phase rules disallow running history-rewrites or force-push from this session. The following must be done by you, in order.

### Immediate (rotate before merging)

1. **Rotate Neon DB password.**
   - Log into the Neon console → project → Roles & databases → reset password.
   - The current password (the one embedded in the deleted `db-query.js` / `create-feed.js`) must be considered compromised, since it remains in **git history** even though it is no longer in the working tree.

2. **Update `DATABASE_URL`** everywhere the new password is needed:
   - Local `.env.local`
   - Coolify environment variables for the deployed app
   - Vercel project env (if still used)
   - Any GitHub Actions / CI secrets

3. **Decide whether to also rotate other secrets** that may have been alongside the DB URL in deleted files or scratch context: `JWT_SECRET`, `CRON_SECRET`, `WEBHOOK_SECRET`, `RESEND_API_KEY`, `PAYMENT_ENCRYPTION_KEY`, Sentry DSN. None of these were observed in `db-query.js` / `create-feed.js` based on inspection, but if you copy/pasted them into the same shell/log context in the past, prefer rotating.

4. **Confirm the rotated credentials work** (`npm run build && npm run start` locally; or deploy to a staging env first) **before** doing step 5.

5. **Scrub git history.** Two viable tools — pick one. Below are commands; **do not run them from me, run them yourself after backing up the repo**:

   Option A — `git filter-repo` (recommended by Git docs):
   ```bash
   # From a fresh clone (do NOT run on your active workdir)
   git clone <repo-url> repo-scrub && cd repo-scrub
   git filter-repo --invert-paths --path db-query.js --path create-feed.js
   git push --force origin --all
   git push --force origin --tags
   ```

   Option B — BFG Repo-Cleaner:
   ```bash
   java -jar bfg.jar --delete-files 'db-query.js' --delete-files 'create-feed.js' <repo-path>
   cd <repo-path>
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force origin --all
   git push --force origin --tags
   ```

   **Coordinate the force-push with every collaborator** — they will need to reclone or hard-reset their local main. Do not force-push without their acknowledgement.

6. **Commit the working-tree changes from this session** (deletions + patches). Suggested commit message (you may adjust):
   ```
   fix(security,seo): patch P0 admin auth, fix GMC misrepresentation, purge tainted scratch

   - admin/upload: enforce requireAdmin + sharp magic-byte validation
   - admin/settings: enforce requireAdmin + Zod validation on URL fields
   - admin/test-email: enforce requireAdmin, drop hardcoded fallback secret
   - explore: fix /product/ → /products/ link (was 404 site-wide)
   - PDP JSON-LD: remove fake mpn (was internal product id)
   - feed: drop brand fallback to "TCG Lore", add sale_price, add shipping
   - remove db-query.js / create-feed.js (secret rotation required separately)
   ```

### Soon — review-only items surfaced during this work

- **Seller name mismatch**: PDP JSON-LD line ~173 says `"name": "TCG Lore LLC"`, but legal entity is `"A Toy Haulerz LLC"` (surfaced by SEO audit). Out of this phase's scope. Confirm canonical entity name before fixing.
- **Feed `<g:shipping>` correctness**: I emitted only the Standard tier (free if price ≥ $75, else $9.99) to mirror the PDP. If your actual published shipping policy differs (e.g. weight-based pricing, additional handling fee on certain SKUs, multi-region), update the `shippingLine` block in `app/api/feeds/[uuid]/route.ts` accordingly.
- **PDP shipping tiers vs reality**: PDP JSON-LD also declares Priority ($19.99) and Express ($39.99). If those aren't real (or aren't available everywhere), they should be removed from the PDP — leaving them creates a different misrepresentation vector.
- **Sentry client DSN typo** (separate P1 from `_audit/06-security.md`): `sentry.client.config.ts` reads `process.env.SENTRY_DSN` but only `NEXT_PUBLIC_SENTRY_DSN` is shipped to the client. Telemetry is silently dropped. Not patched in this phase per scope.

### Verification you can run yourself

```bash
# 1. After deploy, exercise the patched endpoints unauthenticated → expect 401
curl -i https://tcglore.com/api/admin/upload?filename=x.jpg -X POST
curl -i https://tcglore.com/api/admin/settings -X PUT -d '{}'
curl -i https://tcglore.com/api/admin/test-email -X POST -d '{"to":"x@example.com"}'

# 2. Verify PDP JSON-LD has no mpn
curl -s https://tcglore.com/products/<known-slug> | grep -o '"mpn"' || echo "clean"

# 3. Verify feed XML
curl -s "https://tcglore.com/api/feeds/<your-feed-uuid>" | head -80
#   - Should show <g:sale_price> only when the product has original_price > price
#   - Should show <g:shipping> with US Standard tier
#   - Should NOT show <g:brand>TCG Lore</g:brand> for products without a real brand

# 4. Verify explore product cards
curl -s https://tcglore.com/explore/wizards-of-the-coast/mythic-rare | grep -oE 'href="/products?/[^"]+"' | sort -u
#   - Every link must start with /products/ (plural). No /product/ remaining.

# 5. Trigger a GMC feed re-crawl
#   In Merchant Center → Products → Diagnostics → ask for re-fetch.
```

---

## Out of scope / explicitly not touched this session

- Payment gateway, checkout, order creation, webhooks, Shopify integration.
- Database schema, migrations, seed data.
- `.env*` files, secrets, Coolify/Vercel env vars.
- Bulk cleanup of `scratch/`, `tmp/`, `db_backups/`, `pgsql/`, `tcglore.com-Coverage-2026-05-10/`, the 33+ one-shot scripts under `scripts/`.
- `audit-products.js`, `fix_others.js`, `fix_products.js` at repo root (no secrets, deferred to a future cleanup phase).
- `lib/generated/`, `prisma/` removal.
- Dependency uninstall (`playwright`, `@react-email/render`), `"latest"` pinning.
- Performance P0/P1/P2 from `04-performance.md`.
- Remaining security P1s from `06-security.md` (webhook idempotency, Sentry DSN, JWT algorithm pinning, `bcryptjs` → `bcrypt`, guest order token, etc.).
