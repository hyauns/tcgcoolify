-- =============================================================================
-- Migration 17 — Allow payment_transactions without a stored card
--
-- The Stripe Checkout (redirect) flow does NOT collect a card on this
-- storefront (Stripe collects it on its hosted page), so there is no
-- payment_methods row to link. We still need a payment_transactions row at
-- order-creation time so:
--   • /api/checkout/process can look up the amount, and
--   • the inbound gateway webhook can map transaction_id -> order_id to
--     complete the order.
--
-- This makes payment_method_id nullable. The mock-charge / direct-card flow is
-- unaffected: card orders still create a payment_methods row and set the id.
--
-- Safe to re-run.
-- =============================================================================

ALTER TABLE payment_transactions
  ALTER COLUMN payment_method_id DROP NOT NULL;
