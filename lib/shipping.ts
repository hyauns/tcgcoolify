/**
 * Shipping calculation — single source of truth.
 *
 * The checkout UI in `app/checkout/page.tsx` defines three shipping options
 * with IDs `standard` / `express` / `overnight` and prices $9.99 / $19.99 /
 * $39.99 respectively, with free Standard above a $75 subtotal threshold.
 * Some legacy/policy documents refer to the $19.99 tier as "Priority", so
 * `priority` is accepted as an alias for `express`. The customer-facing UI
 * prices are authoritative: whatever the UI shows, the server charges.
 *
 * This helper exists so the order-creation endpoint never has to trust a
 * client-supplied shipping amount — a previous bug (see _audit/17-PHASE-4C-2-
 * BLOCKER-REPORT.md) caused the gateway to charge $5.99 / $15.99 because the
 * client hardcoded those values. With this helper the server recomputes the
 * shipping cost from the chosen method + the server-verified subtotal.
 *
 * Pure function. No browser API, no network, no dependencies. Safe to call
 * from any runtime.
 */

export type ShippingMethodId = "standard" | "express" | "overnight" | "priority"

interface ShippingTier {
  /** Canonical id of the tier as the UI uses it. */
  id: ShippingMethodId
  /** Display label (kept in sync with the UI `shippingOptions` array). */
  name: string
  /** Default price in USD. */
  price: number
  /**
   * When set, charges are waived once the order subtotal reaches this value.
   * Only Standard currently has a free-shipping threshold.
   */
  freeThreshold?: number
}

export const SHIPPING_TIERS: Record<ShippingMethodId, ShippingTier> = {
  standard: { id: "standard", name: "Standard Shipping", price: 9.99, freeThreshold: 75 },
  // `priority` is the policy/document name for the same $19.99 tier the UI
  // calls `express`. Both IDs resolve to $19.99 so the server stays in sync
  // with whatever id the client posts.
  priority: { id: "priority", name: "Priority Shipping", price: 19.99 },
  express: { id: "express", name: "Express Shipping", price: 19.99 },
  overnight: { id: "overnight", name: "Overnight Shipping", price: 39.99 },
}

/**
 * Coerce a free-form shipping method string to one of the supported ids.
 * Falls back to `standard` for anything unknown — this matches the UI's
 * default selection and ensures the server never charges more than the
 * cheapest tier when the input is malformed.
 */
export function normalizeShippingMethod(method: unknown): ShippingMethodId {
  if (typeof method !== "string") return "standard"
  const key = method.trim().toLowerCase()
  if (key === "standard" || key === "express" || key === "overnight" || key === "priority") {
    return key
  }
  return "standard"
}

/**
 * Canonical shipping cost for a given method + subtotal. Mirrors the UI
 * calculation in `app/checkout/page.tsx` so the customer cannot be charged
 * a different number than the one shown at checkout.
 *
 *   standard, subtotal >= $75 → free ($0)
 *   standard, subtotal <  $75 → $9.99
 *   express   (UI's $19.99 "Express" tier)  → $19.99
 *   priority  (policy alias for $19.99)     → $19.99
 *   overnight (UI's $39.99 "Overnight" tier) → $39.99
 */
export function calculateShipping(method: unknown, subtotal: number): number {
  const id = normalizeShippingMethod(method)
  const tier = SHIPPING_TIERS[id]
  if (id === "standard" && Number(subtotal) >= (tier.freeThreshold ?? Infinity)) {
    return 0
  }
  return tier.price
}
