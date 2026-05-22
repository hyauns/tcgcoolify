-- Webhook event idempotency table.
--
-- Inserts use event_id as the natural unique key. Duplicate deliveries from
-- the payment gateway (retries, replays) raise a UNIQUE_VIOLATION (SQLSTATE
-- 23505) which app/api/webhooks/gateway/route.ts catches and converts to a
-- 200 OK without re-firing side effects (DB updates + emails).
--
-- Apply once on Neon before deploying the Phase 4C-3B code change:
--   node scripts/run-sql-file.cjs scripts/15-create-processed-webhook-events.sql
-- See _audit/21-PHASE-4C-3B-EXECUTION-REPORT.md for deployment sequencing.

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
