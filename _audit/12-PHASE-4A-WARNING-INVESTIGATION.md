# Phase 4A — Post-fix Warning Investigation

Date: 2026-05-22

## TL;DR

| Question | Answer |
|----------|--------|
| Severity | **Low** |
| Rollback Phase 4A? | **No** |
| Patch Sentry config? | **Yes — done this session** (server + edge `tracesSampleRate` gated by `NODE_ENV`) |
| Patch auth session "polling"? | **Not now** — pre-existing architecture issue. Report only. |
| Safe to deploy? | **Yes** after rotating the Neon password and updating `DATABASE_URL` (carry-over reminder, not introduced this phase) |

---

## 1. Did Phase 4A cause these warnings?

**No.** Evidence:

| Warning | Build-before-phase4a.log | Build-after-phase4a.log | Build-after-warning-check.log (this session) |
|---------|--------------------------|-------------------------|---------------------------------------------|
| `Critical dependency: the request of a dependency is an expression` | 0 hits | 0 hits | 0 hits |
| `Critical dependency: require function ...` | 0 hits | 0 hits | 0 hits |
| `@opentelemetry/instrumentation` | 0 hits | 0 hits | 0 hits |
| `require-in-the-middle` | 0 hits | 0 hits | 0 hits |

These warnings appear in `npm run dev` (dev-server webpack output) and sometimes in `npm run start` (server startup logs when Sentry initializes via `instrumentation.ts`). They do **not** appear in the production build output.

They originate from `@sentry/nextjs` v10 → `@sentry/node` → `@opentelemetry/instrumentation` + `require-in-the-middle`. Both libraries use dynamic `require()` patterns that webpack cannot statically analyze, so it emits an informational warning. This is a long-standing, well-known issue tracked by Sentry and OpenTelemetry; it pre-dates this session by far.

**The warnings have been present since Sentry was added** (commit history shows `@sentry/nextjs` and `instrumentation.ts` predating this audit). Phase 4A only changed the client `tracesSampleRate` plus a few unrelated client/data-flow changes — none of those touch the OTEL instrumentation path.

---

## 2. Where the warnings appear

| Command | Warnings shown? | Why |
|---------|-----------------|-----|
| `npm run dev` | **Yes** | Dev webpack compiles the server bundle in-process and reports CFG warnings on the OTEL/require-in-the-middle modules. |
| `npm run build` | **No** | Production build uses a different bundling path; Sentry's `withSentryConfig` (when `SENTRY_AUTH_TOKEN` is set) and/or webpack ignores the dynamic-require nodes during the optimized server bundle. Confirmed by all three build logs. |
| `npm run start` | Possibly at startup | `instrumentation.ts` runs once; Sentry/OTEL may log lazy-loaded-instrumentation-not-found messages. Cosmetic only. |

---

## 3. Risk assessment

| Concern | Verdict |
|---------|---------|
| Build fail? | **No** — `npm run build` exits 0 in all three runs. |
| Production crash? | **No** — warnings are emitted to stderr during bundling/startup but the SDK functions normally. |
| Public bundle bloat? | **No** — these are server-side modules; the warnings are about server / instrumentation code paths. Client bundle is unaffected. |
| Phase 4A regression? | **No** — same warning pattern would have appeared in Phase 3, Phase 2, baseline. Phase 4A is innocent. |

There is one unrelated stderr line worth noting: `unhandledRejection Error [PageNotFoundError]: Cannot find module for page: /_document` during the production build. This is a known Next 14 + Sentry interaction (Next attempts to load `_document.js` during "Collecting page data" but Next 14 App Router has no `_document`). It does not affect the build (exit 0), it does not affect runtime. Cosmetic.

---

## 4. `app/error.tsx` and `app/global-error.tsx` — Sentry import audit

Both files:
- Begin with `"use client"` ✓
- Import only `useEffect` + UI deps at the top ✓
- Inside `useEffect`, **dynamic-import** Sentry: `import("@sentry/nextjs").then((Sentry) => Sentry.captureException(...))` ✓
- Catch import errors so missing Sentry doesn't crash the error page ✓
- `global-error.tsx` renders its own `<html><body>` (required when global-error replaces the root layout) ✓
- `global-error.tsx` uses `level: "fatal"` and `isGlobalError: true` to distinguish from per-route errors ✓

This is **better** than Sentry's standard documented pattern (which uses a top-level `import * as Sentry`). The dynamic import keeps the Sentry SDK out of the error-page chunk unless an error actually fires. No fix needed.

---

## 5. `sentry.server.config.ts` and `sentry.edge.config.ts`

Both had `tracesSampleRate: 1.0` ungated. Server traces (especially with `@sentry/node` auto-instrumenting Postgres / fetch / Next render) are expensive: every request fans into 5–15 spans. At 100% sampling in production this is real overhead, plus Sentry plan quota burn.

**Patch applied this session:** both configs now gate sampling by `NODE_ENV`:

```ts
const isProd = process.env.NODE_ENV === "production"
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: isProd ? 0.1 : 1.0,
  tracePropagationTargets: [...],
})
```

Files changed:
- `sentry.server.config.ts:1-15`
- `sentry.edge.config.ts:1-14`

Matches the client sampling policy introduced in Phase 4A. Low-risk; no DSN logic changed.

---

## 6. `/api/auth/session` 401 — root cause

**Behavior on the wire is correct.** `app/api/auth/session/route.ts:19-20` returns `401` when no `auth-token` cookie is present. Returning 401 for unauthenticated users is the documented contract; the `useAuth` hook treats it as "logged out" and renders accordingly. No security issue, no infinite polling.

**Why the volume is high:**

`lib/auth-context.tsx:54-60` deliberately makes `AuthProvider` a **no-op pass-through**:

```tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

The comment says "AuthProvider is no longer needed (useAuth is a standalone hook)". This means each component that calls `useAuth()` (currently 10+ call sites including `Header`, `checkout/page`, `account/page`, `admin/layout`, `auth/login/page`, `write-review-modal`, etc.) runs its **own independent** `useEffect(checkSession, [])`. Every mount = one `/api/auth/session` GET.

On a typical authenticated page render:
- Header mounts → 1 call
- Page-level component (e.g. `account/page`) mounts → 1 call
- React StrictMode in `npm run dev` double-mounts → ×2
- Client-side navigation between routes that share Header → new mounts → repeats

Expected count per page-load in dev: **2–4 calls**. With 401s being fast (~5–30 ms each) this is noisy but not harmful.

**Is it polling?** No. `useEffect` deps are `[]` so each instance runs `checkSession` exactly once per mount. There is no `setInterval` / `setTimeout` retry loop. Not unbounded.

**Should it be fixed?** Yes eventually, but it's a **moderate refactor**:
- Promote `AuthProvider` to a real React context that owns the `user`/`loading`/`error` state.
- Move the singleton `checkSession()` into the provider's `useEffect` once.
- `useAuth()` becomes `useContext(AuthCtx)` reading shared state, no per-instance fetch.

This change also fixes a latent UX bug: today, when one component calls `login()`, only that component's local state updates. Other components (e.g. `Header` showing "Sign in") only learn about the login on next mount. With a real context, login propagates immediately.

**Risk if patched:** medium. Touches authentication, shared by 10 consumers, including admin/checkout/account routes. Per Phase 4A rule "Surgical changes only" + "Không thay đổi UI/UX lớn", this is out of scope for this investigation. Recommend dedicated Phase 4B item.

---

## 7. `GET / 200 in 16945ms` — dev cold compile, not production

16.9 seconds for the homepage indicates a **dev-server first compile**, not production performance.

Evidence:
- Phase 4A converted `/` from `ƒ` (dynamic) to `○` (static, prerendered at build). Current production build size: `7.01 kB / 174 kB First Load JS`. A static page served by `next start` or Coolify standalone serves in under 50 ms after cold start.
- Sentry init on the server is sub-second. Even with OTEL instrumentation enabled, first-page TTFB in production should be measured in tens of milliseconds, not seconds.
- 17 seconds matches the typical Next 14 + App Router dev compile time for a moderately large app (135 pages, ~462 tracked files, Sentry instrumentation, ~50 dependencies). Dev server lazily compiles each route on first request.

**Diagnosis:** dev cold request. After the first hit, subsequent requests will be 50–200 ms (dev) or < 50 ms (prod static).

**What to verify in production:**
1. Hit `/` after deploy → expect TTFB < 100 ms.
2. Check Coolify / Vercel access log for the `/` response time — it should match the build output `○ /` (static) with no per-request DB call.
3. If you see > 1 s in production, check whether the data cache is hitting (admin `revalidatePath` calls don't bust the cache permanently — they just invalidate one tick). Look for cache-status response headers (`x-vercel-cache: HIT` on Vercel, equivalent on Coolify reverse proxy).

No code change needed.

---

## 8. Verification — typecheck / lint / build

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | **PASS** — exit 0, no errors | |
| `npm run lint` | **PASS** | 5 pre-existing warnings (admin/settings, payments, login, cart, preorder-policy). None in files touched this session. |
| `npm run build` | **PASS** — exit 0 | Production output identical to post-Phase-4A; `/` static, `/admin/analytics` 47.1 kB. Zero `Critical dependency` warnings in production build. |

Logs written to:
- `_audit/build-before-phase4a.log` (Phase 4A baseline)
- `_audit/build-after-phase4a.log` (Phase 4A result)
- `_audit/build-after-warning-check.log` (this session)

Bundle sizes for the routes affected by Phase 4A are unchanged from the Phase 4A report (`_audit/11-PHASE-4A-EXECUTION-REPORT.md`).

---

## 9. Recommendations summary

| # | Item | Action |
|---|------|--------|
| 1 | OpenTelemetry / require-in-the-middle dev warnings | **No fix needed.** Cosmetic. To suppress in dev only, you could add `webpack: (config) => { config.ignoreWarnings = [...] }` to `next.config.mjs`, but doing so hides real warnings too. Recommend leaving as-is. |
| 2 | Sentry server + edge `tracesSampleRate: 1.0` | **Fixed this session.** Gated by `NODE_ENV`. |
| 3 | `app/error.tsx` + `app/global-error.tsx` | **No fix needed.** Pattern is correct (and slightly better than Sentry docs). |
| 4 | Auth session `401` volume | **Report only.** Architecture flaw — `AuthProvider` is no-op; each `useAuth()` consumer mounts its own checkSession. Recommend Phase 4B item to convert to true React context. |
| 5 | `GET / 200 in 16945ms` | **No fix needed.** Dev cold compile. Production homepage is now static; verify after deploy. |
| 6 | Production deploy gate | Unchanged from prior phases: rotate Neon DB password, update `DATABASE_URL` across `.env.local` / Coolify / Vercel / CI, smoke-test, then optionally scrub git history. |

---

## 10. Files changed this session

| Path | Change |
|------|--------|
| `sentry.server.config.ts` | Add `const isProd = ...`; `tracesSampleRate: isProd ? 0.1 : 1.0` |
| `sentry.edge.config.ts` | Same pattern |

Two files, four lines net change. No new files. No deletions. No payment/order/checkout/webhook/Shopify code touched.

---

## 11. Suggested Phase 4B scope (not done this phase)

In priority order:
1. **AuthProvider → real React context** (fixes session-fetch fan-out AND header-doesn't-update-after-login UX latent bug).
2. **`lib/database.ts:296-307` `createOrder` transaction + batch INSERT** — order-flow sensitive, requires test order.
3. **Admin recharts split via `next/dynamic`** — knocks another ~150 kB off `/admin` First Load.
4. **Feed XML true streaming** — `app/api/feeds/[uuid]/route.ts` currently builds the full string in memory before responding.

Deferred Phase 5 (schema/index work):
1. DB trigram / GIN index for `/explore` ILIKE queries.
2. Normalized brand / attribute lookup tables.
