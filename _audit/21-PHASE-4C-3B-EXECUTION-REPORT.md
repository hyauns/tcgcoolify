# Phase 4C-3B — Webhook event_id Idempotency (migration + runtime patch)

Date: 2026-05-23
Scope: complete the P1-2 finding deferred from Phase 4C-3 — `event_id` deduplication for the gateway webhook. Migration SQL added and runtime route patched with strict-mode idempotency. Migration-first deployment sequencing is **mandatory**.

---

## 1. Migration file (Task 1) — CREATED

`scripts/15-create-processed-webhook-events.sql` (28 lines, including header comment + DDL):

```sql
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

Notes on schema choices:
- `event_id TEXT NOT NULL UNIQUE` — UUID string from gateway (`payload.event_id`, e.g. `1d1b8fd8-…`). UNIQUE is the entire enforcement mechanism — `23505` is the dedup signal.
- `transaction_id TEXT` — optional FK-like (the real gateway transaction_id is a UUID string, the `payment_transactions.transaction_id` column is `VARCHAR(255)`). Index is partial (only WHERE NOT NULL) since not every future event type will carry one.
- `order_id INTEGER` — left NULL on initial insert; could be populated by a future cron, not required for correctness.
- `received_at` — for retention sweeping later (no TTL in this phase).
- Numbered `15-` — the next available slot after the existing 10-14 range in `scripts/`.

---

## 2. Migration application mode (Task 2)

Confirmed: this repo **does** have a SQL runner: `scripts/run-sql-file.cjs` (uses `@neondatabase/serverless` + `DATABASE_URL` from `.env.local`, splits on `;`, executes each statement sequentially).

### Exact command for owner to apply

```powershell
node scripts/run-sql-file.cjs scripts/15-create-processed-webhook-events.sql
```

(or from the repo root with bash:)

```bash
node scripts/run-sql-file.cjs scripts/15-create-processed-webhook-events.sql
```

### Owner verification step

After running, confirm the table:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'processed_webhook_events'
ORDER BY ordinal_position;
```

Expect 6 rows (`id`, `event_id`, `event_type`, `transaction_id`, `order_id`, `received_at`).

### No-direct-connection guarantee

This phase did NOT connect to Neon, did NOT export DATABASE_URL, did NOT print any secrets. Migration application is the owner's action.

---

## 3. Runtime patch (Task 3) — APPLIED, strict mode

### Decision: strict mode, no graceful fallback

The user's prompt preferred strict ("Preferred strict approach: Require table exists") and explicitly warned that fallback should only be used if migration is unconfirmed. Because a fallback would silently let duplicate events through during the migration gap — exactly the failure mode this phase exists to fix — strict is the correct choice. Risk is mitigated by the deployment-sequence requirement called out below.

### Files changed

| File | Status | Phase 4C-3B hunks |
|---|---|---|
| `scripts/15-create-processed-webhook-events.sql` | **NEW** | n/a (28 lines) |
| `app/api/webhooks/gateway/route.ts` | modified | **+34 lines, 1 hunk** inserted between line 109 (end of `JSON.parse` try) and the start of the outer processing try at line 111 |

### Exact idempotency logic added

Inserted immediately after `JSON.parse` succeeds, before all DB side effects:

```ts
  const eventId = payload?.event_id || req.headers.get("X-Webhook-Event-ID")
  if (!eventId) {
    console.error("[gateway-webhook] Missing event_id in payload + header")
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 })
  }

  const idemSql = getSqlConnection()
  try {
    await idemSql`
      INSERT INTO processed_webhook_events (event_id, event_type, transaction_id)
      VALUES (${eventId}, ${eventName}, ${payload.transaction_id || null})
    `
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code
    if (code === "23505") {
      console.log(`[gateway-webhook] Duplicate event_id=${eventId} — ack 200 with no side effects`)
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 })
    }
    const message = (err as { message?: string } | null)?.message
    console.error("[gateway-webhook] Idempotency INSERT failed:", code, message)
    return NextResponse.json({ error: "Idempotency check failed" }, { status: 500 })
  }
```

### Why this ordering

| Position | Rationale |
|---|---|
| **After** signature verify | Don't write to DB for unsigned/forged calls — preserves DB hygiene. |
| **After** timestamp freshness check | Don't write for replays > 5 min old — they're rejected before reaching this code. |
| **After** `JSON.parse` | Need access to `payload.event_id` (signed body). |
| **Before** the `payment.capture.completed` if-branch | Idempotency applies to ALL event types, not only capture. Future event types automatically inherit dedup. |
| **Before** `payment_transactions` lookup / `orders` UPDATE / email IIFE | First-time INSERT must succeed before any side effect runs. Duplicate INSERT short-circuits before any side effect runs. |

### event_id source preference

`payload.event_id` is preferred over `X-Webhook-Event-ID` header because:
- `payload.event_id` is part of `rawBody` → part of HMAC input → tamper-resistant.
- `X-Webhook-Event-ID` header is NOT in the HMAC input → only used as a fallback if `payload.event_id` is somehow missing (shouldn't happen per the guide).

### Error-handling matrix

| Outcome | Status | Effect |
|---|---|---|
| INSERT succeeds | continue | proceeds to existing capture-handling logic unchanged |
| `err.code === '23505'` (unique violation) | 200 `{ ok: true, duplicate: true }` | gateway stops retrying; no DB update; no email |
| `err.code === '42P01'` (undefined_table — migration not run yet) | **500 `{ error: 'Idempotency check failed' }`** | **gateway retries forever until migration applied** — by design (see §5 deployment sequencing) |
| Other DB errors | 500 same | propagated to caller; existing outer try-catch is irrelevant since this guard is positioned BEFORE the outer try |
| Missing event_id | 400 `{ error: 'Missing event_id' }` | rejected; gateway treats as failed delivery and retries (but payload should always carry event_id per guide) |

---

## 4. Protected surfaces (Task 5) — verified by `git diff`

| File | Phase 4C-3B diff |
|---|---|
| `app/api/webhooks/gateway/route.ts` | **+34 lines (new idempotency hunk)**. Phase 4C-3 timestamp freshness hunk and pre-existing Phase 4C-2A address-mapping hunks unchanged. Signature verify, statusMap, payment_transactions UPDATE, orders UPDATE, email IIFE — all unchanged. |
| `app/api/checkout/process/route.ts` | **unchanged this phase** (still carries pre-existing Phase 4C-2A WT diff only) |
| `app/api/orders/create/route.ts` | **unchanged this phase** |
| `app/checkout/success/page.tsx` | **unchanged this phase** |
| `app/checkout/page.tsx` | **unchanged this phase** |
| `lib/email/templates/*.tsx` | **unchanged this phase** |
| Paydef payload / endpoint / fetch | **unchanged this phase** |
| Webhook signature algorithm | **unchanged this phase** |
| Webhook `statusMap` (`'COMPLETED' → 'succeeded'`, etc.) | **unchanged this phase** |
| Timestamp freshness block from Phase 4C-3 | **unchanged this phase** (sits above the new idempotency hunk) |
| Conversion tracking | **unchanged this phase** |
| Order/payment status string literals | **unchanged this phase** |
| DB schema (apart from the new `processed_webhook_events` proposed table) | **unchanged this phase** — no ALTER on existing tables |

---

## 5. Deployment sequencing — MANDATORY ORDER

> **The migration MUST be applied to Neon BEFORE the code deploys to production.** Reversing this order will break every incoming webhook with a 500 (`undefined_table`) and orders will get stuck in `PENDING` while the gateway retries forever.

### Recommended steps

1. **(DB first)** From a local checkout with `.env.local` pointing at production Neon:
   ```powershell
   node scripts/run-sql-file.cjs scripts/15-create-processed-webhook-events.sql
   ```
2. **(Verify)** Run the `information_schema.columns` query from §2 — expect 6 rows.
3. **(Deploy code)** Push / merge / deploy the branch that contains this report + the webhook route patch.
4. **(Smoke test)** Send a real test transaction. Confirm logs show:
   - First webhook → no duplicate log line, normal `[gateway-webhook] ✅ Order updated:` message.
   - Subsequent retry (if gateway resends) → `[gateway-webhook] Duplicate event_id=… — ack 200 with no side effects`.

### If you must roll back the code only (keep table)

```powershell
git checkout -- app/api/webhooks/gateway/route.ts
```
The empty `processed_webhook_events` table is harmless if the code isn't using it. Drop only if you want a clean slate:
```sql
DROP TABLE IF EXISTS processed_webhook_events;
```

---

## 6. Verification (Task 6)

True-clean run per [[feedback-true-clean-check]] (`rm -rf .next tsconfig.tsbuildinfo` first):

| Step | Result | Log |
|---|---|---|
| `npm run typecheck` | ✅ PASS, zero output | `_audit/p4c3b-typecheck.log` |
| `npm run lint` | ⚠ PASS with only the 6 pre-existing warnings documented in [[project-deferred-work]] (admin/settings useEffect, payments quotes, login apostrophe, cart useEffect, preorder-policy apostrophe — none in webhook code) | `_audit/p4c3b-lint.log` |
| `npm run build` | ✅ PASS — `✓ Compiled successfully` / `✓ Generating static pages (146/146)` | `_audit/p4c3b-build.log` |

### Synthetic webhook test checklist (run after migration + deploy)

| # | Case | Expected |
|---|---|---|
| 1 | Valid signature + fresh timestamp + event_id E1 + payment.capture.completed | Inserts 1 row in `processed_webhook_events`; updates `payment_transactions` + `orders`; sends customer + admin emails; returns `{ ok: true }` 200. |
| 2 | Same E1 replay | Returns `{ ok: true, duplicate: true }` 200. **No second row inserted.** No second `payment_transactions` UPDATE. No second email. |
| 3 | Same `transaction_id` but new `event_id` E2 (e.g. capture → refund flow) | Inserts row for E2; existing capture logic runs again (this is a known no-op for repeat captures — UPDATE writes the same values; status mapping unchanged; email re-fires, which is OK because E2 is a genuinely new business event). |
| 4 | Missing `event_id` (neither header nor payload) | Returns 400 `{ error: 'Missing event_id' }`. |
| 5 | Invalid signature | Returns 401 (unchanged from Phase 4C-3). |
| 6 | Stale timestamp (> 5 min) | Returns 400 `{ error: 'Stale or invalid timestamp' }` (unchanged from Phase 4C-3). |
| 7 | Status-map output | `'succeeded' / 'failed' / 'refunded' / 'pending'` unchanged. Verify by inspecting `payment_transactions.status` after a test capture. |
| 8 | Table missing (negative test — only if you forget to migrate) | Returns 500 `{ error: 'Idempotency check failed' }`. Logs `42P01`. Confirms strict mode is wired correctly. **Don't actually ship this state.** |

---

## 7. Final summary

| Item | Result |
|---|---|
| 1. Migration file created? | ✅ `scripts/15-create-processed-webhook-events.sql` |
| 2. Exact SQL | See §1 |
| 3. How owner applies | `node scripts/run-sql-file.cjs scripts/15-create-processed-webhook-events.sql` against production Neon (uses existing repo runner) |
| 4. Route patched or deferred? | **Patched**, strict mode, 1 hunk, +34 lines |
| 5. Files changed | `scripts/15-create-processed-webhook-events.sql` (NEW) and `app/api/webhooks/gateway/route.ts` (1 hunk) |
| 6. Exact idempotency logic | INSERT-with-23505-catch path (§3) |
| 7. Confirm protected surfaces untouched | Paydef checkout/process ✓ · orders/create ✓ · checkout/success ✓ · conversion tracking ✓ · webhook signature + statusMap ✓ · email templates ✓ · timestamp freshness from 4C-3 ✓ |
| 8. typecheck / lint / build | PASS / PASS (6 pre-existing warnings) / PASS (146/146 SSG) |
| 9. Synthetic/manual test checklist | See §6 |
| 10. Deployment sequencing | **Migration FIRST**, code SECOND. See §5. |
| 11. Rollback | Code: `git checkout -- app/api/webhooks/gateway/route.ts`. DB: `DROP TABLE IF EXISTS processed_webhook_events;` (optional — empty table is harmless). |
| 12. Risk level | **Medium-low** *if migration sequencing is honored*; **High** *if code deploys before migration applied* (every webhook 500s until table exists). The mandatory ordering in §5 is the only mitigation. |

### Off-limits confirmations

- `app/api/checkout/process/route.ts` — **not touched.**
- `app/api/orders/create/route.ts` — **not touched.**
- `app/checkout/success/page.tsx` — **not touched.**
- Paydef payload / endpoint / headers — **not touched.**
- Webhook signature algorithm — **not touched.**
- Webhook statusMap (`'COMPLETED' → 'succeeded'`, etc.) — **not touched.**
- Timestamp freshness check from Phase 4C-3 — **not touched** (the new idempotency hunk sits below it).
- Email templates — **not touched.**
- Existing DB schema — **not touched** (only adds a new standalone table).
- Order number generation — **not touched.**
- Success URL — **not touched.**
- Conversion tracking — **not touched.**
