/**
 * Link-only reviews badge that points to the public Trustpilot business page.
 *
 * Why no on-site rating number?
 *  - The previous paid Trustpilot widget stopped rendering after the
 *    subscription lapsed, and Trustpilot's public review pages sit behind a
 *    Cloudflare WAF that 403s server-side fetches, so we can't read the real
 *    score without a paid plan.
 *  - Displaying a hard-coded rating would be misleading and risks falling
 *    foul of Google Merchant misrepresentation rules + FTC review-display
 *    guidance.
 *
 * What we render instead: a neutral amber 5-star badge with the brand-name
 * attribution and a link to the real Trustpilot page where customers can see
 * the actual rating, read reviews, and leave their own.
 */

const TRUSTPILOT_PUBLIC_URL = "https://www.trustpilot.com/review/tcglore.com"

export function TrustpilotRating() {
  return (
    <a
      href={TRUSTPILOT_PUBLIC_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
      aria-label="Read TCG Lore customer reviews on Trustpilot"
    >
      <Stars />
      <span>Read our reviews on Trustpilot ↗</span>
    </a>
  )
}

function Stars() {
  return (
    <span
      className="inline-block leading-none align-middle"
      style={{ fontSize: "18px", letterSpacing: "1px", color: "#f59e0b" }}
      aria-hidden="true"
    >
      ★★★★★
    </span>
  )
}
