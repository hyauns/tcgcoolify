# Phase 4C-2A — Shipping Source-of-Truth Fix + Email Address Mapping

Date: 2026-05-22
Scope: fix the two bugs identified in `_audit/17-PHASE-4C-2-BLOCKER-REPORT.md` — gateway charge amount mismatch (Bug 1, HIGH) and email address-key mismatch (Bug 2, LOW). Option A applied per user authorization. Paydef integration, status mapping, success URL, conversion tracking, webhook flow, DB schema — all untouched.

---

## 1. Files changed

| # | File | Status | Hunks | Purpose |
|---|------|--------|-------|---------|
| 1 | `lib/shipping.ts` | **NEW** | n/a | Pure helper: `SHIPPING_TIERS`, `normalizeShippingMethod()`, `calculateShipping(method, subtotal)` |
| 2 | `app/checkout/page.tsx` | modified | 2 | Remove hardcoded `5.99/15.99` shipping amount; POST `shippingMethod` instead of `shippingAmount`. UI display code untouched. |
| 3 | `app/api/orders/create/route.ts` | modified | 4 (Phase 4C-2A) | Import helper, destructure `shippingMethod` from body, compute server-side `verifiedShippingAmount`, use it in tax / total / orders.shipping_amount. Phase 4C-1 batch-insert hunk preserved. |
| 4 | `app/api/checkout/process/route.ts` | modified | 1 hunk-cluster | Email-payload address mapping: read `address_line1`/`postal_code` (snake) + `address1`/`postalCode` (camel) fallbacks. Plus a one-char trailing-whitespace cleanup. Gateway fetch, payload body, status updates — untouched. |
| 5 | `app/api/webhooks/gateway/route.ts` | modified | 1 hunk-cluster | Same address-key fallback chain as in `checkout/process`. Signature verify, status mapping, order UPDATE — untouched. |

Total: **1 new file, 4 edits**. ~70 lines of net change, all surgical.

### Files explicitly NOT touched

| Surface | Verified by `git diff` |
|---------|------------------------|
| `app/api/orders/complete/route.ts` | **UNCHANGED vs HEAD** |
| `app/checkout/success/page.tsx` | only Phase 4B-2 null-safety hunk from prior phase (`searchParams?.get(...) ?? null` on line 62), unrelated to 4C-2A |
| `app/api/payment/*` | directory remains empty, nothing to change |
| Paydef payload (`payloadBody` in `checkout/process:49-59`) | **unchanged** |
| Paydef gateway endpoint URL build (`checkout/process:37-39`) | **unchanged** |
| Paydef gateway fetch (`checkout/process:63-71`) | **unchanged** |
| Webhook signature verification (`webhooks/gateway:37-58, 82-92`) | **unchanged** |
| Webhook `statusMap` (`webhooks/gateway:142-148`) | **unchanged** |
| Order status / payment_status string literals (`'PENDING'`, `'PROCESSING'`, `'COMPLETED'`, `'pending'`, `'succeeded'`, `'failed'`) | **unchanged** anywhere |
| Success URL `/checkout/success?orderNumber=...` | **unchanged** |
| Conversion tracking | **unchanged** (no analytics/tracking code touched) |
| DB schema / migrations | **unchanged** |
| Order number generation in `app/checkout/page.tsx:1051` | **unchanged** |
| Stock deduction (`orders/create:138-186`) | **unchanged** |
| Customer / guest resolution (`resolveCustomerId`, `resolveGuestCustomerId`) | **unchanged** |
| Webhook timestamp / idempotency (still pre-existing P1 carry-over) | **unchanged** (out of Phase 4C-2A scope by rule #12) |
| Email template layout (`lib/email/templates/*`) | **unchanged** |

---

## 2. Exact root cause fixed

### Bug 1 — `app/checkout/page.tsx:1046` was hardcoded

Before (Phase 4C-2A entry point):
```ts
const shippingAmount = formData.shippingMethod === "express" ? 15.99 : 5.99
```

The customer-facing UI (`app/checkout/page.tsx:736`) correctly computed `shippingCost = subtotal >= 75 && method === "standard" ? 0 : selectedShipping.price` using the real `9.99 / 19.99 / 39.99` prices, but this **second** calculation built the body that was POSTed to `/api/orders/create`. The server then trusted this client value and stored it in `orders.shipping_amount` + baked it into `total_amount`, which `/api/checkout/process` reads and sends to Paydef.

After:
- The client posts `shippingMethod: formData.shippingMethod` only.
- The server (in `orders/create/route.ts`) computes `calculateShipping(shippingMethod, serverSubtotal)` — the canonical price.
- The amount stored in `orders.shipping_amount` and `payment_transactions.amount` is now the real UI promise.

### Bug 2 — Email-payload code read camelCase keys; DB stores snake_case

`sanitizeAddress()` in `orders/create/route.ts:60-71` emits `address_line1`, `postal_code`, `first_name`, `last_name`. The email builders in `checkout/process/route.ts:159-162` and `webhooks/gateway/route.ts:230-235` only checked `parsedShipping?.address1`, `parsedShipping?.postalCode`, `parsedShipping?.firstName`, `parsedShipping?.lastName` — these always resolved to `undefined` against snake_case rows, falling back to the `"Address not provided"` / `"ZIP not provided"` literals.

After:
- Both sites now read with the same fallback chain used by `orders/complete/route.ts:120-123`:
  ```ts
  street:  parsedShipping?.address_line1 ?? parsedShipping?.address1 ?? parsedShipping?.addressLine1 ?? "Address not provided"
  zipCode: parsedShipping?.postal_code   ?? parsedShipping?.zipCode  ?? parsedShipping?.postalCode    ?? "ZIP not provided"
  ```
- `firstName` / `lastName` use the same chain. The composed `shippingName` is now correctly built from DB when available, falling back to `payload.buyer_name` (gateway) or `"Customer"` only if both DB and gateway are empty.

---

## 3. All `$5.99` / `$15.99` occurrences

Repo-wide grep `5\.99|15\.99` in `app/`, `lib/`, `components/`, `hooks/` after the fix:

| File:line | Context | Status |
|-----------|---------|--------|
| `lib/shipping.ts:13` | comment in JSDoc explaining the historical bug | **leftover** (documentation, not active code) |

**No active code** uses `5.99` or `15.99` for shipping anywhere. The pre-existing `15.99` count in the repo was always zero outside the buggy hardcode + tests/docs; the `5.99` count was the single buggy line plus the comment we just added explaining it.

---

## 4. Shipping source-of-truth — after fix

| Surface | Reads from | Correct? |
|---------|------------|----------|
| Checkout UI display | `app/checkout/page.tsx:736` (`shippingCost` from `selectedShipping.price` + `>= 75` rule) | ✓ unchanged, correct |
| Checkout payload | `app/checkout/page.tsx` now sends `shippingMethod`, no `shippingAmount` | ✓ |
| Server order create | **`calculateShipping(shippingMethod, serverSubtotal)` from `lib/shipping.ts`** | ✓ canonical |
| `orders.shipping_amount` | written from `formattedShippingAmount` (server-computed) | ✓ |
| `orders.total_amount` | written from `verifiedTotalAmount = serverSubtotal + verifiedShippingAmount + verifiedTaxAmount` | ✓ |
| `payment_transactions.amount` | written from same `formattedTotalAmount` | ✓ |
| Paydef charge | `app/api/checkout/process/route.ts:25-30` reads `txRow.amount` from `payment_transactions` (now correct) | ✓ |
| Email shipping cost | `Number(order.shipping_amount)` from DB (now correct) | ✓ |
| Account orders display | DB `total_amount` directly (now correct) | ✓ |
| `/api/orders/complete` (success page) | DB (now correct) | ✓ |
| GMC feed `/api/feeds/[uuid]` | own canonical values $9.99/$19.99/$39.99 with `>= 75` rule | ✓ unchanged |
| PDP JSON-LD `shippingDetails` | own canonical values | ✓ unchanged |
| `/shipping` policy page | own canonical values | ✓ unchanged |
| `lib/delivery-calculator.ts` | own canonical values | ✓ unchanged |

Single source of truth for the **order DB / gateway path** is now `lib/shipping.ts`. UI continues to use its in-file `shippingOptions` array for display; the values are consistent (`9.99 / 19.99 / 39.99` + `75` free threshold).

---

## 5. Address mapping — before vs after

### Before (email payload code in `checkout/process` and `webhooks/gateway`)
```ts
shippingAddress: {
  name:    parsedShipping?.firstName ? `${parsedShipping.firstName} ${parsedShipping.lastName || ''}`.trim() : payload.buyer_name || "Customer",
  street:  parsedShipping?.address1 || "Address not provided",
  city:    parsedShipping?.city || "City not provided",
  state:   parsedShipping?.state || "State not provided",
  zipCode: parsedShipping?.postalCode || "ZIP not provided",
  country: parsedShipping?.country || "Country not provided",
}
```

DB stores `address_line1` / `postal_code` / `first_name` / `last_name` → these always returned undefined → fallback to placeholder strings.

### After (mirror the pattern in `orders/complete:120-123`)
```ts
const sFirstName = parsedShipping?.first_name ?? parsedShipping?.firstName ?? ""
const sLastName  = parsedShipping?.last_name  ?? parsedShipping?.lastName  ?? ""
const composedName = `${sFirstName} ${sLastName}`.trim()
const shippingName = composedName || customerName || "Customer"  // or payload.buyer_name in the webhook

shippingAddress: {
  name:    shippingName,
  street:  parsedShipping?.address_line1 ?? parsedShipping?.address1 ?? parsedShipping?.addressLine1 ?? "Address not provided",
  city:    parsedShipping?.city || "City not provided",
  state:   parsedShipping?.state || "State not provided",
  zipCode: parsedShipping?.postal_code ?? parsedShipping?.zipCode ?? parsedShipping?.postalCode ?? "ZIP not provided",
  country: parsedShipping?.country || "Country not provided",
}
```

Applied identically in both `app/api/checkout/process/route.ts` and `app/api/webhooks/gateway/route.ts`. No layout/design change to the email itself — only the values feeding into the existing template.

---

## 6. Paydef gateway code — untouched (verified)

`git diff -- app/api/checkout/process/route.ts` shows **only** the email-payload address-mapping hunk + a one-char trailing-whitespace removal on the `customerEmail` line above. Specifically untouched:

- `payloadBody` object construction at `checkout/process:49-59`.
- `endpoint` URL build at `:37-39`.
- `gatewayRes = await fetch(endpoint, ...)` at `:63-71`.
- Headers `X-Store-ID`, `X-API-Key` at `:67-68`.
- Gateway response status decoding `'COMPLETED'`, `'SUCCEEDED'`, etc. at `:90`.
- `UPDATE payment_transactions SET status = ${mappedStatus}` etc. (none of those lines appear in the diff).
- `UPDATE orders SET payment_status = 'COMPLETED', status = 'PROCESSING'` (line 98-103, not in diff).
- Conversion tracking & success page navigation — handled in the client; no client code path other than checkout/page.tsx was edited, and that edit only changes the request body of `/api/orders/create`, not `/api/checkout/process`.

The amount sent to Paydef is **read from the database `payment_transactions.amount`** (unchanged code at `:25-30`). What we changed is **what gets written to that row** during order creation — and the new value is the correct canonical shipping amount. From Paydef's perspective, the integration is byte-identical; only the dollar amount it receives is now the right one.

---

## 7. Conversion tracking / success page — untouched

- `app/checkout/success/page.tsx` is in the working tree as modified, but the only diff is the Phase 4B-2 null-safety patch on line 62 (`searchParams?.get("orderNumber") ?? null`). No new edits in Phase 4C-2A. Verified by `git diff`.
- Success URL pattern `/checkout/success?orderNumber=...` is the redirect target in `app/checkout/page.tsx` and is **not** in the Phase 4C-2A diff hunks.
- No analytics / `useAnalytics` / `trackPurchase` / `dataLayer` / `gtag` calls were touched.

---

## 8. Status mapping — untouched

Grep `'PENDING'|'PROCESSING'|'COMPLETED'|'pending'|'succeeded'|'failed'|'refunded'` across the diff:

```
$ git diff app/api/orders/create/route.ts app/api/checkout/process/route.ts app/api/webhooks/gateway/route.ts | grep -E "'PENDING'|'PROCESSING'|'COMPLETED'|'pending'|'succeeded'|'failed'|'refunded'"
```

→ **0 hits in any `+` or `-` line** for status string changes. The string literals are still where they were before:

- `orders/create:241` → `INSERT INTO orders ... 'PENDING'`
- `orders/create:244` → `'PENDING'` (payment_status)
- `orders/create:350` → `INSERT INTO payment_transactions ... 'pending'`
- `checkout/process:91-103` → `'succeeded'`, `'COMPLETED'`, `'PROCESSING'`
- `webhooks/gateway:142-148` → statusMap
- `webhooks/gateway:165-170` → `'COMPLETED'`, `'PROCESSING'`

---

## 9. typecheck / lint / build result

Clean run from empty cache (`rm -rf .next tsconfig.tsbuildinfo`):

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | **PASS** — exit 0 | No errors. `calculateShipping` is typed `unknown → ShippingMethodId` so any input string is safe. |
| `npm run lint` | **PASS** — exit 0 | 6 pre-existing warnings, none in files touched by Phase 4C-2A. |
| `npm run build` | **PASS** — exit 0 | 146 / 146 static pages generated. Zero `Critical dependency` warnings. Zero `unhandledRejection`. Zero `_document` errors. |

Logs:
- `_audit/p4c2a-typecheck.log`
- `_audit/p4c2a-lint.log`
- `_audit/p4c2a-build.log`

Bundle sizes match Phase 4C-1 baseline — order/checkout API routes are server-only (`ƒ 0 B / 0 B`); no client bundle delta because `lib/shipping.ts` is server-imported only.

---

## 10. Manual test checklist

Phase 4C-2A did NOT run a live sandbox order. The expected end-to-end results, to be confirmed on staging:

| # | Scenario | Expected after fix |
|---|----------|-------------------|
| 1 | Standard, subtotal $50 | UI shows $9.99 shipping. POST sends `shippingMethod: "standard"`. Server stores `orders.shipping_amount = 9.99`, `total_amount = subtotal + 9.99 + tax`. `payment_transactions.amount` matches. Paydef charged that exact amount. Email & account view show $9.99. |
| 2 | Standard, subtotal $100 | UI shows **Free**. POST `shippingMethod: "standard"`. Server stores `shipping_amount = 0.00`. `total_amount = subtotal + 0 + tax`. Paydef charged subtotal + tax only. **No `+ $5.99` anywhere.** Email & account confirm Free / $0.00. |
| 3 | Express ($19.99), any subtotal | UI shows $19.99. POST `shippingMethod: "express"`. Server stores $19.99. Paydef matches. |
| 4 | Overnight ($39.99), any subtotal | UI shows $39.99. POST `shippingMethod: "overnight"`. Server stores $39.99. Paydef matches. |
| 5 | Address mapping | Customer types address `123 Main St`, `Arnold, MO 63010`. Email after success shows `123 Main St`, `Arnold, MO 63010, USA`. **Not** "Address not provided" or "ZIP not provided". |
| 6 | Logged-in customer with saved name | `shippingName` resolves to first_name + last_name from DB shipping_address, not from gateway buyer_name. |
| 7 | Paydef sandbox success | `/api/checkout/process` returns `success: true`. Order updates to `PROCESSING / COMPLETED` as before. Success page loads at `/checkout/success?orderNumber=...`. Conversion tracking fires. |
| 8 | Paydef sandbox decline | `/api/checkout/process` returns 400 gateway-rejected; order remains `PENDING / PENDING`. No code path changed. |
| 9 | Webhook arrives later | `/api/webhooks/gateway` updates order + payment_transactions idempotently; background email now contains correct address. |
| 10 | Concurrent stock | Two checkouts race for last unit; `SELECT FOR UPDATE` + atomic `UPDATE products ... WHERE stock_quantity >= X` semantics unchanged. Only one transaction wins; loser rolls back; no orphan rows. |

Tests 1–4 are the core proof that Paydef is charged the right amount; #5 is the email visual fix; #6–#10 ensure nothing else regressed.

---

## 11. Historical orders caveat

Orders created **before** Phase 4C-2A continue to have wrong values in `orders.shipping_amount` and `orders.total_amount`. They are NOT auto-fixed by this code change. Reasoning unchanged from `_audit/17-PHASE-4C-2-BLOCKER-REPORT.md §10`:

- Paydef's record is the source of truth for what the customer actually paid. The DB row recorded what TGC Lore thought it was charging at the time.
- For overcharge cases (free-shipping promised, $5.99 actually charged), the customer was billed roughly $5.99 too much.
- For undercharge cases (express/overnight), the merchant collected less than the policy amount.
- A backfill on the DB without a Paydef reconciliation would create a mismatch between merchant records and gateway records.

**Recommendation: leave historical orders as-is** unless legal/finance directs otherwise. From the next checkout onward, every charge matches what UI promised. No further action required at the code level.

---

## 12. Rollback instructions

If anything regresses after deploy, the rollback set is:

```bash
# Bug 1 (shipping calculation)
git checkout HEAD -- app/api/orders/create/route.ts
git checkout HEAD -- app/checkout/page.tsx
rm -f lib/shipping.ts

# Bug 2 (email address mapping) — independent
git checkout HEAD -- app/api/checkout/process/route.ts
git checkout HEAD -- app/api/webhooks/gateway/route.ts
```

Both fix sets can be reverted independently. No DB migration to undo. No env var. No new dependency. No schema change. After revert, the codebase returns to its Phase 4C-1 state.

> Note: reverting `orders/create/route.ts` also reverts Phase 4C-1 batch-insert. To preserve Phase 4C-1 while reverting Phase 4C-2A, either revert manually around the 4 hunks added by 4C-2A (the import line, the destructure block, the shipping calc + tax/total block, and the INSERT shipping_amount value) or use `git checkout <pre-4C-2A-sha> --patch -- app/api/orders/create/route.ts`.

---

## Phase 4C-2A verdict: **PASS — Bug 1 & Bug 2 fixed, deploy-safe**

- Gateway charge amount now matches what the UI promises.
- Email + account totals will be correct on every new order.
- Email "Address not provided" / "ZIP not provided" no longer appear when a real address was entered.
- Paydef integration untouched.
- Conversion tracking untouched.
- Status mapping untouched.
- Webhook signature / idempotency code untouched.
- Clean build PASS, 146/146 SSG, zero warnings, zero errors.

### Manual reminders (carry-over)

- [ ] Rotate Neon DB password (Neon console).
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel, CI.
- [ ] Run the staging tests in §10 before pushing to production.
- [ ] (Optional, post-rotation) scrub Neon password from git history with `git filter-repo` or BFG.

### Still deferred (carry-over from earlier phases)

| Phase | Scope |
|-------|-------|
| 4C-1b | Delete dead `lib/database.ts:createOrder` (housekeeping) |
| 4C-2B | Webhook timestamp freshness check + `event_id` idempotency |
| 4C-3 | Admin recharts split via `next/dynamic` |
| 4C-4 | Feed XML true streaming |
| 5 | DB trigram / GIN index for `/explore` |
| 5 | `bcryptjs` → native `bcrypt` |
| 5 | JWT algorithm pin to HS256 |
| 5 | Dependency cleanup (`playwright`, `@react-email/render`, `"latest"` pinning) |
