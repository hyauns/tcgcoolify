# Coolify Deployment Notes

This project is configured to run as a Docker container on Coolify. The application uses Next.js Standalone Output and strictly validates its environment.

## Domain Configuration

**Crucial Note for Coolify**: Unlike Vercel, Coolify does not automatically inject domain names into environment variables (e.g., Vercel's `VERCEL_URL`). You **must** manually configure your production domain URL explicitly in the Coolify environment variable dashboard. 

If you fail to do this, the build or application will immediately crash with a loud error, preventing an invalid state.

### Required URL Environment Variables (Production)

You must configure the following exact values in Coolify for production:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://tcglore.com
BASE_URL=https://tcglore.com
```

*Note: Never include a trailing slash in these URL variables (e.g., use `https://tcglore.com`, not `https://tcglore.com/`). The application's `lib/site-config.ts` will aggressively enforce normalization to strip trailing slashes, but it's best practice to configure them cleanly.*

## Environment Variables Breakdown

### Required at Build-Time
These variables **must** be present in the Coolify deployment configuration before initiating a build, or the build process will fail during Next.js static generation:

| Variable | Required? | Phase | Example Value | Purpose |
|----------|-----------|-------|---------------|---------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Build/Runtime | `https://tcglore.com` | Authoritative frontend site URL. Used by SEO, sitemap generators, and Next.js client-side bundles. |
| `BASE_URL` | Yes | Build/Runtime | `https://tcglore.com` | Primary backend URL. Used for absolute email generation, webhook callbacks, and backend redirects. |
| `DATABASE_URL` | Yes | Build/Runtime | `postgres://user:pass@host/db` | Database connection. Required during build for Prisma schema validation and generation. |

### Required at Runtime
These variables are not strictly required for the Docker image to build, but the application will fail validation on server startup if they are missing.

| Variable | Required? | Phase | Example Value | Purpose |
|----------|-----------|-------|---------------|---------|
| `JWT_SECRET` | Yes | Runtime | `a-32-character-random-string` | Signs authentication tokens. |
| `RESEND_API_KEY` | Yes | Runtime | `re_...` | Required to send transactional emails. |
| `PAYMENT_ENCRYPTION_KEY` | Yes | Runtime | `a-16-character-string` | Secures sensitive PII in the database. |

### Optional Runtime Integrations

| Variable | Required? | Phase | Example Value | Purpose |
|----------|-----------|-------|---------------|---------|
| `STRIPE_SECRET_KEY` | No | Runtime | `sk_test_...` | Payment processing via Stripe. |
| `STRIPE_WEBHOOK_SECRET` | No | Runtime | `whsec_...` | Webhook verification for Stripe. |
| `UPSTASH_REDIS_REST_URL` | No | Runtime | `https://...` | Rate limiting and caching. |
| `UPSTASH_REDIS_REST_TOKEN` | No | Runtime | `...` | Upstash authentication. |

## Precedence and Localhost Fallbacks

**Local Development:**
When running the application locally (`NODE_ENV=development`), the application will safely and silently fall back to `http://localhost:3000` if `BASE_URL` or `NEXT_PUBLIC_SITE_URL` are not defined in your local `.env`. 

**Production (Coolify):**
When running in production (`NODE_ENV=production`), **the fallback to `http://localhost:3000` is strictly disabled.** 
If `NEXT_PUBLIC_SITE_URL` or `BASE_URL` are missing in production, the application will forcefully throw an error: `CRITICAL: NEXT_PUBLIC_SITE_URL or BASE_URL is missing in production.`

### URL Precedence Rules
If multiple URL variables are defined, the application honors the following priority list to derive the final canonical `siteUrl` across the app:

1. `NEXT_PUBLIC_SITE_URL`
2. `BASE_URL`
3. `NEXT_PUBLIC_APP_URL`
4. `NEXTAUTH_URL`

## Scheduled Tasks / Cron

Vercel cron does not automatically run on Coolify. It must be manually configured in the Coolify Scheduled Tasks dashboard.

### Endpoint Details
* **Cron URL:** `https://tcglore.com/api/cron/sync-preorders`
* **Method:** `GET`
* **Required env var:** `CRON_SECRET`
* **Purpose:** Transitions expired Pre-Orders to In-Stock status.

### Coolify Setup Instructions

1. Go to your Coolify project.
2. Open the app/service.
3. Add a new **Environment Variable**: `CRON_SECRET=<strong-random-secret>` (Generate a long random string).
4. Navigate to the **Scheduled Tasks** tab.
5. Create a new task.
6. Use the original `vercel.json` schedule: `0 0 * * *` (Runs every day at midnight).
7. Use the following command:

```bash
curl -fsS -X GET -H "Authorization: Bearer ${CRON_SECRET}" https://tcglore.com/api/cron/sync-preorders
```

*Note: If Coolify's executor does not expand `${CRON_SECRET}` correctly, you can define the literal secret directly in the command: `... Bearer REPLACE_WITH_SECRET" ...`*

### Testing & Verification
You can manually test the cron by clicking "Run Now" in Coolify, or by executing the curl command from a local terminal.

- **Success:** A `200 OK` response returning `{ "ok": true, "transitioned": X, ... }`. Logs will show the task succeeded.
- **Unauthorized (401):** Occurs if the `CRON_SECRET` is missing in the header or does not match the server's configured environment variable.
- **Error (500):** Occurs if a database error happens or if `CRON_SECRET` is missing entirely from the app's environment variables.

## File Uploads / Cloudflare R2

Vercel Blob was replaced for new uploads. New image uploads go to Cloudflare R2 (or any S3-compatible API). 

*Note: Old Vercel Blob URLs are still kept accessible in the database and Next.js config until older images are manually migrated or replaced.*

### Public R2 Base URL (temporary)
`https://pub-383b4a6cc335493b948a15793ecbf997.r2.dev`

> **Note:** This is a temporary R2 public development URL. When `cdn.beautypremier.store` is pointed to the correct R2 bucket, switch `R2_PUBLIC_BASE_URL` back to `https://cdn.beautypremier.store`.

### Required Coolify Env Vars
```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_BASE_URL=https://pub-383b4a6cc335493b948a15793ecbf997.r2.dev
```
*(Do not include a trailing slash in `R2_PUBLIC_BASE_URL`)*

### Optional
```env
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```
