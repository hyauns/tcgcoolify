# Phase 4C-2 — Blocker Report (Audit Only, NO Patch Applied)

Date: 2026-05-22
Status: **STOPPED before patch** per Phase 4C-2 rule #10 — gateway charge confirmed incorrect.

---

## 1. Severity classification: **HIGH (Case B)** — mixed with **LOW (Case A)** address bug

The investigation found **two distinct root causes**, with very different severity levels. Reporting both before any code change, per rule "audit-first, patch-later" and rule #10.

### Bug 1 — Shipping amount sent to Paydef is wrong (**HIGH / Case B**)

**The gateway IS being charged the wrong amount.** The amount disagrees with what the checkout UI promises the customer.

### Bug 2 — Email + webhook address mapping reads wrong keys (**LOW / Case A**)

Display-only mismatch — `address1` / `postalCode` are camelCase but the DB stores snake_case (`address_line1` / `postal_code`). The order data is in the database correctly; only the email-payload builders mis-key the lookup.

---

## 2. Root cause — Bug 1 (HIGH)

**Single hardcoded line** at `app/checkout/page.tsx:1046`:

```ts
// In handleSubmit() — the body that POSTs to /api/orders/create:
const shippingAmount = formData.shippingMethod === "express" ? 15.99 : 5.99
```

This is **separate from** the UI display calculation at line 736, which is correct:

```ts
// UI display — uses real prices ($9.99/$19.99/$39.99) and the $75 free threshold
const shippingCost =
  subtotal >= 75 && formData.shippingMethod === "standard"
    ? 0
    : selectedShipping?.price || 0   // 9.99 / 19.99 / 39.99
```

So the customer **sees one number** (UI) and the server **stores a different number** (payload).

### Comparison table — what user sees vs. what Paydef is charged

| Shipping method | Subtotal | UI shows | UI promise | Payload `shippingAmount` | DB `shipping_amount` | DB `total_amount` (sent to Paydef) | Customer outcome |
|----|----|----|----|----|----|----|----|
| standard | < $75 | $9.99 | pay $9.99 | **$5.99** | $5.99 | subtotal + $5.99 + tax | Merchant under-collects $4 per order |
| standard | ≥ $75 | $0 / **Free** | pay $0 | **$5.99** | $5.99 | subtotal + $5.99 + tax | Customer **overcharged $5.99** vs Free promise |
| express | any | $19.99 | pay $19.99 | **$15.99** | $15.99 | subtotal + $15.99 + tax | Merchant under-collects $4 per order |
| overnight | any | $39.99 | pay $39.99 | **$5.99** | $5.99 | subtotal + $5.99 + tax | Merchant under-collects $34 per order |

The customer-facing impact (overcharge on free-shipping orders) is the user-visible symptom that triggered this audit; the merchant-facing impact (under-collecting $4–$34) is the silent loss.

### Server side trusts the client

`app/api/orders/create/route.ts` recomputes `subtotal` and `taxAmount` server-side, but **reads `shippingAmount` from the client body**:

- Line 211: `shipping: Number(shippingAmount || 0)` — passed into TaxJar
- Line 218: `verifiedTotalAmount = serverSubtotal + Number(shippingAmount || 0) + verifiedTaxAmount`
- Line 243: `INSERT INTO orders ... shipping_amount = ${Number(shippingAmount || 0)}`
- Line 351: `INSERT INTO payment_transactions ... amount = ${formattedTotalAmount}` (computed from the wrong shipping)

`app/api/checkout/process/route.ts:25-30` reads `amount` from `payment_transactions` (server-trusted at this stage), but **the value stored there was already poisoned upstream**. Paydef receives that amount.

This exact pre-existing risk was already flagged in `_audit/06-security.md` SEC P2-6 — "Order creation: client-supplied `shippingAmount` is trusted". The risk has now materialized in production.

---

## 3. Root cause — Bug 2 (LOW)

The order's shipping address IS stored correctly in `orders.shipping_address` (JSON column) by `sanitizeAddress()` in `orders/create/route.ts:60-71`:

```ts
function sanitizeAddress(raw: Record<string, any>) {
  return {
    first_name:     raw.firstName ?? raw.first_name ?? "",
    last_name:      raw.lastName  ?? raw.last_name  ?? "",
    address_line1:  raw.address1  ?? raw.addressLine1 ?? raw.address ?? "",
    address_line2:  raw.address2  ?? raw.addressLine2 ?? null,
    city:           raw.city ?? "",
    state:          (raw.state ?? "").slice(0, 10),
    postal_code:    raw.zipCode ?? raw.postalCode ?? "",
    country:        raw.country ?? "United States",
    phone:          raw.phone ?? null,
  }
}
```

Output keys are **snake_case**: `address_line1`, `postal_code`, `first_name`, `last_name`.

Email-payload builders in **two places** read with camelCase keys instead:

`app/api/checkout/process/route.ts:159-162` (fire-and-forget email after gateway success):
```ts
shippingAddress: {
  name:    shippingName,
  street:  parsedShipping?.address1 || "Address not provided",   // ← wrong key
  city:    parsedShipping?.city     || "City not provided",
  state:   parsedShipping?.state    || "State not provided",
  zipCode: parsedShipping?.postalCode || "ZIP not provided",     // ← wrong key
  country: parsedShipping?.country  || "Country not provided",
},
```

`app/api/webhooks/gateway/route.ts:230-235` (background email after webhook):
```ts
shippingAddress: {
  name:    shippingName,
  street:  parsedShipping?.address1 || "Address not provided",   // ← same bug
  ...
  zipCode: parsedShipping?.postalCode || "ZIP not provided",     // ← same bug
  ...
},
```

The corresponding correct read pattern is in `app/api/orders/complete/route.ts:108-126` (which handles both snake_case and camelCase):
```ts
street:  value.address_line1 ?? value.address1 ?? value.addressLine1 ?? "Address not provided",
zipCode: value.postal_code   ?? value.zipCode ?? value.postalCode    ?? "ZIP not provided",
```

So `/api/orders/complete` (the success-page polling endpoint) displays addresses correctly; only the **email-payload code paths** are broken.

`firstName` / `lastName` in the same email payload are also wrong:
```ts
const shippingName = parsedShipping?.firstName
  ? `${parsedShipping.firstName} ${parsedShipping.lastName || ''}`.trim()
  : payload.buyer_name || "Customer"
```
DB stores `first_name` / `last_name` (snake), so `parsedShipping?.firstName` is `undefined` → falls back to `payload.buyer_name` (from Paydef) or `"Customer"`. In the user's example, "AMELING MICHAEL" comes from Paydef's `buyer_name`, not from the DB shipping_address — consistent with this bug.

---

## 4. Account orders display (`/account?tab=orders`)

`app/api/account/orders/route.ts` reads from the DB **directly**, no constant arithmetic. `app/account/page.tsx:326,451` displays `order.total_amount` directly.

**No client-side `+ $5.99` is added.** What the user sees on `/account?tab=orders` is the actual `orders.total_amount` value in the DB.

Because Bug 1 poisons the stored `total_amount`, **account orders correctly displays the wrong number**. Fixing the upstream source (Bug 1) automatically fixes the account display for new orders. Historical orders remain wrong unless backfilled (see §10).

---

## 5. All `$5.99` occurrences

Repo-wide grep `5\.99` across `app/`, `lib/`, `hooks/`, `components/`:

| File:line | Context |
|----------|---------|
| `app/checkout/page.tsx:1046` | `const shippingAmount = formData.shippingMethod === "express" ? 15.99 : 5.99` — **the root-cause line** |

**Only one occurrence.** All other shipping prices in the repo use the correct `9.99 / 19.99 / 39.99` and the `>= 75` threshold:

- `app/checkout/page.tsx:698,707,716` — shippingOptions array with `9.99 / 19.99 / 39.99` (UI source-of-truth)
- `app/checkout/page.tsx:736` — UI `shippingCost` calc with $75 threshold (correct)
- `app/api/feeds/[uuid]/route.ts:239,249,254` — GMC feed `<g:shipping>` blocks (correct, mirrors PDP)
- `app/products/[slug]/page.tsx:141,225,252` — PDP JSON-LD `shippingDetails` (correct)
- `app/shipping/page.tsx:144,184,225` — `/shipping` policy page (correct)
- `lib/delivery-calculator.ts:29,40,51` — internal helper with `9.99 / 19.99` and `>= 75` threshold (correct)
- `app/cart/cart-page-client.tsx:299` — cart shipping calc with `9.99` (correct)
- `app/components/enhanced-delivery-calculator.tsx:174-175` — delivery-calculator component with `>= 75` (correct)

---

## 6. Why I am stopping before patching

Per the Phase 4C-2 rules:

> **Rule #3**: Không sửa `app/api/checkout/process/route.ts` trừ khi audit chứng minh amount đang charge sai và patch được low-risk.
> **Rule #10**: Nếu phát hiện Paydef đã charge sai amount, dừng và report severity HIGH trước khi patch logic payment.

The audit has now proven the gateway charge is wrong. The fix for Bug 1 requires changing **what number Paydef gets charged**, which is exactly the payment-logic change the rules want explicit acknowledgement on.

The fix for Bug 2 is display-only and could be patched in isolation under rule #11 ("display/email/account mapping... không đụng gateway"). I am also reporting Bug 2 in this blocker report so you can decide whether to patch only Bug 2 now, only Bug 1, or both together.

**No code has been changed in Phase 4C-2.**

---

## 7. Recommended fix — Bug 1 (HIGH)

### Approach: server-side shipping computation, never trust client `shippingAmount`

The canonical source must move to the server. Two surgical components:

**A.** New helper `lib/shipping.ts`:

```ts
export const SHIPPING_TIERS = {
  standard:  { id: "standard",  name: "Standard Shipping",  price: 9.99,  freeThreshold: 75 },
  express:   { id: "express",   name: "Express Shipping",   price: 19.99 },
  overnight: { id: "overnight", name: "Overnight Shipping", price: 39.99 },
} as const

export type ShippingMethodId = keyof typeof SHIPPING_TIERS

/**
 * Canonical shipping calculation. Mirrors the UI logic at app/checkout/page.tsx:736
 * but lives on the server so the client cannot manipulate the value sent to the
 * payment gateway. The free-threshold applies ONLY to the Standard tier.
 */
export function calculateShipping(method: ShippingMethodId, subtotal: number): number {
  const tier = SHIPPING_TIERS[method] ?? SHIPPING_TIERS.standard
  if (method === "standard" && subtotal >= tier.freeThreshold!) return 0
  return tier.price
}
```

**B.** Patch `app/api/orders/create/route.ts`:

- Stop reading `shippingAmount` from the request body.
- Read `shippingMethod` from the body (currently the client doesn't even send it; the body sends `shippingAmount` directly — needs the client to send the method instead).
- Server: `const shippingAmount = calculateShipping(shippingMethod, serverSubtotal)`.
- Continue using `shippingAmount` in `verifiedTotalAmount`, `INSERT orders.shipping_amount`, and `payment_transactions.amount`.

**C.** Patch `app/checkout/page.tsx:1066-1078` — POST body changes:

- Remove `shippingAmount: Number` from the body.
- Add `shippingMethod: formData.shippingMethod` to the body.
- Remove `totalAmount` from the body too (server computes it; was already mostly ignored by the server since it recomputes `verifiedTotalAmount`).

Touched files: **3 files** (one new helper, one route, one client page). All changes are surgical and reviewable. Transaction boundary unchanged. Paydef payload format unchanged (still receives an `amount`, just now correct).

Response shape unchanged — the `order.total` field in the response still reflects `total_amount` from the DB row.

**Risk level**: **Medium** — touches the order-creation request shape (one new field, two removed). Requires a coordinated deploy because the client and server changes ship together. If they get out of sync (server deployed before client) the server would not know the shipping method → falls back to `standard` → free if `subtotal >= 75` else $9.99. That's safer than the current behavior but still not what the customer chose if they picked express/overnight.

**Test plan**:
1. Standard, subtotal $50 → UI $9.99, payload sends method "standard", server stores $9.99, Paydef charges total with $9.99 shipping, email shows $9.99, account shows $9.99 total
2. Standard, subtotal $100 → UI Free, server stores $0, Paydef charges total with $0 shipping
3. Express, subtotal $50 → UI $19.99, server stores $19.99, gateway charged $19.99
4. Overnight, subtotal $50 → UI $39.99, server stores $39.99
5. Tax recalc respects new shipping (TaxJar input changes)
6. Payment failure → order remains PENDING, transaction reflects correct amount
7. Webhook reconciliation → order COMPLETED, amount unchanged from creation

---

## 8. Recommended fix — Bug 2 (LOW)

Single-file pattern, can be applied in either or both of the email-payload sites:

**`app/api/checkout/process/route.ts:159-164`** and **`app/api/webhooks/gateway/route.ts:230-235`**:

Replace:
```ts
street:  parsedShipping?.address1 || "Address not provided",
zipCode: parsedShipping?.postalCode || "ZIP not provided",
```

With the same pattern used by `app/api/orders/complete/route.ts:120-123`:
```ts
street:  parsedShipping?.address_line1 ?? parsedShipping?.address1 ?? parsedShipping?.addressLine1 ?? "Address not provided",
zipCode: parsedShipping?.postal_code ?? parsedShipping?.zipCode    ?? parsedShipping?.postalCode    ?? "ZIP not provided",
```

Similarly for `shippingName`:
```ts
const firstName = parsedShipping?.first_name ?? parsedShipping?.firstName ?? ""
const lastName  = parsedShipping?.last_name  ?? parsedShipping?.lastName  ?? ""
const shippingName = `${firstName} ${lastName}`.trim() || payload.buyer_name || "Customer"
```

**Touched files**: 2 files, 6 lines total. Pure display fix, no DB / payment / gateway / webhook contract change.

**Risk level**: **Low**. Worst case: if `parsedShipping` has both snake_case AND camelCase keys with different values (impossible in this codebase — `sanitizeAddress` only emits snake_case), snake_case wins. No regression.

---

## 9. Decision matrix — what to patch and when

| Option | Bug 1 (gateway charge) | Bug 2 (email address) | Risk | Touches Paydef logic? |
|--------|------------------------|------------------------|------|------------------------|
| **A — patch both** | fixed | fixed | Medium (coordinated client+server deploy) | Yes (amount computation) |
| **B — patch only Bug 2 now, Bug 1 next phase** | unchanged (still wrong charge) | fixed | Low | No |
| **C — patch only Bug 1 now** | fixed | unchanged (still "Address not provided") | Medium | Yes |
| **D — patch nothing, document and schedule** | unchanged | unchanged | None — but customers stay overcharged on free-shipping orders | No |

**My recommendation: Option A** (both, in a single Phase 4C-2a + 4C-2b PR). Bug 1 is a real business issue (overcharging some customers, undercharging the merchant on others). Bug 2 makes the email look unprofessional and harms perceived legitimacy with new customers — relevant given recent GMC scrutiny.

Both fixes are surgical. Combined, they touch 4 files (helper, orders/create, checkout/page, plus the 2 email sites) and ~30 lines of code, with no DB schema change, no Paydef payload format change, no status mapping change, no success URL change, no webhook code change.

**Per the rules**, I will not patch any of this until you confirm which option to take and explicitly authorize touching the payment-amount computation in `orders/create`.

---

## 10. Historical orders caveat

Orders created **before** the Bug 1 fix have wrong `shipping_amount` and `total_amount` values in the DB. These cannot be silently auto-fixed because:

1. The customer was already charged the wrong amount via Paydef. The charge in Paydef's books is the source of truth for what the customer actually paid; the DB row records what TGC Lore thought it was charging.
2. For overcharge cases (free-shipping orders charged $5.99), the customer was charged ~$5.99 too much. Decision is a business call: refund the difference, or leave it.
3. For undercharge cases (express/overnight charged less than $19.99/$39.99), the customer received a better deal than advertised. Decision is also a business call.

Options for historical data:
- **Leave historical orders alone.** Future orders ship correct. The visible total in `/account?tab=orders` for old orders continues to reflect what Paydef charged. Cleanest, no data migration risk.
- **Backfill `shipping_amount` only in DB** (not in Paydef). Re-compute the correct shipping for each old order, update DB. Customer-facing email/account would then show "correct" amounts but Paydef records would mismatch. Causes accounting confusion.
- **Issue refunds/charges via Paydef API for the delta**. Heavy operational work; needs business approval; not in software scope.

**Recommend Option 1** unless legal/finance directs otherwise. No code change in this audit.

---

## 11. Explicit no-touch confirmation (audit-only this phase)

By the end of this audit, every protected surface was verified untouched by `git diff`:

| File / surface | Diff status |
|----------------|-------------|
| `app/api/orders/create/route.ts` | only Phase 4C-1 hunk from prior phase (batch insert) — no new edit in Phase 4C-2 |
| `app/api/checkout/process/route.ts` | unchanged |
| `app/api/webhooks/gateway/route.ts` | unchanged |
| `app/api/orders/complete/route.ts` | unchanged |
| `app/checkout/page.tsx` | unchanged |
| `app/checkout/success/page.tsx` | only Phase 4B-2 null-safety hunk from prior phase |
| Paydef payload, gateway endpoint, conversion tracking | unchanged |
| Order status / payment_status / payment_transactions status mapping | unchanged |
| Success URL `/checkout/success?orderNumber=...` | unchanged |
| DB schema | unchanged |

---

## 12. typecheck / lint / build

No code change → no need to run again. Last clean build was Phase 4C-1 (`_audit/p4c1-build.log`): **PASS exit 0, 146/146 SSG, zero Critical dependency, zero unhandledRejection**. State is deploy-ready up to and including Phase 4C-1.

---

## 13. Manual test checklist — not exercised this phase

Cannot test live without changing code. Test cases for whichever option you authorize would be:

For Option A (full fix):
1. Standard < $75 → UI/email/account all show $9.99 shipping
2. Standard ≥ $75 → UI/email/account all show $0 / Free
3. Express → all show $19.99
4. Overnight → all show $39.99
5. Address displayed in email matches checkout input
6. Paydef sandbox: charged amount equals UI promise
7. Tax recalculated against new shipping amount
8. Account orders for new test orders match email

For Option B (display only):
1. Address displayed in email matches checkout input — verified locally by reading DB row + reading sent email
2. Existing wrong shipping amount remains visible — acknowledged

---

## 14. Rollback instruction (if/when patched)

Both fixes are single-file or two-file hunks. Revert is `git checkout HEAD -- <file>` per touched file. No DB migration to undo. No env var to revert. No dependency to reinstall.

---

## Phase 4C-2 verdict: **BLOCKED — awaiting decision on which option to apply**

Please pick A / B / C / D from §9. The exact patch diffs are designed and waiting in §7 (Bug 1) and §8 (Bug 2). I will apply nothing further until you respond.

### Manual reminders (carry-over, unchanged)

- [ ] Rotate Neon DB password.
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel, CI.
- [ ] (Optional, post-rotation) scrub Neon password from git history with `git filter-repo` or BFG.
