# Dependency Audit — `package.json`

Date: 2026-05-22
Scope: `app/`, `lib/`, `components/`, `hooks/`, `scripts/`, `middleware.ts`,
`instrumentation.ts`, root config files, root `*.js` utility scripts.
Excluded: `node_modules`, `.next`, `_audit`, `db_backups`, `scratch`, `tmp`.

Method: ripgrep against `import`/`require` statements. Every UNUSED claim is
backed by a grep pattern + result count.

---

## Stability risk: `"latest"` pins

The following deps are pinned to `"latest"`, which means `npm install` can pull a
new (potentially breaking) major version at any time. This is a real
reproducibility / supply-chain risk and should be replaced with semver ranges:

- `@neondatabase/serverless`
- `@radix-ui/react-checkbox`, `react-dialog`, `react-dropdown-menu`,
  `react-label`, `react-popover`, `react-radio-group`, `react-select`,
  `react-separator`, `react-slot`, `react-tabs`, `react-toast` (11 packages)
- `@react-email/components`, `@react-email/render`
- `bcryptjs`
- `date-fns`
- `fuse.js`
- `html2canvas`
- `jsonwebtoken`
- `jspdf`
- `next-themes`
- `react-day-picker`
- `recharts`
- `resend`

That is 24 `latest` pins. Recommend pinning to a `^x.y.z` range derived from
the resolved version in `package-lock.json`.

---

## `dependencies` audit

### `@aws-sdk/client-s3` `^3.1045.0`
- importers (1): `lib\storage\r2.ts:1` (`import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"`)
- verdict: **USED** — Cloudflare R2 client wrapper.

### `@neondatabase/serverless` `latest`
- importers (~30+): `scripts\check-db-connection.mjs:1`,
  `scripts\verify-admin.mjs:1`, `scripts\07-test-authentication-flow.js:1`,
  root `db-query.js:1`, `create-feed.js:1`.
- `lib/db-client.ts` deliberately chose `postgres` over this (per comment) for
  runtime queries, but the Neon HTTP driver is still used by ops/migration scripts.
- verdict: **USED** (scripts only — not used by Next runtime). Both drivers
  coexist on purpose; not a duplicate to remove.

### `@radix-ui/react-checkbox` `latest`
- importers (1): `components\ui\checkbox.tsx:4`
- verdict: **USED**

### `@radix-ui/react-dialog` `latest`
- importers (2): `components\ui\dialog.tsx:4`, `components\ui\sheet.tsx:4`
- verdict: **USED**

### `@radix-ui/react-dropdown-menu` `latest`
- importers (1): `components\ui\dropdown-menu.tsx:4`
- verdict: **USED**

### `@radix-ui/react-label` `latest`
- importers (1): `components\ui\label.tsx:4`
- verdict: **USED**

### `@radix-ui/react-popover` `latest`
- importers (1): `components\ui\popover.tsx:4`
- verdict: **USED**

### `@radix-ui/react-radio-group` `latest`
- importers (1): `components\ui\radio-group.tsx:4`
- verdict: **USED**

### `@radix-ui/react-select` `latest`
- importers (1): `components\ui\select.tsx:4`
- verdict: **USED**

### `@radix-ui/react-separator` `latest`
- importers (1): `components\ui\separator.tsx:4`
- verdict: **USED**

### `@radix-ui/react-slot` `latest`
- importers (1): `components\ui\button.tsx:2`
- verdict: **USED**

### `@radix-ui/react-tabs` `latest`
- importers (1): `components\ui\tabs.tsx:4`
- verdict: **USED**

### `@radix-ui/react-toast` `latest`
- importers (1): `components\ui\toast.tsx:4`
- verdict: **USED**

### `@react-email/components` `latest`
- importers (1): `lib\email\send-email.ts:1` (`import { render } from "@react-email/components"`)
- verdict: **USED**

### `@react-email/render` `latest`
- importers (0 direct): grep `from ['"]@react-email/render['"]` -> **0 matches**
  in app code; only references are in `package-lock.json`.
- transitive: pulled in transitively by `@react-email/components` (lock-file
  shows `@react-email/components -> @react-email/render 2.0.4`).
- The `render` function consumed by `lib\email\send-email.ts` comes from
  `@react-email/components`, not from a direct dep on `@react-email/render`.
- verdict: **POSSIBLY UNUSED (direct)** — safe to drop the direct entry; the
  transitive will remain via `@react-email/components`. Verify before removal
  in case any future code path expects the explicit dep.

### `@sentry/nextjs` `^10.46.0`
- importers (7): `instrumentation.ts:1`, `next.config.mjs:1`,
  `sentry.client.config.ts:1`, `sentry.server.config.ts:1`,
  `sentry.edge.config.ts:1`, `app\global-error.tsx:14`, `app\error.tsx:15`
- verdict: **USED**

### `@upstash/ratelimit` `^2.0.8`
- importers (1): `lib\rate-limiter.ts:2`
- verdict: **USED**

### `@upstash/redis` `^1.37.0`
- importers (1): `lib\rate-limiter.ts:1`
- verdict: **USED**

### `@vercel/analytics` `^2.0.1`
- importers (1): `app\components\analytics-wrapper.tsx:3`
- verdict: **USED**

### `@vercel/speed-insights` `^2.0.0`
- importers (1): `app\components\analytics-wrapper.tsx:4`
- verdict: **USED**

### `bcryptjs` `latest`
- importers (2): `lib\password-utils.ts:1`, `scripts\create-admin-direct.mjs:2`
- no `bcrypt` package present in `dependencies` — only `bcryptjs` is used. No
  duplicate.
- verdict: **USED**

### `class-variance-authority` `^0.7.1`
- importers (6+): `components\ui\button.tsx:3`, `components\ui\alert.tsx:2`,
  `components\ui\badge.tsx:2`, `components\ui\label.tsx:5`,
  `components\ui\sheet.tsx:5`, `components\ui\toast.tsx:5`
- verdict: **USED**

### `clsx` `^2.1.1`
- importers (1): `lib\utils.ts:1`
- verdict: **USED**

### `date-fns` `latest`
- importers (2): `components\ui\date-range-picker.tsx:3`,
  `app\admin\analytics\page.tsx:29`
- verdict: **USED**

### `fuse.js` `latest`
- importers (1): `lib\search.ts:1` (`import Fuse from "fuse.js"`)
- verdict: **USED**

### `html2canvas` `latest`
- importers (1): `lib\pdf-export.ts:2`
- verdict: **USED**

### `jose` `^6.2.2`
- importers (1): `middleware.ts:2` (`import { jwtVerify } from "jose"`)
- Used in Next.js edge middleware where `jsonwebtoken` (Node-only) cannot run.
- verdict: **USED** — *not* a duplicate of `jsonwebtoken`; the two serve
  different runtimes (edge vs node).

### `jsonwebtoken` `latest`
- importers (4): `lib\auth-guard.ts:13`, `app\api\auth\session\route.ts:5`,
  `app\api\auth\login\route.ts:7`, `app\api\orders\complete\route.ts:5`
- verdict: **USED** — Node-runtime JWT signing/verification.
- Note: both `jose` and `jsonwebtoken` coexist intentionally (edge vs node).
  Consider consolidating on `jose` long-term, but no immediate removal.

### `jspdf` `latest`
- importers (1): `lib\pdf-export.ts:1`
- verdict: **USED**

### `lucide-react` `^1.8.0`
- importers (~65 files): e.g., `components\ui\checkbox.tsx:5`,
  `components\ui\dropdown-menu.tsx:5`, `app\components\header.tsx`
- verdict: **USED**

### `next` `14.2.29`
- Framework. Implicit.
- verdict: **USED**

### `next-themes` `latest`
- importers (1): `components\theme-provider.tsx:7`
- verdict: **USED**

### `postgres` `^3.4.9`
- importers (5): `lib\db-client.ts:1`, `scripts\check-slug-column.ts:1`,
  `scripts\check-inventory-schema.ts:1`, `scripts\audit-product-landing-pages.ts:14`,
  `scripts\test-pdp-lookup.ts:1`
- verdict: **USED** — primary Next runtime DB driver (per `lib/db-client.ts`
  comment, deliberately chosen over Neon HTTP driver for pooling/perf).

### `react` `^18`, `react-dom` `^18`
- Framework. Implicit.
- verdict: **USED**

### `react-day-picker` `latest`
- importers (3): `components\ui\calendar.tsx:4`,
  `components\ui\date-range-picker.tsx:4`, `app\admin\analytics\page.tsx:28`
- verdict: **USED**

### `recharts` `latest`
- importers (2): `app\admin\analytics\page.tsx:26`, `app\admin\page.tsx:7`
- verdict: **USED**

### `resend` `latest`
- importers (2): `lib\email\resend-client.ts:1`,
  `scripts\test-resend-email.ts:2`
- verdict: **USED**

### `server-only` `^0.0.1`
- importers (multiple): `lib\products.ts:1`, `lib\repositories\feeds.ts:1`,
  `lib\repositories\filters.ts:1`, `lib\repositories\sitemap.ts:1`,
  `lib\repositories\reviews.ts:1` (`import "server-only"`)
- verdict: **USED** (side-effect import marker for server-only modules).

### `sharp` `^0.34.5`
- importers (0 direct): grep `from ['"]sharp['"]|require\(['"]sharp['"]\)` -> **0 matches**.
- transitive/implicit: Required by `next/image` for production image optimization
  on the server. Without it, Next 14 falls back to slower jimp-based path or
  errors in some deployments.
- verdict: **USED (implicit)** — keep.

### `swr` `^2.4.1`
- importers (1): `app\account\page.tsx:3`
- verdict: **USED**

### `tailwind-merge` `^2.5.5`
- importers (1): `lib\utils.ts:2`
- verdict: **USED**

### `tailwindcss-animate` `^1.0.7`
- importers (1): `tailwind.config.ts:96` (`require("tailwindcss-animate")`)
- verdict: **USED** (config peer).

### `zod` `^4.3.6`
- importers (1): `lib\env.ts:1`
- verdict: **USED**

---

## `devDependencies` audit

### `@types/bcryptjs` `^2.4.6`
- Type definitions peer of `bcryptjs`.
- verdict: **USED** (implicit via TS).

### `@types/google.maps` `^3.58.1`
- Referenced via `types\google-maps.d.ts:1` (`/// <reference types="@types/google.maps" />`)
  and consumed in `app\checkout\page.tsx:375-376` (`google.maps.places.AutocompleteService`).
- verdict: **USED** (implicit via TS triple-slash).

### `@types/jsonwebtoken` `^9.0.10`
- Type definitions peer of `jsonwebtoken`.
- verdict: **USED** (implicit via TS).

### `@types/node` `^22`, `@types/react` `^18`, `@types/react-dom` `^18`
- Type definitions for runtime/framework.
- verdict: **USED** (implicit via TS).

### `eslint` `^8`
- Required by `next lint` script and `eslint-config-next`.
- verdict: **USED**

### `eslint-config-next` `14.2.29`
- Referenced in `.eslintrc.json` (`"extends": "next/core-web-vitals"`).
- verdict: **USED** (config peer).

### `playwright` `^1.59.1`
- importers (0): grep `from ['"]playwright['"]|require\(['"]playwright['"]\)|@playwright`
  -> **0 matches** outside `node_modules`/lockfile.
- No `playwright.config.{ts,js,mjs}` at repo root (`Glob **/playwright.config.*` -> 0).
- No `tests/` or `e2e/` directories (`Glob tests/**`, `Glob e2e/**` -> 0).
- No `*.spec.ts` files outside `node_modules` (`Glob **/*.spec.ts` -> only a
  file inside `node_modules\@reduxjs\toolkit`).
- verdict: **LIKELY SAFE TO REMOVE** — no tests, no config, no imports. If it
  was added speculatively for future e2e tests, defer install until tests exist.

### `postcss` `^8.5`
- Referenced in `postcss.config.mjs` (declared as plugin host for `tailwindcss`).
- verdict: **USED** (config peer).

### `tailwindcss` `^3.4.17`
- Referenced in `tailwind.config.ts`, `postcss.config.mjs`.
- verdict: **USED** (config peer).

### `typescript` `^5`
- Required by `tsc --noEmit` script and Next.js TS support.
- verdict: **USED**

---

## Summary categorization

### Likely safe to remove (verified)
- **`playwright`** (devDep): 0 direct imports, 0 config files, 0 test files.
  Grep evidence: `from ['"]playwright['"]|require\(['"]playwright['"]\)|@playwright`
  returned 0 matches across source. `**/playwright.config.*`, `tests/**`,
  `e2e/**` globs returned 0 files.

### Needs verification (possibly unused)
- **`@react-email/render`** (dep): 0 direct imports
  (`from ['"]@react-email/render['"]` -> 0 matches). Provided transitively by
  `@react-email/components`, which IS used. Likely safe to drop the direct
  declaration, but confirm no future code path requires the explicit pin.

### Used (confirmed importers / config peers / implicit)
All other entries in `dependencies` and `devDependencies`.

### Duplicate-library concerns reviewed (NOT duplicates)
- `jose` vs `jsonwebtoken`: **both required** (edge runtime vs node runtime).
- `@neondatabase/serverless` vs `postgres`: **both required** (ops scripts vs
  Next runtime, per `lib\db-client.ts` documentation comment).
- `bcryptjs` vs `bcrypt`: only `bcryptjs` present; no duplicate.

### Stability risks
- 24 packages pinned to `"latest"`. This is the highest-priority finding after
  the `playwright` removal: replace each with `^x.y.z` derived from the current
  `package-lock.json` resolved version, otherwise `npm install` on a fresh
  checkout may pull breaking majors silently.
