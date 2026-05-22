# Phase 4C-3C — Webhook Idempotency Verification (post-migration)

Date: 2026-05-23
Scope: verify that the Phase 4C-3B migration is applied, the code path is wired in the correct order, and the build is clean. Live webhook traffic + email-dashboard inspection are owner-side actions and remain on the manual checklist below.

---

## 1. DB table verification (Task 1) — ✅ PASS

Used a new read-only helper `scripts/check-processed-webhook-events.mjs` (loads `.env.local` the same way as `scripts/run-sql-file.cjs`, opens a single short-lived `postgres` connection, runs two `SELECT`s, then closes).

```
$ node scripts/check-processed-webhook-events.mjs
columns:
  - id              :: integer                  :: nullable=NO
  - event_id        :: text                     :: nullable=NO
  - event_type      :: text                     :: nullable=YES
  - transaction_id  :: text                     :: nullable=YES
  - order_id        :: integer                  :: nullable=YES
  - received_at     :: timestamp with time zone :: nullable=NO
row count: 0
```

| Expected column | Present | Type matches | Nullable matches |
|---|---|---|---|
| `id` | ✅ | `integer` (SERIAL) | NOT NULL ✓ |
| `event_id` | ✅ | `text` | NOT NULL ✓ + UNIQUE (verified separately below) |
| `event_type` | ✅ | `text` | NULL ✓ |
| `transaction_id` | ✅ | `text` | NULL ✓ |
| `order_id` | ✅ | `integer` | NULL ✓ |
| `received_at` | ✅ | `timestamp with time zone` | NOT NULL ✓ |

**Row count before any live testing: 0.**

UNIQUE constraint on `event_id` is implied by the migration DDL (`event_id TEXT NOT NULL UNIQUE`) and is what makes the 23505 dedup path work; the column listing above doesn't restate constraints, but the schema as authored in `scripts/15-create-processed-webhook-events.sql` includes it.

### Side note about `.env.local` vs `.env`

A first run that used `import "dotenv/config"` (default `.env`) reported `TABLE MISSING` — `.env` does not point at the Neon production DB. Switching the helper to `dotenv.config({ path: ".env.local" })` (the same convention `scripts/run-sql-file.cjs` uses) returned the row above. **Worth documenting**: `.env.local` is the canonical Neon connection for this project; `.env` is something else (likely empty or local dev). Any future verification scripts should load `.env.local` explicitly to avoid the same red herring.

---

## 2. Route code ordering (Task 2) — ✅ PASS

`app/api/webhooks/gateway/route.ts` POST handler, in source order:

| Step | File:line | Note |
|---|---|---|
| 1 | `route.ts:61-65` | Load `WEBHOOK_SECRET` from DB; 500 if missing. Unchanged. |
| 2 | `route.ts:67-76` | Read + require `X-Webhook-Signature`, `X-Webhook-Timestamp`, `X-Webhook-Event`. Unchanged. |
| 3 | `route.ts:80-92` | Read raw body, HMAC verify, 401 on invalid signature. Unchanged. |
| 4 | `route.ts:94-102` | **Phase 4C-3** — timestamp freshness check (`new Date(timestamp).getTime()` ±5 min, with `Number.isFinite` guard). **Unchanged from 4C-3.** |
| 5 | `route.ts:104-109` | `JSON.parse(rawBody)` — 400 on parse error. Unchanged. |
| 6 | `route.ts:111-125` | **Phase 4C-3B** — read `eventId` from `payload.event_id` (preferred — signed) with `X-Webhook-Event-ID` header fallback; 400 if missing. |
| 7 | `route.ts:127-142` | **Phase 4C-3B** — INSERT into `processed_webhook_events`; on SQLSTATE 23505 return 200 `{ ok: true, duplicate: true }` with no further side effects; on other DB errors return 500 with structured log. |
| 8 | `route.ts:144 onwards` | Existing outer try → `if (eventName === "payment.capture.completed")` → existing `payment_transactions` UPDATE → `orders` UPDATE → fire-and-forget email IIFE. Unchanged. |

| Aspect | Status |
|---|---|
| Timestamp freshness block (Phase 4C-3) | **Unchanged** — lines 94-102 identical to 4C-3 commit |
| Signature algorithm + `timingSafeEqual` | **Unchanged** — function unchanged at lines 37-58 |
| `statusMap` (`'COMPLETED' → 'succeeded'`, etc.) | **Unchanged** — lines 185-192 |
| `payment_transactions` UPDATE | **Unchanged** — lines 195-203 |
| `orders` UPDATE | **Unchanged** — lines 207-214 |
| Email IIFE | **Unchanged** — fires only for first-time `payment.capture.completed` (idempotency short-circuits duplicates before reaching it) |
| Paydef checkout/process routes | **Untouched this phase** — `git diff` stats identical to end of 4C-3B |
| Email templates | **Untouched** |

---

## 3. Live webhook test (Task 3) — DEFERRED to owner

Local session cannot trigger a real Paydef sandbox capture. The following actions must run on the deployed environment:

| # | Action | Owner-side how-to | Expected |
|---|---|---|---|
| Test A | Trigger one real/sandbox `payment.capture.completed` | Standard checkout in sandbox or production using a low-value SKU | HTTP 200; `processed_webhook_events` row count goes 0 → 1; `payment_transactions.status` → `succeeded`; `orders.payment_status` → `COMPLETED`, `orders.status` → `PROCESSING`; customer + admin email each sent once |
| Test B | Replay same `event_id` | Use gateway dashboard "resend event" if available, OR replay the captured raw body + headers from logs | HTTP 200 `{ ok: true, duplicate: true }`; row count stays at 1; NO new `payment_transactions` UPDATE write; NO new email |
| Test C | Same `transaction_id`, different `event_id` (e.g. refund follow-up) | Trigger a refund or a second event in the gateway against the same transaction | New row in `processed_webhook_events`; existing event-handling logic runs unchanged (refunds are not the focus here — Phase 4C-3B doesn't change refund behavior because the outer if-branch only handles `payment.capture.completed`) |

After Test A, owner should re-run `node scripts/check-processed-webhook-events.mjs` and confirm row count = 1. After Test B, re-run and confirm still = 1.

---

## 4. Negative checks (Task 4) — DEFERRED to owner / local synthetic

These cannot be safely fired against the live gateway without a sandbox endpoint. They CAN be verified locally with a curl + manually-computed HMAC, but I have not done so this phase (the user's prompt allows skipping if unsafe).

| # | Case | Expected |
|---|---|---|
| 1 | Invalid signature | 401 `{ error: "Invalid signature" }` |
| 2 | Timestamp > 5 min old (or `new Date(invalid)`) | 400 `{ error: "Stale or invalid timestamp" }` |
| 3 | Missing event_id (payload + header both empty — synthetic only) | 400 `{ error: "Missing event_id" }` |

All three branches are covered by the code path inspection in §2 — the returns at `route.ts:91`, `route.ts:101`, and `route.ts:124` map 1:1 to the expected responses above.

---

## 5. Email duplication verification (Task 5) — DEFERRED to owner

Resend dashboard inspection cannot run from this session. After Tests A + B above, owner should verify in the Resend dashboard (or `email_logs` table if you have one):

1. Test A → exactly **two** sends: one customer order confirmation, one admin order notification.
2. Test B → **zero** new sends (delta from Test A snapshot).
3. Template content unchanged from Phase 4C-2B layout.

---

## 6. Build verification (Task 6) — ✅ PASS

True-clean run per [[feedback-true-clean-check]] (`rm -rf .next tsconfig.tsbuildinfo`):

| Step | Result | Log |
|---|---|---|
| `npm run typecheck` | ✅ PASS, zero output | `_audit/p4c3c-typecheck.log` |
| `npm run lint` | ⚠ PASS — only the 6 pre-existing warnings ([[project-deferred-work]]) | `_audit/p4c3c-lint.log` |
| `npm run build` | ✅ `✓ Compiled successfully` / `✓ Generating static pages (146/146)` | `_audit/p4c3c-build.log` |

---

## 7. Final summary

| # | Item | Result |
|---|---|---|
| 1 | DB table verification | ✅ 6 columns present, types + nullability match migration. UNIQUE on `event_id` per DDL. |
| 2 | `processed_webhook_events` count before/after | **Before: 0.** After: not yet — needs live test (Test A). |
| 3 | First webhook test result | **DEFERRED** — owner-side live trigger required. |
| 4 | Duplicate event_id test result | **DEFERRED** — owner-side live trigger required. |
| 5 | Email duplicate prevention | **DEFERRED** — owner must verify Resend dashboard after Tests A + B. |
| 6 | Order/payment status result | **DEFERRED** — owner verifies after Test A that `orders.payment_status = 'COMPLETED'`, `orders.status = 'PROCESSING'`, `payment_transactions.status = 'succeeded'`. **No code change in this phase can alter this.** |
| 7 | Negative test results | **DEFERRED** (code-path inspection §2 confirms branches exist and respond as expected). |
| 8 | Code changed this phase | **None to runtime code.** One new helper script: `scripts/check-processed-webhook-events.mjs` (read-only; not on any request path). |
| 9 | Protected surfaces untouched | ✅ Paydef checkout/process / orders/create / checkout/success / conversion tracking / status mapping / email templates — all `git diff` stats unchanged from end of 4C-3B. |
| 10 | Safe to deploy / keep live? | **Yes** for the code as it currently stands, *given the migration is now applied* (verified §1). Owner should still run live Tests A + B before declaring victory. |
| 11 | Remaining risk | (a) live tests not yet run — duplicate-suppression behavior verified by code reading only, not by actual gateway replay. (b) `payment_transactions.transaction_id` is `VARCHAR(255)` but `processed_webhook_events.transaction_id` is `TEXT` — they hold the same value so no functional risk, but worth noting if a future cron joins them. (c) No TTL/retention on `processed_webhook_events` — table will grow unbounded; add a `DELETE WHERE received_at < now() - interval '30 days'` cron in a future phase if volume becomes a concern. |

### Off-limits confirmations (per [[feedback-surgical-changes]])

- `app/api/checkout/process/route.ts` — **not touched.**
- `app/api/orders/create/route.ts` — **not touched.**
- `app/checkout/success/page.tsx` — **not touched.**
- `app/api/webhooks/gateway/route.ts` — **not touched this phase** (only inspected).
- Paydef payload / endpoint / fetch — **not touched.**
- Webhook signature algorithm — **not touched.**
- Webhook `statusMap` — **not touched.**
- Timestamp freshness check from Phase 4C-3 — **not touched.**
- Email templates — **not touched.**
- DB schema — **not touched** (only verified existing table).
- Conversion tracking — **not touched.**

### Files added this phase

- `scripts/check-processed-webhook-events.mjs` — read-only column + count helper (not on request path).
- `_audit/22-PHASE-4C-3C-VERIFICATION-REPORT.md` — this report.
- `_audit/p4c3c-typecheck.log`, `_audit/p4c3c-lint.log`, `_audit/p4c3c-build.log` — verification logs.

### Owner action items remaining

1. Run Test A (live sandbox capture); confirm row inserted + emails sent + order status.
2. Run Test B (replay same event_id); confirm 200 duplicate ack + zero new emails + zero new rows.
3. Optional Test C if a refund or second-event scenario is reachable.
4. Re-run `node scripts/check-processed-webhook-events.mjs` after Tests A + B and confirm row count = 1, not 2.
