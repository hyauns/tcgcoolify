# Security Audit — TCG Lore (Next.js 14 / Neon)

Scope: Read-only review of authentication, authorization, API surface, webhooks, env handling, headers, and file uploads. No code modified.

## Summary

The app has a generally sound foundation: bcrypt(12) password hashing, Zod-validated env, parameterized SQL via `postgres.js` tagged templates (no string concatenation found), HMAC-SHA256 signed gateway webhooks with `timingSafeEqual`, a hardened `requireSession`/`requireAdmin` guard pattern used on most sensitive routes, and a CSP/HSTS/X-Frame headers stack applied in middleware. Rate limiting via Upstash is enforced on auth and checkout, login lockout exists, and password reset uses hashed tokens with 1h expiry and email-enumeration-safe responses.

However, several P0/P1 issues require remediation. The admin file-upload endpoint (`/api/admin/upload`) has its admin check commented out and accepts arbitrary authenticated/anonymous uploads, plus trusts the client `?filename=` with no path sanitization or magic-byte validation; `MAX_UPLOAD_SIZE` is enforced only via `Content-Length` (spoofable, though stream cap follows). `PUT /api/admin/settings` and `POST /api/admin/test-email` have placeholder/bypassable auth, allowing unauthenticated tampering of public site content and email sending in any environment lacking `CRON_SECRET`. The webhook handler omits a timestamp freshness check (replay window unbounded) and lacks idempotency on `event_id`. `sentry.client.config.ts` reads server-only `process.env.SENTRY_DSN` (should be `NEXT_PUBLIC_SENTRY_DSN`). Two JWT libraries are bundled (`jose` for edge, `jsonwebtoken` for nodejs) — acceptable but algorithm not pinned (`alg:none`/JWT confusion risk).

---

## P0 — Critical

### P0-1 — Admin upload endpoint has NO authentication
- File: `app/api/admin/upload/route.ts:18-22`
- Evidence: "Security check" is a commented-out placeholder (`// const user = await checkAdminSession(request); ...`). Anonymous internet callers can upload.
- Impact: Storage exhaustion on R2 bucket, hosting phishing/malware on your CDN domain, brand impersonation, billing impact. `contentType` is client-controlled — `image/jpeg` header accepts any byte payload (no magic-byte sniff).
- Fix (DO NOT IMPLEMENT YET): Add `const admin = await requireAdmin(); if (admin instanceof NextResponse) return admin;` at the top. Validate via `sharp().metadata()`. Ignore client `?filename=`.

### P0-2 — Admin settings PUT/POST has NO authentication
- File: `app/api/admin/settings/route.ts:59-128` (`PUT`, `POST`)
- Evidence: Lines 61-63 contain only commented-out placeholder auth. Route writes to `site_settings` (hero text, logo, favicon, SEO metadata, social links, `google_site_verification`).
- Impact: Unauthenticated defacement; logo/favicon swap; SEO meta hijack; `google_site_verification` change can break/hijack Search Console.
- Fix: Add `requireAdmin()`. Add Zod validation on URL fields.

### P0-3 — `/api/admin/test-email` auth is bypassable in non-production
- File: `app/api/admin/test-email/route.ts:11-19`
- Evidence: `if (authHeader !== \`Bearer ${process.env.CRON_SECRET || "admin-secret-replace-me"}\`)` only enforces in production. Non-production falls through. Even in production, if `CRON_SECRET` is unset, the literal `"admin-secret-replace-me"` becomes a hard-coded credential.
- Impact: Unauthenticated email send via Resend → spam/abuse from your verified sending domain, deliverability damage, Resend account suspension.
- Fix: Use `requireAdmin()`. Remove the `"admin-secret-replace-me"` literal.

### P0-4 — Hardcoded Neon production credentials in tracked scratch files
(Surfaced from code-quality scan — overlaps security)
- Files: `db-query.js`, `create-feed.js` at repo root
- Evidence: Direct connection strings containing real password tokens (e.g., `npg_8BrKlzA7iUeW`). Files are git-tracked.
- Impact: Anyone with repo read access has prod DB. Rotate immediately, then remove from git history.
- Fix: Rotate the Neon password and `git filter-repo` the files out of history.

---

## P1 — High

### P1-1 — Webhook lacks timestamp freshness check
- File: `app/api/webhooks/gateway/route.ts:60-92`
- Evidence: `X-Webhook-Timestamp` is included in HMAC input but never compared to `Date.now()`. Captured valid request replayable indefinitely.
- Impact: Replay causes resending of fire-and-forget customer/admin emails (line 181). Possible double side-effects if future code adds non-idempotent ops.
- Fix: `Math.abs(Date.now() - Number(timestamp)*1000) > 5 * 60 * 1000` → reject.

### P1-2 — Webhook is not idempotent
- File: `app/api/webhooks/gateway/route.ts:101-249`
- Evidence: `payload.event_id` exists in type but is never used to deduplicate.
- Impact: Duplicate customer confirmation emails on gateway retry; admin order alerts spammed.
- Fix: `processed_webhook_events` table with UNIQUE on `event_id`; bail 200 on conflict.

### P1-3 — `sentry.client.config.ts` reads server-only `SENTRY_DSN`
- File: `sentry.client.config.ts:3-5`
- Evidence: `if (process.env.SENTRY_DSN)` — only `NEXT_PUBLIC_*` is exposed to client bundles.
- Impact: All client-side telemetry silently dropped. `lib/env.ts:110` already validates `NEXT_PUBLIC_SENTRY_DSN` separately.
- Fix: Use `process.env.NEXT_PUBLIC_SENTRY_DSN`.

### P1-4 — `/api/admin/db-stats` and `/api/admin/test-email` use CRON_SECRET bearer instead of `requireAdmin()`
- Files: `app/api/admin/db-stats/route.ts:13-17`, `app/api/admin/test-email/route.ts:11-19`
- Impact: Static secret reuse across cron + admin; reconnaissance via DB stats leaks table sizes / top queries; mail-send exposure.
- Fix: Replace with `requireAdmin()`. Keep `CRON_SECRET` for `/api/cron/*` only.

### P1-5 — `/api/admin/reviews/import` has no input size cap
- File: `app/api/admin/reviews/import/route.ts:14-66`
- Evidence: Any-length JSON array; one INSERT per row; synthetic `customers` row per review; no Zod; no timeout.
- Impact: DB DoS / `customers` table bloat with `import_<random>@tcglore.local` rows; partial state on crash.
- Fix: Cap length (1000), single transaction, Zod per row, dedupe synthetic emails.

### P1-6 — Order verification access by `orderNumber` alone for guests
- File: `app/api/orders/complete/route.ts:128-163`
- Evidence: `assertOrderAccess()` grants unauthenticated callers access to guest orders by order number alone. Order numbers via short slice of `crypto.randomUUID()`.
- Impact: PII leak (shipping address, email, line items, totals) if number is guessable, forwarded, scraped, or appears in referer logs/browser history.
- Fix: Implement the documented `guest-order-token` cookie at order creation, or require guest email as second factor on GET.

### P1-7 — JWT algorithm not pinned on verification
- Files: `lib/auth-guard.ts:77`, `middleware.ts:54`, `app/api/auth/session/route.ts:23`, `app/api/orders/complete/route.ts:21`
- Evidence: `verify(token, secret)` / `jwtVerify(token, secret)` without `algorithms` whitelist.
- Impact: Future downgrade or `jsonwebtoken` regression could allow `alg:none` forgery.
- Fix: `{ algorithms: ['HS256'] }`. Pick one library (jose recommended).

### P1-8 — Cart `DELETE` route type-coercion mismatch
- File: `app/api/cart/route.ts:195`
- Evidence: `WHERE ... AND product_id = ${productId}` (no `Number()` cast; POST/PATCH cast at line 137).
- Impact: Not SQLi (parameterized) but invalid-input 500s on non-numeric client input.
- Fix: `${Number(productId)}` for consistency.

### P1-9 — `bcryptjs` (pure JS) instead of native `bcrypt`
- File: `lib/password-utils.ts:1,42`
- Impact: ~30% slower at same work factor; blocks Node event loop during hashing → latency spikes and soft DoS amplifier on rate-limited login.
- Fix: Switch to `bcrypt` or `@node-rs/bcrypt`. Rounds=12 OK.

---

## P2 — Medium

### P2-1 — Password policy lacks symbol & length cap
- File: `lib/password-utils.ts:8-38`
- Evidence: Min 8, requires upper/lower/digit, no symbol, no max. bcrypt silently truncates >72 bytes.
- Fix: Cap 64 chars before hashing; consider NIST 800-63B (length over complexity) or add symbol class.

### P2-2 — CSP allows `'unsafe-inline'` for scripts in production
- File: `middleware.ts:13`
- Evidence: `script-src 'self' 'unsafe-inline' ...`; `!isProd` only removes `unsafe-eval`.
- Impact: Defeats XSS mitigation. Combined with `dangerouslyAllowSVG`, SVG upload (see P0-1) gets script context.
- Fix: Adopt nonce-based CSP; remove inline scripts.

### P2-3 — `dangerouslyAllowSVG: true`
- File: `next.config.mjs:22`
- Impact: SVG with `<script>` if rendered outside `next/image`.
- Fix: `false` unless required; re-encode user images to raster via `sharp`.

### P2-4 — Login response distinguishes "not verified" from "wrong password"
- File: `app/api/auth/login/route.ts:77-86`
- Impact: Account enumeration.
- Fix: Move "needs verification" to a token-guarded follow-up page.

### P2-5 — Contact form falls back to `Referer` for origin check
- File: `app/api/contact/route.ts:46-54`
- Impact: CSRF/abuse vector for email-sending endpoint.
- Fix: Require `Origin` in production; no `Referer` fallback.

### P2-6 — Order creation trusts client `shippingAmount`
- File: `app/api/orders/create/route.ts:107,218,243`
- Evidence: Server recomputes subtotal + tax, but uses `Number(shippingAmount || 0)` from client for `total_amount`. `checkout/process/route.ts:25-30` then bills the persisted (poisoned) total.
- Fix: Compute shipping server-side from address + cart weight.

### P2-7 — `getWebhookSecret()` falls back to unvalidated env var
- File: `app/actions/settings.ts:139-143`
- Fix: Validate `WEBHOOK_SECRET` in `lib/env.ts` or remove env fallback.

### P2-8 — `assertSameOrigin` missing on auth/reviews/analytics POST routes
- Files: `app/api/auth/login`, `register`, `forgot-password`, `reset-password`, `app/api/reviews/route.ts:POST`, `app/api/analytics/route.ts:POST`
- Impact: SameSite=lax allows top-level cross-origin POSTs to side-effect endpoints.
- Fix: Apply `assertSameOrigin` to all POSTs with side effects.

### P2-9 — Admin order status update lacks enum validation
- File: `app/api/admin/orders/[id]/route.ts:61-77`
- Fix: Whitelist (`PENDING|PROCESSING|SHIPPED|DELIVERED|CANCELLED`).

---

## P3 — Low / Observations

- **P3-1** `/api/health/db`, `/api/version` unauth — fine; ensure no DATABASE_URL host / commit SHA leaks.
- **P3-2** `app/api/checkout/process/route.ts:41-71` accepts raw PAN/CVV → host in PCI scope. Acceptable for mock gateway, blocker for real merchant.
- **P3-3** `orders/create/route.ts:319-326` stores `encryptCvv("")` — set columns NULLable, write NULL instead.
- **P3-4** Order PII (email, order_number, customer_email) logged via `console.log` in payment/webhook paths → reach Vercel/Coolify logs + Sentry breadcrumbs. Add retention policy.
- **P3-5** `upload/route.ts:37` Content-Length pre-check redundant with stream cap at line 53.
- **P3-6** `lib/auth-database.ts:68-79` `cache()` keys hold `password_hash`/`*_token` fields — footgun; routes destructure correctly today.
- **P3-7** Two `auth-context` files (`lib/auth-context.tsx` + `hooks/use-auth.tsx`) — consolidate.
- **P3-8** No `COOP/COEP/CORP` headers. Add `COOP: same-origin`.
- **P3-9** `app/admin/layout.tsx` is client component — protection cosmetic. Real boundary is middleware + `requireAdmin()`. Document.
- **P3-10** `cron/sync-preorders/route.ts:38-45` `timingSafeEqual` short-circuits on length — minor timing oracle for secret length.
- **P3-11** Two JWT deps bloat bundles; document or migrate to `jose` only.
- **P3-12** `lib/rate-limiter.ts:75` Map fallback is per-instance only — ineffective on multi-replica. Production fails-closed when Upstash down. Good.
- **P3-13** `getClientIP()` uses `x-forwarded-for` without trusted-proxy chain check. Document trusted-proxy assumption.
- **P3-14** No `app/api/debug/*` exposed. Good.
- **P3-15** `reviews/import` uses `Math.random()` for synthetic emails — acceptable for non-secret labels.
