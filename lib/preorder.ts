/**
 * Preorder flag normalization — single source of truth.
 *
 * Both the PDP renderer (`lib/products.ts`) and the GMC feed builder
 * (`app/api/feeds/[uuid]/route.ts`) must agree on whether a product is
 * "actually" a preorder right now. The rule:
 *
 *   - is_pre_order = false → not a preorder.
 *   - is_pre_order = true  + release_date is null/missing → still a preorder.
 *   - is_pre_order = true  + release_date is in the future → still a preorder.
 *   - is_pre_order = true  + release_date is in the past → NOT a preorder.
 *
 * The "release_date in the past" downgrade is critical for GMC compliance:
 * the feed and the PDP JSON-LD must publish the same `availability` for the
 * same product, otherwise Merchant Center flags a misrepresentation.
 *
 * Pure function. No I/O. Safe for both server and edge runtimes.
 */
export function normalizePreorderFlag(
  isPreOrderFlag: boolean | null | undefined,
  releaseDate: string | Date | null | undefined,
): boolean {
  if (!isPreOrderFlag) return false

  if (releaseDate == null) return true

  const d = releaseDate instanceof Date ? releaseDate : new Date(releaseDate)
  if (Number.isNaN(d.getTime())) {
    // Invalid date string → preserve the flag rather than silently flipping it
    return true
  }

  return d.getTime() >= Date.now()
}
