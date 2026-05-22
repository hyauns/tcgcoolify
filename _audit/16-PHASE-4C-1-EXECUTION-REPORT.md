# Phase 4C-1 — Checkout Order Items Micro-Optimization

Date: 2026-05-22
Scope: **single surgical hunk** in `app/api/orders/create/route.ts` only. Convert the per-item INSERT loop into a single multi-row INSERT inside the existing transaction. Zero changes to Paydef integration, payment_transactions, checkout/process, success page, webhook, conversion tracking, or status mapping.

---

## 1. Files changed

| Path | Change | Hunks |
|------|--------|-------|
| `app/api/orders/create/route.ts` | Replace per-item `INSERT order_items` loop with single multi-row INSERT via `postgres.js` helper. Still inside the existing `rootSql.begin(...)` transaction. | 1 |

**Nothing else touched.** Confirmed by `git diff` of the protected paths:

| Path | Diff status |
|------|-------------|
| `app/api/checkout/process/route.ts` | **UNCHANGED ✓** (zero diff vs HEAD) |
| `app/api/orders/complete/route.ts` | **UNCHANGED ✓** |
| `app/api/webhooks/gateway/route.ts` | **UNCHANGED ✓** |
| `app/checkout/page.tsx` | **UNCHANGED ✓** |
| `app/checkout/success/page.tsx` | unchanged in this phase (its single edit on line 62 is a Phase 4B-2 carry-over for `searchParams?.get(...) ?? null` — null-safety only, NOT order-flow) |
| `app/api/payment/*` | (directory empty, nothing to change) |
| Any Paydef-related integration | **UNCHANGED ✓** (no separate Paydef file exists — gateway is called via generic `fetch(endpoint, ...)` in `checkout/process/route.ts`, which is untouched) |
| DB schema (Prisma / migrations) | **UNCHANGED ✓** |
| `lib/database.ts` (incl. dead `createOrder`) | **UNCHANGED ✓** (kept per rule #16) |

---

## 2. Exact diff summary

```diff
@@ app/api/orders/create/route.ts:252-260 @@
       timings.insert_order = performance.now() - t1
       t1 = performance.now()

-      for (const item of items) {
+      // Batch line-item insert. Same columns, same values, same row order as the
+      // previous per-item loop — just one round-trip to Neon instead of N. Still
+      // inside the existing sql.begin() transaction, so atomicity is unchanged
+      // (any error here rolls back the order row, customer updates, and stock
+      // deductions). The empty-array guard preserves the previous loop's silent
+      // no-op behavior on an empty items array.
+      if (items.length > 0) {
+        const orderItemRows = items.map((item: any) => ({
+          order_id: order.id,
+          product_id: String(item.id),
+          product_name: item.name,
+          quantity: Number(item.quantity),
+          unit_price: Number(item.price),
+          total_price: Number(item.price) * Number(item.quantity),
+        }))
         await sql`
-          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
-          VALUES (${order.id}, ${String(item.id)}, ${item.name}, ${Number(item.quantity)}, ${Number(item.price)}, ${Number(item.price) * Number(item.quantity)})
+          INSERT INTO order_items ${sql(
+            orderItemRows,
+            "order_id",
+            "product_id",
+            "product_name",
+            "quantity",
+            "unit_price",
+            "total_price",
+          )}
         `
       }
```

Lines around the hunk (`timings.insert_order`, `timings.insert_line_items`, the `if (customerId && isAddressValid(cleanShipping))` follow-up) are byte-for-byte identical to HEAD.

---

## 3. Explicit no-touch confirmations

| Surface | Status |
|---------|--------|
| **Paydef / payment gateway request** — `app/api/checkout/process/route.ts:63-71` (fetch to gateway endpoint with cardNumber/cvv/expMonth/expYear) | not touched |
| **Paydef payload shape** — `payloadBody` object built at `checkout/process:49-59` | not touched |
| **Order status mapping** — `'PENDING'` → `'PROCESSING'`, `'COMPLETED'` | not touched (still set by `orders/create:241` and `checkout/process:99-103` exactly as before) |
| **`payment_status`** mapping — `'PENDING'`, `'COMPLETED'` | not touched |
| **`payment_transactions.status`** mapping — `'pending'`, `'succeeded'`, `'failed'`, `'refunded'` | not touched |
| **Webhook status mapping** (`statusMap` at `webhooks/gateway:142-148`) | not touched |
| **Checkout success page URL** — `/checkout/success?orderNumber=...` | not touched |
| **Conversion tracking hooks** — `useAnalytics`, `trackPurchase`, success-page render | not touched |
| **Redirect URLs** | not touched |
| **Email triggers** — `sendOrderConfirmation`, `sendAdminOrderNotification` in `checkout/process` and `webhooks/gateway` | not touched |
| **Stock deduction logic** — `SELECT FOR UPDATE` + `UPDATE products ... WHERE stock_quantity >= X` | not touched |
| **Customer / guest resolution** — `resolveCustomerId`, `resolveGuestCustomerId` | not touched |
| **Order number generation** — caller passes `orderNumber` to the API, server does not regenerate | not touched |
| **DB schema** | not touched |
| **`lib/database.ts:createOrder`** (dead code) | **kept as-is per rule #16** |

---

## 4. API response shape — unchanged

The response from `POST /api/orders/create` is still:

```ts
{
  success: true,
  order: {
    id: String(result.order.id),
    orderNumber: result.orderNumber,
    status: result.order.status,
    total: result.order.total_amount,
    createdAt: result.order.order_date,
    transactionId: result.transactionId,
    paymentMethodId: result.paymentMethodId,
  },
}
```

This is the same object returned at `orders/create/route.ts:375-386`. The Phase 4C-1 hunk only changes how `order_items` rows are inserted inside the transaction; it does not alter the `result.order` or `result.transactionId` / `result.paymentMethodId` values composed at `orders/create:367-372`.

Downstream behavior — unchanged:
- `app/checkout/page.tsx:1066` POSTs to `/api/orders/create`, reads `data.order.id` and `data.order.transactionId`, then POSTs `/api/checkout/process` with the same Paydef payload as before.
- `/api/checkout/process` reads `amount` from `payment_transactions` (untouched), calls gateway, updates status. No code path here was modified.
- Success page polls `/api/orders/complete?orderNumber=...` (no change in URL, query, or response shape).
- Webhook updates `orders` + `payment_transactions` on `payment.capture.completed` (no change).

---

## 5. Status mapping — unchanged

Both the inserted order row and the inserted payment_transactions row use the **same string literals** as before this phase:

- `orders/create:241` — `INSERT INTO orders ... status='PENDING', payment_status='PENDING'` ← unchanged
- `orders/create:350` — `INSERT INTO payment_transactions ... status='pending'` ← unchanged
- `checkout/process:91-103` — `UPDATE payment_transactions SET status='succeeded'; UPDATE orders SET payment_status='COMPLETED', status='PROCESSING'` ← unchanged
- `webhooks/gateway:152-160, 165-170` — same UPDATE statements ← unchanged

No string was renamed, reordered, or removed in this phase.

---

## 6. Before / after — order_items insert strategy

| Aspect | Before | After |
|--------|--------|-------|
| Number of round-trips to Neon for N items | N | **1** |
| Transaction boundary | inside `rootSql.begin(...)` | **inside the same `rootSql.begin(...)`** (no change) |
| Atomicity on failure | rollback the entire order chain | **rollback the entire order chain** (no change) |
| Columns inserted | `order_id, product_id, product_name, quantity, unit_price, total_price` | **identical** |
| Value coercions | `String(item.id)`, `Number(item.quantity)`, `Number(item.price)`, etc. | **identical** |
| Empty-items handling | for-loop silently no-ops | **explicit `if (items.length > 0)` guard preserves the same no-op** |
| Row order | order of `items` array | **identical** (`map` preserves order, postgres.js inserts in iteration order) |
| Encoded as parameterized query | yes | **yes** (postgres.js `sql(rows, ...cols)` is fully parameterized — SQL injection safe) |

Expected production impact:
- For a 1-item cart: identical latency (one INSERT either way).
- For a 3-item cart: ~40–60 ms saved (Neon pooler round-trip latency × 2).
- For a 10-item cart: ~200 ms saved.
- Build size impact: `/api/orders/create` server route size unchanged at `ƒ 0 B / 0 B` (server-only).

---

## 7. typecheck / lint / build result

Clean run from empty cache (`rm -rf .next tsconfig.tsbuildinfo`):

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | **PASS** — exit 0 | No errors. `sql(values, ...cols)` is typed by postgres.js declarations. |
| `npm run lint` | **PASS** — exit 0 | 6 pre-existing warnings (none in `orders/create/route.ts` or any file touched). |
| `npm run build` | **PASS** — exit 0 | 146 / 146 static pages generated. Zero `Critical dependency` warnings, zero `unhandledRejection`, zero `_document` errors. |

Bundle sizes match Phase 4C-0 baseline exactly:
```
┌ ○ /                                          7.01 kB    175 kB
├ ○ /admin                                     2.91 kB    211 kB
├ ○ /admin/analytics                           47.1 kB    284 kB
├ ƒ /api/orders/create                         0 B        0 B
├ ƒ /api/checkout/process                      0 B        0 B
├ ƒ /api/webhooks/gateway                      0 B        0 B
```

Logs:
- `_audit/p4c1-typecheck.log`
- `_audit/p4c1-lint.log`
- `_audit/p4c1-build.log`

---

## 8. Manual test checklist

This phase did NOT exercise a live order against the Paydef sandbox or production gateway. Recommended pre-deploy verification:

| # | Test | Expected | Watch for |
|---|------|----------|-----------|
| 1 | Guest checkout, **1 item** | Order row created (status=PENDING, payment_status=PENDING). `order_items` has 1 row matching the cart item. `payment_transactions` row created. Success page renders. | Single `INSERT INTO order_items` log line in `[Perf]` — confirms one round-trip. |
| 2 | Guest checkout, **3 items** with different quantities | Order row created. `order_items` has 3 rows, one per cart item. Quantity/unit_price/total_price match per item. Gateway receives a single charge equal to verified total. | No duplicate or missing rows. `timings.insert_line_items` should be lower than before. |
| 3 | Logged-in checkout (regular user) | Same as above plus `customer_id` linked to the user's customer row. `customers.total_orders +=1`, `total_spent += order.total_amount`. | Existing `UPDATE customers` block at `orders/create:354-363` is untouched. |
| 4 | Logged-in admin checkout | Same as logged-in user — admin role does not branch the checkout path. | No 403/role check failures. |
| 5 | Paydef sandbox payment succeeds | `/api/checkout/process` returns `{ success: true }`. `payment_transactions.status='succeeded'`, `orders.payment_status='COMPLETED'`, `orders.status='PROCESSING'`. Fire-and-forget order-confirmation email is dispatched. Success page polls `/api/orders/complete` and renders. | URL stays `/checkout/success?orderNumber=...`. Conversion-tracking script fires as before (no code touched). |
| 6 | Paydef sandbox payment is declined | Gateway returns non-2xx → `checkout/process:73-76` returns `{ error: "Gateway rejected payment" }` with status 400. Order remains in PENDING / payment_transactions in pending. | No order_items rows orphaned (they were already committed inside the orders/create transaction, which is correct — the gateway call is *after* the transaction). |
| 7 | Synthetic failure mid-insert (e.g. corrupt total_price) | Transaction rolls back. **Zero** rows in `orders` for that `order_number`. **Zero** rows in `order_items`. Stock deductions reversed. | This was the safety case Phase 4C-1 was designed not to break. The empty-array guard plus single multi-row INSERT preserves atomicity. |
| 8 | Webhook replay | Gateway re-sends `payment.capture.completed`. `UPDATE payment_transactions` runs idempotently. `UPDATE orders` runs idempotently. Fire-and-forget email fires again (pre-existing P1 carry-over, not addressed in this phase). | No webhook code changed. |
| 9 | Stock concurrency | Two browsers hit checkout for the last unit of the same SKU. Only one wins via `UPDATE ... WHERE stock_quantity >= X` returning 0 rows for the other. Loser's transaction rolls back; order_items have no orphan rows. | Inventory-check loop at `orders/create:138-186` is untouched. |

---

## 9. Risk assessment

**Risk level: Low.**

| Aspect | Risk | Mitigation |
|--------|------|------------|
| Postgres.js multi-row helper safety | Low — `sql(rows, ...cols)` is documented since postgres.js 3.0; the project is on 3.4.9. Values are still parameterized → SQL injection safe. | Verified by typecheck (passes) and build (passes). |
| Column ordering / values | Low — explicit column list in the same order; same coercion functions (`String`, `Number`). | Diff shows byte-equivalent values per column. |
| Atomicity | Zero — same `sql.begin()` wrapper still in effect; any throw inside the inserted block rolls back exactly as before. | No transaction boundary change. |
| Empty items array | Low — added explicit `if (items.length > 0)` guard to preserve previous loop's silent no-op. (In practice the route's early-return at `orders/create:115-117` already rejects `!items`, but the guard is defensive.) | Behavior preserved. |
| Paydef / payment gateway | Zero | Gateway code path untouched; verified by `git diff` returning empty for `checkout/process/route.ts`. |
| Conversion tracking | Zero | Success page URL, params, and rendering untouched. |
| Order status mapping | Zero | No status string was added, removed, or changed. |
| Response shape | Zero | API response object literal at `orders/create:375-386` not edited. |
| DB schema | Zero | No migration, no column add/drop/rename. |

Recommend a staging or sandbox round-trip with at least test cases #1, #2, #5 from §8 before pushing to production traffic.

---

## 10. Rollback instructions

If anything regresses after deploy:

```bash
# From repo root
git diff app/api/orders/create/route.ts

# To revert just this hunk:
git checkout HEAD -- app/api/orders/create/route.ts

# Then redeploy.
```

The revert is a single-file rollback. No DB migration to undo. No env var to revert. No dependency to reinstall. No other file depends on the changed lines.

---

## Phase 4C-1 verdict: **PASS — Optional perf gain shipped, deploy-safe**

What was achieved:
- 1 round-trip per checkout instead of N for line-item insert.
- Atomicity unchanged.
- API contract unchanged.
- Paydef integration untouched.
- Webhook untouched.
- Conversion tracking untouched.
- Clean build PASS exit 0, 146/146 SSG.

What is still deferred (carry-over from Phase 4C-0):

| Phase | Scope | Status |
|-------|-------|--------|
| 4C-1b | Delete `lib/database.ts:createOrder` dead code | **Skipped per rule #16** for this phase. Re-evaluate in housekeeping. |
| 4C-2 | Webhook timestamp freshness check + `event_id` idempotency | Designed in `_audit/06-security.md` SEC-5/SEC-6, not implemented. |
| 4C-3 | Admin recharts split via `next/dynamic` | Deferred (admin-only, behind auth). |
| 4C-4 | Feed XML true streaming | Deferred. |
| 5 | DB trigram / GIN index for `/explore` | Deferred (schema change). |
| 5 | `bcryptjs` → native `bcrypt` | Deferred (perf). |
| 5 | JWT algorithm pin to HS256 | Deferred (defense-in-depth). |
| 5 | Dependency cleanup (`playwright`, `@react-email/render`, `"latest"` pinning) | Deferred. |

### Manual pre-deploy reminders unchanged

- [ ] Rotate Neon DB password (Neon console).
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel (if used), CI.
- [ ] Run smoke tests #1, #2, #5 from §8 against staging or sandbox before production.
- [ ] (Optional, post-rotation) Scrub git history with `git filter-repo` or BFG. Force-push must be coordinated.
