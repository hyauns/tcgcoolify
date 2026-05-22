# Phase 4C-3 — Webhook Hardening: Timestamp Freshness (event_id idempotency proposed only)

Date: 2026-05-23
Scope: address two carry-over P1 security findings from `_audit/06-security.md` (P1-1 Webhook lacks timestamp freshness, P1-2 Webhook is not idempotent). Audit-first per [[feedback-stop-before-payment-patch]] before any patch. Paydef integration, status mapping, conversion tracking, DB schema — all untouched.

**Outcome**: only the timestamp-freshness check is applied in this phase. `event_id` idempotency requires a DB migration that has *not* been applied; the SQL + code design are proposed below and queued for a follow-up phase pending owner confirmation.

---

## 1. Audit findings (Task 1)

### Webhook surface map

| Aspect | Finding (file:line) |
|---|---|
| Endpoint / method | `POST /api/webhooks/gateway` — `app/api/webhooks/gateway/route.ts:60` |
| Required headers | `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-Event` (all enforced — `route.ts:67-76`) |
| Documented headers gateway sends | `X-Webhook-Source`, `X-Webhook-Event`, `X-Webhook-Timestamp`, `X-Webhook-Event-ID`, `X-Webhook-Delivery-ID`, `X-Webhook-Attempt`, `X-Webhook-Signature` (`app/docs/WEBHOOK_INTEGRATION_GUIDE.md:9-18`) |
| Timestamp format | **ISO 8601 string** (e.g., `2026-04-19T10:15:30.000Z`) — confirmed in guide line 14 + payload schema line 39. Not Unix seconds, not ms. |
| Timestamp in signed HMAC input? | **Yes.** `verifyGatewaySignature` signs `${timestamp}.${rawBody}` (`route.ts:44`). Guide confirms (`WEBHOOK_INTEGRATION_GUIDE.md:22`). Therefore tamper-resistant. |
| `event_id` location | **Both** header (`X-Webhook-Event-ID`) and JSON body (`payload.event_id`). Guide line 15 + payload schema line 33. Currently neither is read by the handler. |
| HMAC inputs | `timestamp` + `"."` + `rawBody` — algorithm `HMAC-SHA256`, secret = `WEBHOOK_SECRET` (DB-resident via `getWebhookSecret()`). |
| `timingSafeEqual` correctness | Correct: length-compares first, then constant-time compare on `Buffer.from(..., "hex")` (`route.ts:50-57`). |
| DB updates on `payment.capture.completed` | `UPDATE payment_transactions SET status, card_last_4, card_brand, buyer_name, billing_address` (`route.ts:152-160`); then `UPDATE orders SET payment_status='COMPLETED', status='PROCESSING'` (`route.ts:165-171`). |
| Email side effects | Fire-and-forget IIFE inside `if (existingTx.order_id)` block (`route.ts:181-263`): `sendOrderConfirmation` + `sendAdminOrderNotification`. Sent for **every** invocation that finds a matching transaction. |
| What happens on gateway retry of the same event | The UPDATE statements are idempotent in effect (same values written), but the email IIFE re-fires both customer-confirmation and admin-notification emails on every replay. |

### Severity classification (per [[feedback-stop-before-payment-patch]])

- Timestamp freshness — **Case A.** No DB / gateway / status / amount impact. Adding a freshness window is a pure pre-check before any DB write. Safe to patch.
- `event_id` idempotency — **Mixed (lean Case A).** No status mapping or amount change, but it gates a DB write (insert into a new table) and gates side-effects (email). The new table doesn't exist yet, so applying code without the migration would crash every webhook. **Audit-only this phase.**

---

## 2. Task 2 — Timestamp freshness check (PATCHED)

### Decision

| Question | Answer |
|---|---|
| Timestamp seconds, ms, or ISO? | ISO 8601 string |
| Timestamp in signed input? | Yes — included before HMAC compare |
| Strict reject safe? | Yes — header is already required (`route.ts:71-76`), so gateway always emits it |
| Window | **5 minutes** (matches Stripe / Shopify; tolerant of normal NTP skew) |
| Order of check | After signature verification (so we don't leak whether the header value parses), before JSON.parse and before any DB write |
| Compatibility / log-only mode? | Not needed — fresh-from-gateway requests will always be < 5 min old. Replays are exactly the failure mode we want to reject. |

### Diff applied — `app/api/webhooks/gateway/route.ts`

Single hunk, 10 lines inserted between the signature check (line 89-92) and `JSON.parse` (line 94):

```ts
  // Reject replays / stale events. The gateway's X-Webhook-Timestamp is an
  // ISO 8601 string (per WEBHOOK_INTEGRATION_GUIDE.md) and is part of the
  // signed HMAC input, so the value is tamper-resistant. A 5-minute window
  // matches Stripe/Shopify defaults and tolerates normal NTP clock skew.
  const timestampMs = new Date(timestamp).getTime()
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    console.error("[gateway-webhook] Stale or invalid timestamp:", timestamp)
    return NextResponse.json({ error: "Stale or invalid timestamp" }, { status: 400 })
  }
```

Edge cases handled:
- `new Date("garbage").getTime()` → `NaN`. `Number.isFinite(NaN)` → false → rejected.
- Future-dated (clock skew on gateway side) → also rejected once it exceeds the 5-min absolute window.
- Live gateway delivery: ISO timestamps from the gateway are emitted at send-time and arrive within seconds → always pass.

---

## 3. Task 3 — event_id idempotency (AUDIT + PROPOSAL ONLY, no patch)

### Existing DB audit

`grep -rn` confirms no existing table or column for webhook event de-duplication:
- No `processed_webhook_events`, `webhook_events`, `payment_webhook_events` table in any of `database/schema.sql`, `scripts/04-create-payment-schema.sql`, `scripts/09-create-orders-tables.sql`, or any other migration script.
- No `event_id` column on `payment_transactions` (`scripts/04-create-payment-schema.sql:64-80`).
- `payment_transactions.gateway_response` is `JSONB` and could in theory store the last event_id, but it's not unique-indexed and has no enforcement.

→ A migration is required. Project pattern: numbered SQL files in `scripts/` applied manually against Neon (no automated runner). Per rule 11 of this phase ("Không đổi DB schema nếu chưa có migration plan rõ"), the migration must be authorized by the owner before applying.

### Proposed migration — `scripts/15-create-processed-webhook-events.sql` (NOT created yet, requires owner approval)

```sql
-- Webhook event idempotency table.
-- Inserts use event_id as the natural unique key. Duplicates (e.g. gateway
-- retries the same delivery) raise a UNIQUE_VIOLATION which the handler
-- catches and converts to a 200 OK without re-firing side effects.

CREATE TABLE IF NOT EXISTS processed_webhook_events (
    id              SERIAL PRIMARY KEY,
    event_id        TEXT        NOT NULL UNIQUE,
    event_type      TEXT,
    transaction_id  TEXT,
    order_id        INTEGER,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwe_received_at
    ON processed_webhook_events(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_pwe_transaction_id
    ON processed_webhook_events(transaction_id)
    WHERE transaction_id IS NOT NULL;
```

Notes:
- `event_id` is `TEXT` to match the UUID-string format the gateway sends (`payload.event_id`, e.g. `"1d1b8fd8-0ce4-4a53-96f1-fc21f2fd5933"`).
- `order_id` is `INTEGER` to match `orders.id` (per `scripts/09-create-orders-tables.sql`).
- No retention policy in this migration — table grows unbounded but each row is ~100 bytes; a follow-up cron-deletion of rows older than e.g. 30 days can be added later.

### Proposed code change (NOT applied yet)

To be added in Phase 4C-3B after the migration is applied:

```ts
// After signature + timestamp checks succeed, and after JSON.parse:
const eventId = payload?.event_id || req.headers.get("X-Webhook-Event-ID")
if (!eventId) {
  console.error("[gateway-webhook] Missing event_id")
  return NextResponse.json({ error: "Missing event_id" }, { status: 400 })
}

try {
  await sql`
    INSERT INTO processed_webhook_events (event_id, event_type, transaction_id)
    VALUES (${eventId}, ${eventName}, ${payload.transaction_id || null})
  `
} catch (err: any) {
  // 23505 = unique_violation → already processed; ack with 200 so gateway stops retrying.
  if (err?.code === "23505") {
    console.log(`[gateway-webhook] Duplicate event ${eventId} — ack 200, no side effects`)
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 })
  }
  throw err
}

// proceed with existing payment_transactions / orders / email flow unchanged
```

This positions the idempotency check *after* signature + freshness but *before* any DB UPDATE or email dispatch, so duplicate events take a fast path that bypasses every side effect.

Why not patch this phase: the table doesn't exist on Neon. Inserting into a missing table would 500 every webhook and break the production order-confirmation pipeline. **Migration must be applied first.**

### Owner action required before Phase 4C-3B

1. Review `scripts/15-create-processed-webhook-events.sql` proposal above.
2. Apply via your existing Neon console (or `node scripts/run-sql-file.cjs scripts/15-create-processed-webhook-events.sql` once written).
3. Confirm `SELECT * FROM processed_webhook_events LIMIT 0` works.
4. Authorize Phase 4C-3B to land the code change.

---

## 4. Task 4 — Patch decision matrix

| Check | Result | Action |
|---|---|---|
| Timestamp header present + in signed input | ✅ confirmed via code + guide | Patch applied |
| event_id present | ✅ in payload + header | Code drafted, **NOT applied** |
| Idempotency table exists | ❌ — no such table | **No patch.** Migration proposed. |

Outcome: Phase 4C-3 = freshness only. Phase 4C-3B = idempotency, queued pending migration.

---

## 5. Task 5 — Protected surfaces (verified by `git diff`)

This phase changed exactly **one file**, with **one new hunk** of 10 added lines:

| File | Phase 4C-3 hunks | Surface preserved |
|---|---|---|
| `app/api/webhooks/gateway/route.ts` | **+10 lines** (one hunk inserted between line 92 and line 94 of HEAD) | Signature verify unchanged; statusMap unchanged; payment_transactions UPDATE unchanged; orders UPDATE unchanged; email IIFE unchanged. |

All other touched files in `git status` (`checkout/process`, `orders/create`, `checkout/page`, `checkout/success`, `lib/email/templates/order-confirmation`, etc.) carry **only their pre-existing Phase 4C-2A / 4C-2B uncommitted hunks** — `git diff` confirms Phase 4C-3 added zero lines to any of them.

| Surface | Status |
|---|---|
| `app/api/checkout/process/route.ts` | **unchanged this phase** (Phase 4C-2A diff still in WT, not touched) |
| `app/api/orders/create/route.ts` | **unchanged this phase** |
| `app/checkout/success/page.tsx` | **unchanged this phase** |
| `app/checkout/page.tsx` | **unchanged this phase** |
| Paydef payload / endpoint / fetch | **unchanged this phase** |
| Webhook signature algorithm (`verifyGatewaySignature`) | **unchanged this phase** |
| Webhook `statusMap` (`'COMPLETED' → 'succeeded'`, etc.) | **unchanged this phase** |
| Conversion tracking | **unchanged this phase** |
| Email templates | **unchanged this phase** |
| DB schema | **unchanged this phase** (proposal only — file NOT written) |
| Order number generation | **unchanged this phase** |
| Success URL | **unchanged this phase** |

---

## 6. Task 6 — Verification

True-clean run per [[feedback-true-clean-check]] (`rm -rf .next tsconfig.tsbuildinfo` first):

| Step | Result | Log |
|---|---|---|
| `npm run typecheck` | ✅ PASS, zero output | `_audit/p4c3-typecheck.log` |
| `npm run lint` | ⚠ PASS with **only the 6 pre-existing warnings** documented in [[project-deferred-work]] (admin/settings useEffect, payments quotes, login apostrophe, cart useEffect, preorder-policy apostrophe — none in webhook code) | `_audit/p4c3-lint.log` |
| `npm run build` | ✅ PASS — `✓ Compiled successfully` line 35; `✓ Generating static pages (146/146)` line 279 | `_audit/p4c3-build.log` |

### Synthetic webhook test checklist (for manual sandbox after deploy)

| Case | Expected | Notes |
|---|---|---|
| 1. Valid signature + fresh timestamp + payment.capture.completed | 200; `payment_transactions.status` → `succeeded`; `orders.payment_status` → `COMPLETED`; emails sent. | Existing behavior; no change. |
| 2. Valid signature + timestamp 6 min old | 400 `"Stale or invalid timestamp"`; no DB write; no email. | **New behavior.** Verify clock-skew tolerant inside ±5 min. |
| 3. Valid signature + missing/garbage timestamp header | Already 400 before this phase (signature check needs it). After this phase the freshness check still rejects since `new Date("").getTime()` → NaN. | Defensive belt-and-braces. |
| 4. Invalid signature | 401 `"Invalid signature"` (unchanged). | Unchanged. |
| 5. Same event_id replay (gateway retry) | **Still re-sends emails** (idempotency not yet active). Will be fixed in Phase 4C-3B once migration runs. | Carry-over P1-2. |
| 6. Status-map outputs | `'succeeded' / 'failed' / 'refunded' / 'pending'` — unchanged. | Verify by querying `payment_transactions.status` post-test. |

---

## 7. Final summary

| Item | Result |
|---|---|
| 1. Audit result | Webhook has timestamp in signed input but never compared to wall clock; `event_id` present but never deduplicated; no idempotency table exists. |
| 2. Patch vs report | **Patch applied** for timestamp freshness. **Report only** for event_id idempotency (migration required first). |
| 3. Files changed | `app/api/webhooks/gateway/route.ts` (+10 lines, 1 hunk). Plus this report. |
| 4. Timestamp freshness decision | 5-minute strict-reject window, post-signature-verify, ISO 8601 parse via `new Date(timestamp).getTime()` with `Number.isFinite` guard. |
| 5. event_id idempotency decision | Deferred to Phase 4C-3B. SQL + code drafted in §3. |
| 6. DB migration needed | Yes — `scripts/15-create-processed-webhook-events.sql` proposed (not yet authored on disk). Apply via existing manual-SQL pattern. |
| 7. Protected surfaces confirmed untouched | Paydef checkout/process ✓ · orders/create ✓ · checkout/success ✓ · conversion tracking ✓ · webhook signature + statusMap ✓ · email templates ✓ · DB schema ✓ |
| 8. typecheck / lint / build | PASS / PASS (6 pre-existing warnings only) / PASS (146/146 SSG). |
| 9. Manual sandbox checklist | See §6. |
| 10. Risk level | **Low.** Single-purpose 10-line addition on a path that already validates signature + required headers. Only behavior change: replay attempts > 5 min old now return 400 instead of being processed. |
| 11. Rollback | `git diff app/api/webhooks/gateway/route.ts` will show the single freshness-check hunk. Remove those 10 lines (the block delimited by `// Reject replays / stale events.` comment and the closing brace) and the route returns to prior behavior. Or `git checkout -- app/api/webhooks/gateway/route.ts` if no other uncommitted changes on that file are desired. |

### Off-limits confirmations (per [[feedback-surgical-changes]] and [[feedback-stop-before-payment-patch]])

- Paydef checkout/process — **not touched.**
- Paydef gateway payload — **not touched.**
- Paydef success URL — **not touched.**
- Conversion tracking — **not touched.**
- Order status / payment_status string literals — **not touched.**
- Email template content — **not touched.**
- DB schema — **not touched** (migration is a proposal only, file not created).
- `app/api/orders/complete/route.ts` (success polling) — **not touched.**
