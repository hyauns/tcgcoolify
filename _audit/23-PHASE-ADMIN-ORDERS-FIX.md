# Phase Admin Orders Fix — Cancel Email + Order Details Data

Date: 2026-05-23
Scope: two admin-side bugs reported after deploy — (1) admin order details modal shows "Guest / No Email / No items found" for every order, (2) cancelling an order does not send a customer notification. Patches are confined to admin-facing code and a new email template. Paydef, checkout, webhook, success page, conversion tracking — all untouched.

---

## 1. Files changed (4)

| # | File | Status | Purpose |
|---|------|--------|---------|
| 1 | `lib/database.ts` | modified | Fix admin orders queries: join `customers` (not `users`), and fetch `order_items` in `getOrderById`. |
| 2 | `lib/email/templates/order-cancellation.tsx` | **NEW** | Customer-facing cancellation email (HTML + plain-text). Mirrors brand style of `order-confirmation.tsx`. |
| 3 | `lib/email/send-email.ts` | modified | Import the new template; expose `sendOrderCancellation({ customerEmail, customerName, orderNumber, cancelledAt? })`. |
| 4 | `app/api/admin/orders/[id]/route.ts` | modified | PATCH handler now snapshots the order pre-update, then fires the cancellation email (fire-and-forget) only on the transition `non-cancelled → CANCELLED` and only when a real customer email exists. |

---

## 2. Root cause — Admin Order Details "Guest / No Email / No items found"

### Two independent bugs in `lib/database.ts`

**Bug 1 — wrong JOIN target.** `getOrders` and `getOrderById` both did:

```sql
LEFT JOIN users u ON o.customer_id::text = u.user_id::text
```

But `app/api/orders/create/route.ts:11-58` (helpers `resolveCustomerId` and `resolveGuestCustomerId`) **always** writes `orders.customer_id` from `customers.id` (a `SERIAL` integer, stored as VARCHAR), never from `users.user_id` (a UUID). So the join condition never matches — every order returns NULL for `customer_name` and `customer_email`, then the mapper hits the `|| "Guest"` / `|| "No Email"` fallback. Same bug surface for both the list and the detail modal.

**Bug 2 — items never fetched.** `getOrderById` selected `o.*` only. The frontend (`app/admin/orders/page.tsx:294-302`) reads `selectedOrder.items?.map(...)` → undefined → `<p>No items found</p>`.

### Fix

Both queries now join the correct table:

```sql
LEFT JOIN customers c ON c.id::text = o.customer_id::text
```

`customers` already has `email`, `first_name`, `last_name` (`scripts/01-create-analytics-tables.sql:19-29`), so the column aliases (`customer_name`, `customer_email`) are unchanged downstream.

`getOrderById` additionally runs a second query:

```sql
SELECT id, product_id, product_name, quantity, unit_price, total_price
FROM order_items
WHERE order_id = ${Number(order.id)}
ORDER BY id ASC
```

…and maps the rows into the shape the frontend already expects:

```ts
items: itemRows.map(row => ({
  id, product_id,
  name: row.product_name,
  price: Number(row.unit_price),
  quantity: Number(row.quantity),
  total_price: Number(row.total_price),
}))
```

`name` / `price` / `quantity` match the modal's read sites at `app/admin/orders/page.tsx:297-300`.

### Side benefit (no UI change required)

The same query change in `getOrders` means the **list view** now also shows correct name/email — previously every row also said "Guest" / "No Email" for the same reason. No UI edits were needed.

### Caveat — historical data

Orders whose `customers` row never got populated (e.g. the seeded test order `ORD-TEST-001` from `scripts/09-create-orders-tables.sql:48` with `customer_id = 'test-customer'`) will still show "Guest" / "No Email" — that's because there is no matching `customers.id`. This is correct: data is genuinely absent, not a query bug.

---

## 3. Cancellation email — implementation

### New template — `lib/email/templates/order-cancellation.tsx`

- React + render-to-HTML, plain-text companion `getOrderCancellationText`, same pattern as the other 6 templates.
- Subject (set in `sendOrderCancellation`): `"Your TCG Lore order has been cancelled - {orderNumber}"`.
- Content:
  - "Hi {customerName}," / "Your order has been cancelled. If you believe this was a mistake or have any questions, please reach out to our team."
  - Order number + cancelled date (table layout for email-client safety, same as Phase 4C-2B).
  - A payment note worded safely so it stays correct whether only an authorization was placed OR a final charge was processed:
    > "If a payment authorization was placed for this order, it will be handled according to your payment provider's timeline."
  - **Does NOT claim** that a refund was processed (the code does not call any refund API).
  - **Does NOT claim** that the payment was voided (the code does not call any void API).
  - Same gradient header, brand colors, contact block, and `Operated by A Toy Haulerz LLC` footer as `order-confirmation.tsx`.

### Send function — `lib/email/send-email.ts`

```ts
export async function sendOrderCancellation(params: {
  customerEmail: string
  customerName: string
  orderNumber: string
  cancelledAt?: Date
}): Promise<{ success: boolean; messageId?: string; error?: string }>
```

Uses the existing `sendEmailWithRetry()` wrapper (already handles 3-attempt exponential backoff + Resend error capture).

### PATCH route guard — `app/api/admin/orders/[id]/route.ts`

```ts
const prevOrder = await adminDb.getOrderById(params.id)        // snapshot before write

await adminDb.updateOrderStatus(params.id, status, tracking)   // existing line unchanged
await revalidateProductPages()                                  // existing line unchanged

if (
  status === "CANCELLED" &&
  prevOrder &&
  prevOrder.status !== "CANCELLED"                              // dedup guard
) {
  const email = prevOrder.customer?.email
  const hasRealEmail = !!email && email !== "No Email" && email.includes("@")
  if (!hasRealEmail) {
    console.warn("[admin-orders] Cancellation email skipped — no customer email")
  } else {
    // fire-and-forget — mirrors webhook IIFE pattern, doesn't block PATCH response
    ;(async () => { try { await sendOrderCancellation({...}) } catch (e) { console.error(...) } })()
  }
}
```

Why this satisfies all 6 cancellation rules from the prompt:
- **Rule 3 ("không gửi nếu đã cancelled trước")** — `prevOrder.status !== "CANCELLED"` early-out.
- **Rule 3 ("không gửi nếu không có email")** — `hasRealEmail` triple check: non-empty, not the `"No Email"` literal fallback, contains `@`.
- **Rule 3 ("không gửi nếu cancel update fail")** — email block sits AFTER `updateOrderStatus()` resolves; on update throw, control jumps to the outer `catch` and email is never attempted.
- **Rule 4 ("gửi sau khi DB update thành công")** — by ordering.
- **Rule 5 ("email fail không rollback")** — fire-and-forget IIFE with inner try/catch; the PATCH response returns 200 regardless.
- **Rule 7 ("không refund / void payment")** — no payment-side API is called; only an email is sent.

---

## 4. Duplicate-email guard (Task 5) — explicit trace

| Scenario | Behavior |
|---|---|
| Order is `PENDING`, admin selects `CANCELLED` | `prevOrder.status === 'PENDING'` ≠ `'CANCELLED'` → email sent. |
| Order already `CANCELLED`, admin selects `CANCELLED` again | `prevOrder.status === 'CANCELLED'` → block skipped → no email. |
| Order is `PROCESSING`, admin selects `SHIPPED` | `status !== 'CANCELLED'` → block skipped → no email. |
| Order is `CANCELLED`, admin selects `PROCESSING` | `status !== 'CANCELLED'` → block skipped → no email. (Reactivation is not in scope.) |

The PATCH response still returns `{ success: true }` in all 4 cases — the email is a side-effect, not a precondition.

---

## 5. Protected surfaces — verified

`git diff HEAD --stat` for the protected surfaces returns **zero output** this phase. Specifically:

| Surface | Status |
|---|---|
| `app/api/checkout/process/route.ts` | **unchanged this phase** |
| `app/api/orders/create/route.ts` | **unchanged this phase** |
| `app/checkout/success/page.tsx` | **unchanged this phase** |
| `app/checkout/page.tsx` | **unchanged this phase** |
| `app/api/webhooks/gateway/route.ts` | **unchanged this phase** |
| `lib/email/templates/order-confirmation.tsx` | **unchanged this phase** |
| Paydef payload / endpoint / fetch | **unchanged** |
| Conversion tracking | **unchanged** |
| Webhook signature / statusMap / idempotency | **unchanged** |
| Order/payment status string literals in protected files | **unchanged** |
| DB schema | **unchanged** (only changed queries, no DDL) |

This phase's diff is confined to:
- `lib/database.ts` (2 queries: `getOrders`, `getOrderById`).
- `lib/email/send-email.ts` (1 import + 1 new exported function).
- `app/api/admin/orders/[id]/route.ts` (1 import + 1 hunk in `PATCH`).
- `lib/email/templates/order-cancellation.tsx` (new file).

---

## 6. Verification

True-clean run per [[feedback-true-clean-check]] (`rm -rf .next tsconfig.tsbuildinfo` first):

| Step | Result | Log |
|---|---|---|
| `npm run typecheck` | ✅ PASS, zero output | `_audit/padmin-typecheck.log` |
| `npm run lint` | ⚠ PASS — only the 6 pre-existing warnings ([[project-deferred-work]]) | `_audit/padmin-lint.log` |
| `npm run build` | ✅ `✓ Compiled successfully` / `✓ Generating static pages (146/146)` | `_audit/padmin-build.log` |

### Manual admin test checklist (post-deploy)

| # | Action | Expected |
|---|---|---|
| 1 | `/admin/orders` list view — pick a real order created via `/checkout` | Customer column shows `first_name last_name` + email from `customers` row; "Guest"/"No Email" only appears if that order's `customers` row is genuinely empty. |
| 2 | Click 👁 to open Order Details modal | "Customer Information" shows real name + email; "Order Items" lists each line (name, qty, line total); "Total" matches `orders.total_amount`. |
| 3 | Open a guest-checkout order details | Name/email come from `customers` row that `resolveGuestCustomerId` populated with the guest's email. |
| 4 | Change a non-cancelled order's status → `CANCELLED` | DB row updates; customer receives cancellation email exactly once; admin can refresh the list and see `CANCELLED` badge. |
| 5 | Re-trigger cancel on same order (select `CANCELLED` again) | No second email is sent. PATCH still returns 200. Check logs for absence of `[v0] sendOrderCancellation` for the second click. |
| 6 | Cancel an order whose `customers.email` is empty/null | Status update still succeeds. Log line `[admin-orders] Cancellation email skipped — order N has no customer email`. No throw. |
| 7 | Cancel test order `ORD-TEST-001` (seeded with `customer_id = 'test-customer'`) | Status updates; email is skipped (no matching `customers` row); log shows the skip warning. |
| 8 | Check Resend dashboard for any cancellation send | Subject is `"Your TCG Lore order has been cancelled - ORD-..."`. No refund/void claims in body. |
| 9 | Paydef sandbox checkout end-to-end after this deploy | Unchanged behavior — orders still go to `success`, conversion tracking fires, confirmation email sends (Phase 4C-3B idempotency still active). |

---

## 7. Caveats

- **Historical orders without items / without a `customers` row** will continue to look empty in admin details. This is data reality, not a code bug. The seed order `ORD-TEST-001` (and any orders inserted before the customer-resolve flow was added) fall into this category.
- **No refund / void was performed.** The cancellation email explicitly avoids any wording that would suggest one. If you want to actually refund/void via Paydef on cancel, that is a separate phase — would require touching the gateway integration, which is out of scope per the prompt's rule 7-8.
- **Email send failures are not surfaced to the admin UI.** They are logged to the server console only. The PATCH response is `{ success: true }` whether the email succeeded or not — this matches the gateway-webhook fire-and-forget pattern. If a customer didn't get the email, check the Resend dashboard and `[v0] sendOrderCancellation` log lines.
- **First open of an order details modal after this deploy may show a stale items array** if the browser cached a previous JSON response. Hard reload to be sure. (Not a code bug — `app/api/admin/orders/[id]/route.ts` already has `export const dynamic = 'force-dynamic'`.)

---

## 8. Risk level

**Low.** Surface is admin-only; no payment / checkout / webhook / success / DB-schema impact. Worst case if the new template throws is one missed cancellation email (caught by the outer IIFE try/catch and logged) — the status update itself still succeeds and PATCH still returns 200.
