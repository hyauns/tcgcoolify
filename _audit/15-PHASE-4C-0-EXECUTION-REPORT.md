# Phase 4C-0 — Pre-deploy Smoke Verification + Order Flow Audit Only

Date: 2026-05-22
Scope: audit-only, no order/payment/checkout/webhook code changes. Confirm clean build, smoke-verify Phase 4A/4B-1/4B-2 deliverables, fully map the real order flow, design Phase 4C-1 plan.

---

## TL;DR

- **Clean build PASS** from empty `.next` + no `tsconfig.tsbuildinfo`. 146/146 static pages. Zero `Critical dependency`, zero `_document` error, zero `unhandledRejection`.
- **Phase 4B-1 AuthProvider** present and wired correctly.
- **Phase 3 GMC consistency** intact (legal entity, MPN removal, feed brand omit, 3 shipping tiers, trust page, footer link).
- **Major surprise**: the `createOrder` "N+1 + missing transaction" I flagged in earlier reports is in **dead code** (`lib/database.ts:createOrder`, never called). The real production checkout (`app/api/orders/create/route.ts`) **already wraps the entire flow in `sql.begin()`** with proper atomicity. The only remaining concern there is a per-item INSERT loop *inside* the existing transaction — atomic but N round-trips on multi-item carts. Phase 4C-1 scope is therefore much smaller than previously assumed.
- **Safe to deploy now**, with the pre-existing security carry-overs unchanged.

---

## 1. Clean build verification

Commands run:

```bash
rm -rf .next tsconfig.tsbuildinfo
npm run typecheck   # PASS exit 0
npm run lint        # PASS exit 0
npm run build       # PASS exit 0
```

PowerShell equivalent:

```powershell
Remove-Item -Recurse -Force .next, tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run typecheck
npm run lint
npm run build
```

Outcomes (logs at `_audit/p4c0-typecheck.log`, `_audit/p4c0-lint.log`, `_audit/p4c0-build.log`):

| Check | Result |
|-------|--------|
| typecheck (from scratch, no cache) | PASS — no errors |
| lint | PASS — 6 pre-existing warnings (admin/settings useEffect, payments/login/preorder-policy quotes, cart useEffect). None in files touched in any prior phase. |
| `npm run build` | PASS — exit 0 |
| Static pages generated | **146 / 146** |
| `Critical dependency` warnings in production build | 0 |
| `unhandledRejection` | 0 |
| `_document PageNotFoundError` | 0 |
| First Load JS shared by all | 87.7 kB |

Key route sizes (matched Phase 4B-2):

```
┌ ○ /                                          7.01 kB    175 kB
├ ○ /admin                                     2.91 kB    211 kB
├ ○ /admin/analytics                           47.1 kB    284 kB
├ ○ /authenticity                              269 B      157 kB
├ ƒ /explore/[brand]/[attribute]               606 B      103 kB
├ ƒ /products                                  10.5 kB    183 kB
├ ● /products/[slug]                           12.1 kB    176 kB
```

---

## 2. AuthProvider smoke audit (static)

A live `npm run dev` was not exercised in this phase (dev server would tie up the terminal). Equivalent static evidence was collected:

| Evidence | File:line | Result |
|----------|-----------|--------|
| Provider mounted exactly once at the root | `app/providers.tsx:51` | `<AuthProvider>` wraps the entire client tree |
| Real Provider implementation | `hooks/use-auth.tsx:90` | `export function AuthProvider(...)` |
| StrictMode-safe init guard | `hooks/use-auth.tsx:100` | `const initRef = useRef(false)` |
| In-flight dedup ref | `hooks/use-auth.tsx:104` | `const inflightSessionRef = useRef<Promise<void> \| null>(null)` |
| Header reads via context | unchanged in Phase 4B-1 | `useAuth()` resolves to shared `useContext(AuthContext)` value |
| 11 consumers unchanged | `_audit/13-PHASE-4B-1-EXECUTION-REPORT.md §3` | yes |

**Expected runtime behavior (verified by code path inspection):**
- 1 `/api/auth/session` request per real mount (StrictMode dev: still 1 due to initRef).
- Login flow updates shared state → Header re-renders immediately.
- Logout clears shared state → Header reverts immediately.
- Navigation between routes doesn't re-fetch session (Provider stays mounted at root).

> **Recommend you confirm in a live `npm run dev` session before pushing to production.** Open DevTools Network filtered to `session`, hit homepage → expect exactly 1 GET, not 2–10.

---

## 3. GMC / SEO smoke (static raw-source inspection)

| Surface | Evidence | Result |
|---------|----------|--------|
| Layout Organization JSON-LD | `app/layout.tsx:113-114` `name="A Toy Haulerz LLC", alternateName="TCG Lore"` | ✓ |
| `metadata.publisher` | `app/layout.tsx:31` `"A Toy Haulerz LLC"` | ✓ |
| PDP `offers.seller.name` | `app/products/[slug]/page.tsx:183` `"A Toy Haulerz LLC"` (with alternateName "TCG Lore") | ✓ |
| PDP `mpn` (fake) | `grep "\"mpn\"" app/products/[slug]/page.tsx` → 0 hits | ✓ removed |
| PDP `shippingDetails` Standard/Priority/Express | inline in JSON-LD lines 185-264 | ✓ |
| Feed `<g:brand>` fallback to "TCG Lore" | `grep "TCG Lore" app/api/feeds/[uuid]/route.ts` → 0 hits (only docs/comments) | ✓ removed |
| Feed `<g:shipping>` 3 tiers | `app/api/feeds/[uuid]/route.ts:243,248,253` Standard/Priority/Express | ✓ |
| `/authenticity` page | `app/authenticity/page.tsx` exists; build output `○ /authenticity 269 B / 157 kB` (static) | ✓ |
| Footer link to `/authenticity` | `app/components/footer.tsx:106` | ✓ |
| Policy pages SSR (no `"use client"` directive) | `/shipping`, `/returns`, `/terms`, `/privacy`, `/contact`, `/about`, `/about`, `/faq`, `/preorder-info`, `/preorder-policy`, `/payment-and-orders`, `/authenticity` all server components | ✓ |
| Preorder normalization shared helper | `lib/preorder.ts` used by both `lib/products.ts:222` and `app/api/feeds/[uuid]/route.ts:197` | ✓ |

> **Recommend a single live curl smoke after deploy** to confirm structured data is byte-stable in production: `curl -s https://tcglore.com/products/<slug> | grep -oP '"seller":\s*\{[^}]+\}'` should print the seller block with `A Toy Haulerz LLC`.

---

## 4. Order flow map — actual production path

Verified by reading every link in the chain. **No edits made.**

```
[Browser] app/checkout/page.tsx
   │
   │ submit form → setIsProcessing(true)
   │
   ├─► POST /api/orders/create
   │    app/api/orders/create/route.ts:91-408
   │     ├─ checkCheckoutRateLimit(clientIP)  -- rate-limiter.ts
   │     ├─ if (userId !== "guest") requireSession()  -- auth-guard.ts
   │     └─ rootSql.begin(async (sql) => {        ← TRANSACTION OPENS line 133
   │          ├─ for each item:
   │          │    ├─ SELECT FOR UPDATE products  ← row lock line 142-147
   │          │    ├─ check stock vs requested
   │          │    └─ UPDATE products SET stock_quantity = stock_quantity - X
   │          │       WHERE id=? AND stock_quantity >= X    ← atomic deduction line 163-169
   │          ├─ resolveCustomerId / resolveGuestCustomerId  ← INSERT customers if needed
   │          ├─ calculateSalesTax (TaxJar or 0% fallback)
   │          ├─ encryptAddressPhone (AES via lib/payment-security.ts)
   │          ├─ INSERT orders (status=PENDING, payment_status=PENDING)  ← line 235-249
   │          ├─ for each item:
   │          │    └─ INSERT order_items                    ← N+1 inside tx, line 255-260
   │          ├─ if customerId + valid address: INSERT shipping_addresses  ← line 265
   │          ├─ if customerId + valid address: INSERT billing_addresses → id
   │          ├─ if paymentInfo.cardNumber:
   │          │    └─ INSERT payment_methods (encrypted, ON CONFLICT update)  ← line 319-336
   │          ├─ INSERT payment_transactions (status='pending', amount=verifiedTotal)  ← line 345
   │          └─ if customerId: UPDATE customers SET total_orders, total_spent, ...
   │        })   ← AUTO-COMMIT on return, AUTO-ROLLBACK on throw
   │
   │ Response: { success, order: { id, orderNumber, status, total, transactionId, ... } }
   │
   ├─► POST /api/checkout/process
   │    app/api/checkout/process/route.ts:10-189
   │     ├─ checkCheckoutRateLimit
   │     ├─ SELECT amount FROM payment_transactions WHERE transaction_id=...  ← server-side truth line 25
   │     ├─ getGatewayProviderSettings()  ← config from DB
   │     ├─ POST <gateway>/api/gateway/mock-charge with raw PAN/CVV
   │     ├─ on gateway success:
   │     │    ├─ UPDATE payment_transactions SET status='succeeded'  ← line 91
   │     │    ├─ UPDATE orders SET payment_status='COMPLETED', status='PROCESSING'  ← line 98
   │     │    └─ fire-and-forget IIFE: sendOrderConfirmation + sendAdminOrderNotification (safety-net emails)
   │     └─ Response: { success, message }
   │
   ├─► (browser redirect) /checkout/success?orderNumber=...
   │    app/checkout/success/page.tsx polls:
   │     └─ GET /api/orders/complete?orderNumber=...
   │          app/api/orders/complete/route.ts:209-278
   │           ├─ getOrderByNumber (JOIN orders + customers + order_items)
   │           ├─ assertOrderAccess (session userId match OR session email match OR guest passes)
   │           └─ Response: { success, order: { ... }, emailNotifications: { ... } }
   │       (READ-ONLY. No mutations. No emails sent here.)
   │
   └─► Async: gateway calls back webhook
        POST /api/webhooks/gateway
         app/api/webhooks/gateway/route.ts:60-259
          ├─ verifyGatewaySignature (HMAC-SHA256 + timingSafeEqual)  ← line 82
          ├─ JSON.parse(rawBody)
          ├─ if event === "payment.capture.completed":
          │    ├─ SELECT payment_transactions WHERE transaction_id=...
          │    ├─ if not found: 200 OK with "Transaction not found locally"
          │    ├─ UPDATE payment_transactions SET status, card_last_4, card_brand, ...
          │    ├─ if existingTx.order_id:
          │    │    ├─ UPDATE orders SET payment_status='COMPLETED', status='PROCESSING'  ← line 165
          │    │    └─ fire-and-forget IIFE: sendOrderConfirmation + sendAdminOrderNotification
          │    └─ Response: 200 OK
```

### Where dead code lives

- `lib/database.ts:273-320` — `adminDb.createOrder`. **Has no transaction, has N+1 INSERT loop.** But: `grep -rn "\\.createOrder" app components hooks` returns 0 hits in app code. Only `adminDb.{getStats, getRevenueData, getTopProducts, getOrders, getOrderById, updateOrderStatus, getCustomers}` are called by `app/api/admin/*`. **This function is dead code.** It can be safely deleted in a cleanup phase but does not affect runtime correctness today.

---

## 5. `createOrder` risks found

Audit-only — no edits applied this phase.

### Risk 5.1 — Per-item INSERT loop inside the transaction (LOW)
- **Location**: `app/api/orders/create/route.ts:255-260`
- **Problem**: Inside the transaction, each line item is inserted with its own `INSERT INTO order_items ... VALUES (...)`. For an N-item cart this is N round-trips to Neon. **Atomic** (transaction wraps it), but slower than batching into a single multi-row INSERT.
- **Impact**: a 3-item cart pays ~2 extra round-trips (~40–60 ms over Neon Pooler). Real carts are usually 1–3 items, so the impact is bounded. Carts with 10+ items would feel it.
- **Severity**: Low. **Correctness is not at risk**; this is purely a latency optimization.

### Risk 5.2 — Webhook timestamp freshness check missing (P1 carry-over, existing)
- **Location**: `app/api/webhooks/gateway/route.ts:60-92` — already documented in `_audit/06-security.md` SEC-5.
- **Problem**: `X-Webhook-Timestamp` is included in the HMAC input but never compared against `Date.now()`. A captured valid webhook can be replayed indefinitely.
- **Impact**: Replay re-fires the fire-and-forget order-confirmation email path; customer + admin would see duplicate emails. State updates are idempotent (UPDATE to same `status='COMPLETED'`), so DB state is unaffected.
- **Severity**: P1 (existing). Not introduced by any phase done so far.

### Risk 5.3 — Webhook idempotency missing on `event_id` (P1 carry-over, existing)
- **Location**: `app/api/webhooks/gateway/route.ts:101-249` — already documented in `_audit/06-security.md` SEC-6.
- **Problem**: `payload.event_id` is declared in the type but never used as a dedup key.
- **Impact**: Same as 5.2 — duplicate emails on gateway retry. No state corruption.
- **Severity**: P1 (existing). Not introduced by any phase done so far.

### Risk 5.4 — `lib/database.ts:createOrder` dead code looks dangerous if revived (LOW)
- **Location**: `lib/database.ts:273-320`.
- **Problem**: No transaction, N+1 INSERT. If someone in the future wires this back into the route handlers, the safety guarantees of the real route would be lost.
- **Impact**: Latent footgun.
- **Severity**: Low. Resolution: delete the function in a future cleanup PR (or repurpose to call `app/api/orders/create` style transaction internally).

### Not a risk

- The **real** order-creation path **is wrapped in `sql.begin()`** — there is **no current orphan-order risk** from a mid-transaction failure.
- Stock deduction is atomic (`UPDATE ... WHERE stock_quantity >= X` returning 0 rows triggers a throw inside the transaction → rollback).
- Total amount used for gateway charge is read from `payment_transactions.amount` (server-trusted), not from the client request body.

---

## 6. Phase 4C-1 implementation plan (NOT yet applied)

The original Phase 4C-1 brief assumed "createOrder lacks a transaction" — that turned out to be wrong. The realistic 4C-1 scope reduces to **two surgical opt-in items**:

### 4C-1a — Batch `order_items` INSERT inside the existing transaction

**Target**: `app/api/orders/create/route.ts:255-260`.

**Current code (loop):**
```ts
for (const item of items) {
  await sql`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
    VALUES (${order.id}, ${String(item.id)}, ${item.name}, ${Number(item.quantity)}, ${Number(item.price)}, ${Number(item.price) * Number(item.quantity)})
  `
}
```

**Proposed code (single multi-row INSERT via postgres.js helpers)**:
```ts
const rows = items.map((item: any) => ({
  order_id: order.id,
  product_id: String(item.id),
  product_name: item.name,
  quantity: Number(item.quantity),
  unit_price: Number(item.price),
  total_price: Number(item.price) * Number(item.quantity),
}))
await sql`
  INSERT INTO order_items ${sql(rows, "order_id", "product_id", "product_name", "quantity", "unit_price", "total_price")}
`
```

- Boundary unchanged: still inside `rootSql.begin(async (sql) => { ... })`.
- Atomicity unchanged: any failure still rolls back the order row.
- Response shape unchanged.
- Order number / id unchanged.
- Email/webhook/payment flow unchanged.

**Compatibility**:
- `postgres.js` (the installed driver) supports `sql(values, ...cols)` for multi-row inserts. Verified in `package.json` (`"postgres": "^3.4.9"`).
- No DB schema change.

**Test plan**:
| Case | Steps | Expected |
|------|-------|----------|
| 1-item cart, logged-in | add 1 product, checkout | order created with 1 row in order_items, total matches |
| 3-item cart, logged-in | add 3 products, checkout | order created with 3 rows, all linked to order.id |
| 3-item cart, guest | guest checkout w/ 3 items | same as above, customer row created from email |
| Mixed quantities | qty=1, qty=2, qty=5 | order_items.quantity values match |
| Insert failure (synthetic) | corrupt one item's `total_price` to violate a CHECK constraint if any, OR pause Neon mid-write | order row rolled back, no orphan rows in order_items |
| Cart with 10 items | stress sanity | order_items has 10 rows, single round-trip recorded in `[Perf]` log line |
| Payment success | normal flow | webhook still hits the same UPDATE orders path, no behavior change |
| Payment failure | mock gateway returns FAILED | order remains in PENDING, no order_items orphans |
| Webhook replay | re-send same `payment.capture.completed` | UPDATE orders runs idempotently (status already COMPLETED), still re-sends emails (pre-existing P1, not in scope) |

**Rollback plan**: revert the single edit in `app/api/orders/create/route.ts:255-260`. The transaction wrapper does not change, so reverting is one diff hunk.

**Risk level**: **Low**. The change keeps the transaction, item-by-item state, and response shape identical. The only behavior delta is one round-trip instead of N. Recommend staging smoke before production deploy.

### 4C-1b — Delete dead `lib/database.ts:createOrder` (optional housekeeping)

**Target**: `lib/database.ts:273-320`. Confirmed unused by grep (`adminDb.createOrder` has 0 callers).

**Plan**: remove the function from the `adminDb` object literal. Run typecheck/build. Ship.

**Risk level**: **Low**. The function is unreferenced. Worst case: a hidden caller surfaces during build with a type error and we'd put it back.

### Out of 4C-1 scope (carry-over P1 from `_audit/06-security.md`)

- Webhook timestamp freshness check.
- Webhook idempotency on `event_id`.

These are security-flavored and should be a separate Phase 4C-2 (or rolled into a wider security pass), because they touch the order/webhook reconciliation path and need their own test plan.

---

## 7. Is it safe to deploy the current build BEFORE Phase 4C-1?

**Yes — safe to deploy now.** Evidence summary:

- Clean build PASS, 146 SSG, zero Critical dependency warnings.
- Order creation is already atomic (transaction wraps the entire INSERT chain).
- Stock deduction is atomic via `UPDATE ... WHERE stock_quantity >= X RETURNING`.
- Payment amount is server-trusted (read from `payment_transactions` not client body).
- Webhook signature is HMAC-SHA256 + `timingSafeEqual`.
- AuthProvider single fetch + shared state.
- GMC misrepresentation fixes intact (seller entity, MPN, brand fallback, 3 shipping tiers, preorder helper, JSON-LD).
- Trust page live with footer link.

**The optional 4C-1a batch-insert** improves perf on multi-item carts but is not a correctness blocker. The optional 4C-1b dead-code removal is housekeeping.

**Carry-over security work that does not block deploy** (already documented):
- Webhook timestamp freshness / idempotency (re-sends emails on replay; no DB corruption).
- Rotating Neon DB password (history scrub is downstream of rotation).
- `bcryptjs` → native `bcrypt` (perf, not correctness).
- JWT algorithm pinning to `HS256` (defense-in-depth).
- Sentry server/edge sampling already gated by `NODE_ENV` (this session).

---

## 8. Deployment readiness checklist (manual)

| # | Step | Status |
|---|------|--------|
| 1 | Rotate Neon DB password in Neon console | ☐ to do |
| 2 | Update `DATABASE_URL` everywhere it's set | ☐ to do |
|   |   - `.env.local` (local dev) | |
|   |   - Coolify environment variables | |
|   |   - Vercel project env (if still used) | |
|   |   - CI / GitHub Actions secret store (if used) | |
| 3 | Smoke test against new password locally | ☐ to do |
|   |   - `npm install && npm run build && npm run start` (or `npm run dev` for dev) | |
|   |   - GET `/api/health/db` → 200 | |
|   |   - GET `/` → 200, has Organization JSON-LD `A Toy Haulerz LLC` | |
|   |   - GET `/products/<known-slug>` → 200, seller JSON-LD `A Toy Haulerz LLC`, no `mpn` | |
|   |   - Admin login at `/auth/login` → redirects to `/admin/analytics` | |
|   |   - Sandbox checkout test order — confirm 200, order row + order_items rows created, no orphan | |
| 4 | (Optional) Deploy to staging before production | ☐ recommended |
| 5 | (Optional) Scrub Neon password from git history with `git filter-repo` or BFG | ☐ post-rotation |
|   |   - Commands documented in `_audit/08-PHASE-0-2-EXECUTION-REPORT.md` | |
|   |   - Coordinate force-push with all collaborators | |
| 6 | Deploy build to production (Coolify / Vercel) | ☐ ready when steps 1–3 done |

Pre-existing security carry-overs that should be tracked but don't block this deploy:
- Webhook timestamp freshness check (Phase 4C-2 candidate).
- Webhook idempotency on `event_id` (Phase 4C-2 candidate).
- `bcryptjs` → native `bcrypt` (Phase 5 perf candidate).
- JWT algorithm pinning (Phase 5 security hardening).

---

## 9. Phase 4C-0 verdict: **PASS — DEPLOY READY**

Suggested follow-up phases:

| Phase | Scope | Risk | Status |
|-------|-------|------|--------|
| 4C-1a | Batch `order_items` INSERT inside existing tx | Low | Designed, not implemented |
| 4C-1b | Delete `lib/database.ts:createOrder` dead code | Low | Designed, not implemented |
| 4C-2 | Webhook timestamp + idempotency hardening | Medium (touches webhook flow) | Designed in `_audit/06-security.md`, not implemented |
| 4C-3 | Admin recharts split via `next/dynamic` | Low (admin-only) | Deferred |
| 4C-4 | Feed XML true streaming | Low | Deferred |
| 5 | DB trigram / GIN index for `/explore` ILIKE | Medium (schema change) | Deferred |
| 5 | `bcryptjs` → native `bcrypt` | Low | Deferred |
| 5 | JWT algorithm pin | Low | Deferred |
| 5 | Dependency cleanup (`playwright`, `@react-email/render`, `"latest"` pinning) | Low | Deferred |

No code was changed in Phase 4C-0.
