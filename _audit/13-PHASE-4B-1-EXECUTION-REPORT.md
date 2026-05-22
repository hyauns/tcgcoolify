# Phase 4B-1 — AuthProvider Real Context + Session Fetch Dedup

Date: 2026-05-22
Scope: convert no-op `AuthProvider` into a real React Context provider so client-side session is fetched once per page load and shared by every consumer. No backend changes, no API contract changes, no payment/order/checkout/webhook touched.

---

## 1. Files changed

| # | Path | Change |
|---|------|--------|
| 1 | `hooks/use-auth.tsx` | Rewritten — now defines `AuthContext`, `AuthProvider`, and `useAuth`. Owns state + all action callbacks. Adds StrictMode init guard + in-flight session dedup. |
| 2 | `lib/auth-context.tsx` | Trimmed — re-exports `AuthProvider`, `useAuth`, `User`, `AuthState` from `@/hooks/use-auth`. Removed the no-op `AuthProvider` shim. Address/Order/OrderItem types untouched. |

Total: **2 file edits**. Zero new files, zero deletions. No consumer file touched, no backend file touched.

---

## 2. Auth architecture — before vs after

### Before

```
app/providers.tsx
└── <AuthProvider> ── (no-op pass-through: returns {children} verbatim)

useAuth()  ── declared as a standalone hook in hooks/use-auth.tsx
   └── on every call site, mounts its own useState + useEffect + checkSession
   └── 10+ call sites → 10+ independent session fetches per page load
   └── login() updates ONLY the calling component's local state
       (Header stays "logged out" until next remount)
```

### After

```
app/providers.tsx
└── <AuthProvider> ── REAL React Context provider
        └── owns user / loading / error state
        └── runs checkSession() ONCE on mount (StrictMode-safe via initRef)
        └── login / logout / register / forgotPassword / resetPassword /
            validateResetToken / checkSession defined as useCallback closures
        └── exposes shared value via AuthContext.Provider

useAuth()  ── thin useContext(AuthContext) reader
   └── 10+ call sites all read the same shared state
   └── login() updates shared state → every consumer re-renders immediately
   └── logout() clears shared state → Header switches to logged-out without
       waiting for a remount
```

Concurrency safety:
- **StrictMode double-invoke**: `initRef` is a `useRef(false)` that flips on the first effect pass. Subsequent invocations short-circuit. One fetch per real mount in dev or prod.
- **Concurrent `checkSession()` callers**: an `inflightSessionRef` holds the pending `Promise`. If a consumer manually calls `checkSession()` while another is in flight, both await the same promise — only one network request.

---

## 3. `useAuth()` public API — unchanged

Every consumer reads the same shape it always read:

```ts
{
  user: User | null
  loading: boolean
  error: string | null
  login(email, password, rememberMe?) => Promise<{ success, user?, error? }>
  register({ email, password, firstName, lastName }) => Promise<{ success, message?, error? }>
  logout() => Promise<void>
  forgotPassword(email) => Promise<{ success, message? }>
  resetPassword(token, newPassword) => Promise<{ success, message?, error? }>
  validateResetToken(token) => Promise<{ valid, email?, error? }>
  checkSession() => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
}
```

Both `User` and `AuthState` interfaces are byte-identical to the previous versions. No consumer needs to change its destructuring or function calls.

`useAuth()` now throws a descriptive error if called outside `<AuthProvider>`. The provider is mounted by `app/providers.tsx:51`, so this only fires if someone uses `useAuth()` in a server component (which would already have failed type-check on `"use client"` boundary).

### Consumer compat audit

| Consumer | Import path | Destructures | Status |
|----------|-------------|--------------|--------|
| `app/components/header.tsx:38` | `@/lib/auth-context` | `user, isAuthenticated, logout` | ✓ unchanged |
| `app/account/page.tsx:20` | `@/hooks/use-auth` | varies | ✓ unchanged |
| `app/account/addresses/edit/[addressId]/page.tsx:20` | `@/lib/auth-context` | varies | ✓ unchanged |
| `app/account/addresses/new/page.tsx:18` | `@/lib/auth-context` | varies | ✓ unchanged |
| `app/admin/layout.tsx:26` | `@/hooks/use-auth` | `user, loading, logout, isAuthenticated, isAdmin` | ✓ unchanged |
| `app/auth/login/page.tsx:18` | `@/hooks/use-auth` | `login, loading, error` | ✓ unchanged |
| `app/auth/forgot-password/page.tsx:15` | `@/lib/auth-context` | `forgotPassword` | ✓ unchanged |
| `app/auth/reset-password/page.tsx:16` | `@/lib/auth-context` | `resetPassword, validateResetToken` | ✓ unchanged |
| `app/checkout/page.tsx:47` | `@/lib/auth-context` | varies | ✓ unchanged |
| `app/components/write-review-modal.tsx:9` | `@/hooks/use-auth` | varies | ✓ unchanged |
| `app/providers.tsx:7` | `@/lib/auth-context` | `AuthProvider` | ✓ unchanged (now resolves to real Provider) |

`/api/auth/session` route handler, `/api/auth/login`, `/api/auth/logout`, `requireSession`, `requireAdmin`, JWT cookie name `auth-token`, response shapes — none touched.

---

## 4. `/api/auth/session` request volume — before vs after

| Scenario | Before (no-op AuthProvider) | After (real AuthProvider) |
|----------|------------------------------|---------------------------|
| Logged-out homepage load (prod) | 1 call per consumer present in the tree at first render (Header + page-level useAuth + write-review-modal if mounted = ~2–3 calls) | **1 call** |
| Logged-out homepage load (dev, React StrictMode) | Same × 2 (effects double-invoke) → ~4–6 calls | **1 call** (initRef short-circuits the second invoke) |
| `/account` or `/checkout` (multiple useAuth components) | 2–4 calls per page load | **1 call** |
| Manual concurrent `checkSession()` calls | Each fires its own fetch | **1 fetch shared** via in-flight Promise |
| Navigation between routes that re-mount Header | New fetch every navigation | **0 additional fetches** — AuthProvider stays mounted at the root, state persists |

The user-observed "many GET /api/auth/session 401" log is now bounded to one per provider mount (i.e. once per full page load, not per route navigation).

---

## 5. Login / logout / header behavior

### Login flow
- User submits credentials on `/auth/login`.
- Page calls `login(email, password, rememberMe)` from `useAuth()`.
- `login()` POSTs to `/api/auth/login`, receives `{ user }`.
- On success: shared state is updated → `state.user = response.user`.
- **All consumers re-render with the new user** within the same React batch:
  - Header sees `isAuthenticated = true`, switches account chip.
  - Admin/account links become visible.
- Login page then redirects to original target.

### Logout flow
- Any consumer (e.g. Header) calls `logout()`.
- `logout()` POSTs to `/api/auth/logout` (HTTP-only cookie cleared server-side).
- Shared state is reset to `{ user: null, loading: false, error: null }`.
- Header immediately renders the "Sign in" CTA. No remount required.
- Router pushes to `/auth/login`.

### Cookie / session contract
The JWT cookie `auth-token` is still HTTP-only, still set/cleared by the API routes. The frontend only reads session via the `/api/auth/session` endpoint; the cookie itself is never touched on the client. **No security regression.**

---

## 6. typecheck / lint / build result

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | **PASS** — exit 0 | No errors |
| `npm run lint` | **PASS** — exit 0 | 5 pre-existing warnings, none in files touched this phase |
| `npm run build` | **PASS** — exit 0 | Production build clean. Zero `Critical dependency` warnings. |

Build size diff (Phase 4A vs Phase 4B-1):

| Route | Phase 4A | Phase 4B-1 | Δ |
|-------|----------|------------|---|
| `/` (homepage) | ○ 7.01 / 174 kB | ○ 7.01 / **175 kB** | **+1 kB** (Provider closure size; expected, trivial) |
| `/_not-found` | ○ 148 B / 87.9 kB | ○ 148 B / 87.9 kB | flat |
| `/about`, `/account` etc. | unchanged | unchanged | flat |
| `/admin` | ○ 2.91 / 211 kB | ○ 2.91 / 211 kB | flat |
| `/admin/analytics` | ○ 47.1 / 284 kB | ○ 47.1 / 284 kB | flat |
| First Load JS shared by all | 87.7 kB | 87.7 kB | flat |
| Total static pages | 146 / 146 | 146 / 146 | flat |

The +1 kB on the homepage First Load reflects the action closures bundled into the AuthProvider component (which the homepage hydrates). All other routes are flat. No bundle bloat anywhere else.

Logs:
- Phase 4B-1 build → `_audit/build-after-phase4b1.log`
- Phase 4A baseline → `_audit/build-after-phase4a.log` (unchanged)

---

## 7. Remaining risk before commit

| # | Item | Severity |
|---|------|----------|
| 1 | The `useAuth() must be used inside <AuthProvider>` error path is unreachable in normal flow (Providers wraps the entire app at the root layout). It will only fire if a future change inserts a `useAuth()` call above the provider in the tree, OR removes the provider. Recommend keeping the providers mount stable. | Low |
| 2 | Behavior change: `login()` now updates state observable by *all* consumers, where before only the calling component saw the update. This is a **fix**, not a regression — but if any consumer was relying on the old behavior (unlikely; would be a latent bug masquerading as a feature) you'd see it on next mount anyway. | Low |
| 3 | `useAuth()` now throws if called from a server component. This was already broken (the hook used `useState`), so we are surfacing an existing constraint more loudly. No new code paths exposed. | Low |
| 4 | StrictMode init guard relies on `useRef` not being reset between dev double-invokes. This is a documented React 18 pattern; safe. | Low |
| 5 | If `/api/auth/session` becomes slow (Neon hiccup), all consumers wait on `loading: true` until the single in-flight request resolves. Before, each consumer had its own loading state and could resolve independently. Net effect: same total latency, just centralized. | Low |

No High or Medium risks identified.

---

## 8. Intentionally deferred (carry-over from prior phase plans)

| # | Item | Why |
|---|------|-----|
| 1 | `lib/database.ts:296-307` `createOrder` N+1 + missing transaction | Order-flow sensitive; needs dedicated phase with test order. |
| 2 | Admin recharts split via `next/dynamic` | Admin-only behind auth, 5 chart subtrees in a 659-line file → invasive. |
| 3 | Feed XML true streaming (`app/api/feeds/[uuid]/route.ts`) | Currently accumulates the full XML string in memory before responding. |
| 4 | DB trigram / GIN index for `/explore` ILIKE | Requires schema change + Neon plan check. |
| 5 | `/products` `unstable_cache` + `revalidateTag` | Only if Phase 4A URL-level caching proves insufficient. |
| 6 | Dependency cleanup (`playwright`, `@react-email/render`, `"latest"` pinning) | Per rule, no `npm uninstall` outside its own phase. |
| 7 | `middleware.ts` matcher narrowing + CSP `'unsafe-inline'` removal | Security-sensitive surface — separate audit. |
| 8 | `app/cookies/page.tsx` is needlessly `"use client"` for a trivial `useEffect(scrollTo(0,0))` | Tidiness, not correctness. |

---

## 9. Manual reminder — security hygiene (unchanged carry-over)

These items are not introduced by this phase and are not addressable via code patches alone:

- [ ] **Rotate Neon DB password** — the password embedded in the deleted `db-query.js` / `create-feed.js` scratch files remains in git history.
- [ ] Update `DATABASE_URL` in `.env.local`, Coolify, Vercel, and any CI / GitHub Actions secret store.
- [ ] Smoke-test the rotated password locally (`npm install && npm run build && npm run start` plus `/api/health/db`, an admin login, a PDP load).
- [ ] Optionally scrub the secret from git history via `git filter-repo` or BFG (commands documented in `_audit/08-PHASE-0-2-EXECUTION-REPORT.md`). Force-push must be coordinated with all collaborators.

No history rewrite or force-push was performed by this phase.

---

## Phase 4B-1 verdict: **PASS**

Suggested Phase 4B-2 (separate session, opt-in):
1. `lib/database.ts:296-307` `createOrder` transaction + batch INSERT.
2. Admin recharts split via `next/dynamic`.
3. Feed XML true streaming.

Suggested Phase 5 (schema work, separate review):
1. DB trigram / GIN index for `/explore`.
2. Normalized brand / attribute lookup tables.

### Manual verification checklist (to be run by the user)

Once you reload the local server (`rm -rf .next && npm run dev` or fresh `npm run start`):

1. Open the homepage **logged out** with DevTools Network filter `auth/session`:
   - Expect **exactly 1 request** to `/api/auth/session` per page load. (Was 2–10 before.)
   - StrictMode dev double-invoke is suppressed by `initRef`.
2. Navigate to `/products`, `/about`, `/contact` — **no additional `/api/auth/session` requests** beyond the initial one (AuthProvider stays mounted at root layout).
3. Log in as a user:
   - Header chip updates **immediately** to show the account menu.
   - Account-only links appear without a refresh.
4. Log out from the Header:
   - Chip returns to "Sign in" **immediately**.
   - Router pushes to `/auth/login`.
5. Reload the page (hard refresh) — auth state re-hydrates from `/api/auth/session` (one call).
6. Admin user: `/admin/*` routes still gated correctly by the backend `requireAdmin` guard (no change there).
7. Cart, checkout, payment flow: no behavior change.
