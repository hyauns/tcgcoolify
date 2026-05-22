# Phase 4C-2B — Order Confirmation Email Polish

Date: 2026-05-22
Scope: customer-facing order confirmation email only. Two narrow changes — fix product title / price spacing collapse in email clients, and add a payment verification disclosure block with a link to the policy page. No payment, gateway, order-flow, webhook, status, or success-page code touched.

---

## 1. Files changed

| # | File | Status | Phase 4C-2B hunks |
|---|------|--------|-------------------|
| 1 | `lib/email/templates/order-confirmation.tsx` | modified | 3 hunks: (a) replace flex item layout with email-safe `<table>`; (b) insert payment verification block after Pricing Breakdown; (c) restructure text version's items list + add payment verification paragraph |

Total: **1 file edited.** Zero new files. Zero deletions. ~80 lines of net change, all in the single template module.

### Files explicitly NOT touched (verified by `git diff` against HEAD)

| Surface | Phase 4C-2B diff |
|---------|------------------|
| `lib/email/send-email.ts` | **no Phase 4C-2B change** (existing Phase 3 typo fixes remain) |
| `lib/email/templates/admin-order-notification.tsx` | **no Phase 4C-2B change** (admin internal template — out of customer-facing scope) |
| `lib/email/templates/welcome.tsx`, `password-reset.tsx`, `password-changed.tsx`, `email-verification.tsx` | **no Phase 4C-2B change** |
| `app/api/checkout/process/route.ts` | **no Phase 4C-2B change** |
| `app/api/orders/create/route.ts` | **no Phase 4C-2B change** |
| `app/api/orders/complete/route.ts` | **no Phase 4C-2B change** |
| `app/api/webhooks/gateway/route.ts` | **no Phase 4C-2B change** |
| `app/checkout/page.tsx` | **no Phase 4C-2B change** |
| `app/checkout/success/page.tsx` | **no Phase 4C-2B change** |
| Paydef integration / payload | **untouched** |
| Order status / payment_status / payment_transactions.status mapping | **untouched** |
| Subtotal / shipping / tax / total calculation | **untouched** |
| Conversion tracking | **untouched** |
| Success URL | **untouched** |
| DB schema | **untouched** |

---

## 2. Exact email layout fix

### Root cause

`lib/email/templates/order-confirmation.tsx:121` previously declared each line item with:

```tsx
<div style={{ ..., display: "flex", alignItems: "center" }}>
  <div style={{ flex: 1 }}>
    <div>{item.name}</div>
    <div>Quantity: {item.quantity} × ${item.price.toFixed(2)}</div>
  </div>
  <div>${(item.quantity * item.price).toFixed(2)}</div>
</div>
```

`display: flex` is **not supported in many mainstream email clients** (Outlook, parts of Gmail rendering, Apple Mail in some configurations strip or ignore it). When `flex` is stripped, the two child `<div>`s collapse and render block-by-block (top to bottom) or, in some clients, concatenate inline because the inner `<div style={{ flex: 1 }}>` becomes a plain block with no width control. That's how the customer saw:

```
Disney Lorcana: Wilds Unknown Booster Box$111.24
Quantity: 1 × $111.24
```

(title and the right-cell total rendered next to each other on the same line, with no whitespace between them).

### Fix

Each item is now rendered as a one-row `<table>` with two `<td>` cells — the universally supported email-safe layout pattern:

```tsx
<table cellPadding={0} cellSpacing={0} role="presentation" style={{ width: "100%", borderCollapse: "collapse", borderBottom: ... }}>
  <tbody>
    <tr>
      <td style={{ padding: "15px 12px 15px 0", verticalAlign: "top" }}>
        <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{item.name}</div>
        <div style={{ color: "#666", fontSize: "14px" }}>
          Quantity: {item.quantity} × ${item.price.toFixed(2)}
        </div>
      </td>
      <td style={{ padding: "15px 0", verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap", fontWeight: "bold", fontSize: "16px" }}>
        ${(item.quantity * item.price).toFixed(2)}
      </td>
    </tr>
  </tbody>
</table>
```

Properties:
- Title and line total live in **separate `<td>` cells** — they cannot collapse together because they are different DOM containers.
- `width: "100%"` + right-cell `textAlign: "right"` keeps the original two-column layout intent.
- `whiteSpace: "nowrap"` on the right cell prevents the dollar amount from wrapping.
- `role="presentation"` informs screen readers that this is a layout table, not data.
- No price/quantity/total **values** changed — only the markup containing them.

### Rendered preview (logical) for the user's example

For:
- `name = "Disney Lorcana: Wilds Unknown Booster Box"`
- `price = 111.24`
- `quantity = 1`

HTML now renders:

```
+-----------------------------------------------+--------+
| Disney Lorcana: Wilds Unknown Booster Box      |        |
|                                                | $111.24|
| Quantity: 1 × $111.24                          |        |
+-----------------------------------------------+--------+
```

No more `Booster Box$111.24` concatenation.

### Text-version cleanup

Before (single line):
```
Disney Lorcana: Wilds Unknown Booster Box - Qty: 1 × $111.24 = $111.24
```

After (title on its own line, indented detail):
```
Disney Lorcana: Wilds Unknown Booster Box
  Quantity: 1 × $111.24 = $111.24
```

Items now separated by blank lines for readability. No value changed.

---

## 3. Payment verification text added

### In the HTML email (line 168–195 of the rewritten template)

Inserted as a small attention block **between Pricing Breakdown and Shipping Address** — i.e. in the natural reading flow right after the customer sees the totals.

```tsx
<div style={{ background: "#fff8e1", padding: "16px 20px", borderRadius: "8px", margin: "20px 0", border: "1px solid #ffe0b2" }}>
  <h4 style={{ margin: "0 0 8px 0", color: "#8d6e00", fontSize: "14px" }}>Payment verification</h4>
  <p style={{ margin: 0, color: "#333", fontSize: "13px", lineHeight: "1.5" }}>
    Your card will not be charged immediately. A $0.00 authorization may be used to confirm that the card is active.
    Once our payment verification check is complete and your order is prepared for shipment, the final charge will be processed.
    {" "}
    <a href="https://tcglore.com/payment" style={{ color: "#1976d2", textDecoration: "underline" }}>
      Read more here
    </a>
    .
  </p>
</div>
```

- Light amber background (`#fff8e1`) + warm border (`#ffe0b2`) so the block reads as informational without alarming the customer.
- Heading color `#8d6e00` (muted gold) to match the amber palette.
- The link `Read more here` is a real `<a href="https://tcglore.com/payment">` — clickable in every email client.
- URL is exactly `https://tcglore.com/payment` (single slash after the host). Verified by grep.
- Inline `{" "}` between the closing period and the link prevents the link from gluing to the previous sentence.

### In the plain-text version (after the PRICING block)

```
PAYMENT VERIFICATION:
Your card will not be charged immediately. A $0.00 authorization may be used to confirm that the card is active. Once our payment verification check is complete and your order is prepared for shipment, the final charge will be processed.
Read more: https://tcglore.com/payment
```

- Same wording.
- Plain URL on its own line so any text-mode client auto-linkifies it.

---

## 4. Confirmation — Paydef, checkout, order, webhook, conversion, status all untouched

Every guard from the Phase 4C-2B brief was respected:

| Surface | Status |
|---------|--------|
| Paydef gateway endpoint / headers / payload | not opened, not edited |
| `app/api/checkout/process/route.ts` | zero edits this phase |
| `app/api/orders/create/route.ts` | zero edits this phase |
| `app/api/orders/complete/route.ts` | zero edits this phase |
| `app/api/webhooks/gateway/route.ts` | zero edits this phase — the webhook builds an `OrderEmailData` object and passes it into the same template; that data shape (and the webhook's own logic) is unchanged. The template now renders that same object more nicely. |
| `app/checkout/success/page.tsx` | not opened |
| Subtotal / shipping / tax / total computation | not opened |
| Order status (`'PENDING' / 'PROCESSING' / 'COMPLETED'`) | not opened |
| Payment status / payment_transactions.status mapping | not opened |
| Conversion tracking | not opened |
| Email send pipeline (`lib/email/send-email.ts`) | not opened |
| Admin order notification template | not opened (out of customer-facing scope) |

`git diff --stat` summary (Phase 4C-2B specific):

```
lib/email/templates/order-confirmation.tsx   | ~80 +/-
```

---

## 5. typecheck / lint / build result

Clean run from empty cache (`rm -rf .next tsconfig.tsbuildinfo`):

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | **PASS** — exit 0 | No errors. Logs: `_audit/p4c2b-typecheck.log` |
| `npm run lint` | **PASS** — exit 0 | 6 pre-existing warnings (none in `order-confirmation.tsx`). Logs: `_audit/p4c2b-lint.log` |
| `npm run build` | **PASS** — exit 0 | **146 / 146** static pages, zero `Critical dependency`, zero `unhandledRejection`, zero `_document` errors. Logs: `_audit/p4c2b-build.log` |

Bundle sizes match Phase 4C-2A — email templates are server-rendered for outgoing mail via `@react-email/render`, no client bundle delta.

---

## 6. Manual / preview verification

This repo does not have a built-in email-preview UI (no `react-email dev` script in `package.json`; only the `@react-email/components` + `@react-email/render` runtime is installed for production sending). End-to-end visual confirmation requires sending a test email, e.g.:

1. From an admin session, hit `POST /api/admin/test-email` with `{ "to": "you@example.com" }` (already secured with `requireAdmin()` from Phase 1). Note: `test-email` uses the generic test template, not the order template. For a real order template render, place a sandbox order and check the email Resend delivers.
2. Or, in a Node REPL with this repo as cwd:
   ```ts
   import { render } from "@react-email/render"
   import { OrderConfirmationTemplate } from "@/lib/email/templates/order-confirmation"
   const html = await render(OrderConfirmationTemplate({
     orderNumber: "ORD-TEST-12345",
     orderDate: new Date(),
     customerName: "Michael Ameling",
     items: [{ id: "1", name: "Disney Lorcana: Wilds Unknown Booster Box", price: 111.24, quantity: 1 }],
     subtotal: 111.24,
     shippingCost: 0,
     tax: 8.45,
     total: 119.69,
     currency: "USD",
     estimatedDelivery: new Date(Date.now() + 5 * 86400000).toLocaleDateString("en-US"),
     shippingAddress: {
       name: "Michael Ameling",
       street: "123 Main St",
       city: "Arnold",
       state: "MO",
       zipCode: "63010",
       country: "United States",
     },
   }))
   console.log(html)
   ```
   Verify that:
   - The HTML contains `<table` blocks for each item.
   - The string `Booster Box$111.24` does **not** appear concatenated anywhere.
   - The string `Payment verification` appears once.
   - The link `https://tcglore.com/payment` appears (no `//payment`).

Static checks that already pass automatically (verified during this phase via grep):
- `grep "tcglore.com//payment" lib/email/templates/order-confirmation.tsx` → **0 hits** (no double-slash bug)
- `grep "tcglore.com/payment" lib/email/templates/order-confirmation.tsx` → **2 hits** (HTML link + text link)
- `grep "display.*flex" lib/email/templates/order-confirmation.tsx` → **1 hit** (only in the explanatory comment, not in any style)
- `grep "Payment verification" lib/email/templates/order-confirmation.tsx` → **1 hit** (HTML heading; the text version uses uppercased `PAYMENT VERIFICATION:`)

---

## Phase 4C-2B verdict: **PASS — email template polished, deploy-safe**

- Items no longer collapse `title$price` in email clients that strip flex.
- Payment verification disclosure is visible in both HTML and plain-text email.
- Link to `https://tcglore.com/payment` is clean (single slash) and clickable.
- Email layout and design preserved otherwise.
- Zero touches to payment flow, order flow, webhook flow, status mapping, conversion tracking, or success page.
- Clean build PASS, 146/146 SSG.

### Rollback

Single-file revert:
```bash
git checkout HEAD -- lib/email/templates/order-confirmation.tsx
```

No DB migration, no env var, no dependency, no schema change. The template module is the only thing touched.

### Manual reminders (carry-over)

- [ ] Rotate Neon DB password (Neon console).
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel, CI.
- [ ] After deploy, place a sandbox order and check the delivered email contains the new layout + payment note.
- [ ] (Optional, post-rotation) scrub Neon password from git history.

### Still deferred (no changes in this phase)

| Phase | Scope |
|-------|-------|
| 4C-1b | Delete dead `lib/database.ts:createOrder` |
| 4C-2C (if desired) | Apply same flex-→-table fix to `admin-order-notification.tsx` for admin internal consistency (if admin's items list has the same bug; not investigated this phase per scope) |
| 4C-3 | Webhook timestamp freshness + `event_id` idempotency |
| 4C-4 | Admin recharts via `next/dynamic` |
| 4C-5 | Feed XML true streaming |
| 5 | DB trigram / GIN index for `/explore` |
| 5 | `bcryptjs` → native `bcrypt` |
| 5 | JWT algorithm pin HS256 |
| 5 | Dependency cleanup |
