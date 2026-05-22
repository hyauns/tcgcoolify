import { z } from "zod"

// ============================================================
// Strict Environment Variable Validation
// ============================================================
//
// Validates all required env vars at startup using Zod.
// If any variable is missing or malformed, the app fails fast
// with a clear error message identifying exactly which key(s)
// are misconfigured — no silent runtime crashes.
//
// Import this module at the top of app/layout.tsx so validation
// runs during the build phase and on server startup.
// ============================================================

// ── Server-side env schema ──────────────────────────────────
// These variables are ONLY available on the server (not prefixed
// with NEXT_PUBLIC_) and must never be exposed to the client.

const serverSchema = z.object({
  // ── Database (at least one must be set) ───────────────────
  DATABASE_URL: z
    .string({ message: "DATABASE_URL is required — set your Neon PostgreSQL connection string" })
    .url("DATABASE_URL must be a valid PostgreSQL connection URL")
    .startsWith("postgres", "DATABASE_URL must start with 'postgres://' or 'postgresql://'"),

  // ── Authentication ────────────────────────────────────────
  JWT_SECRET: z
    .string({ message: "JWT_SECRET is required — run `openssl rand -base64 32` to generate one" })
    .min(32, "JWT_SECRET must be at least 32 characters for adequate security"),

  // ── Email (Resend) ────────────────────────────────────────
  RESEND_API_KEY: z
    .string({ message: "RESEND_API_KEY is required — get one from https://resend.com/api-keys" })
    .startsWith("re_", "RESEND_API_KEY must start with 're_' — check your Resend dashboard"),

  // ── Optional server vars with sensible defaults ───────────
  EMAIL_FROM: z
    .string()
    .default("TCG Lore <orders@email.tcglore.com>"),

  EMAIL_REPLY_TO: z
    .string()
    .default("cs@tcglore.com"),

  ADMIN_EMAIL: z
    .string()
    .email("ADMIN_EMAIL must be a valid email address")
    .default("orders@email.tcglore.com"),

  BASE_URL: z
    .string()
    .url("BASE_URL must be a valid URL (e.g. https://tcglore.com)")
    .transform((val) => val.replace(/\/$/, ""))
    .optional()
    .transform((val) => {
      if (val) return val;
      if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
      throw new Error("BASE_URL is missing. Production requires BASE_URL (e.g., https://tcglore.com)");
    })
    .refine((val) => process.env.NODE_ENV !== "production" || val.startsWith("https://"), {
      message: "BASE_URL must use https:// in production",
    }),

  // ── Rate limiting (optional — app degrades gracefully) ────
  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional().or(z.literal("")),

  // ── Payments (optional until going live) ──────────────────
  STRIPE_SECRET_KEY: z.string().min(1).optional().or(z.literal("")),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional().or(z.literal("")),
  PAYMENT_ENCRYPTION_KEY: z
    .string({ message: "PAYMENT_ENCRYPTION_KEY is required for encrypting sensitive PII (phone numbers, addresses)." })
    .min(16, "PAYMENT_ENCRYPTION_KEY must be at least 16 characters"),

  // ── Monitoring (optional) ─────────────────────────────────
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),

  // ── On-demand revalidation secret (optional) ──────────────
  REVALIDATION_SECRET: z.string().min(16).optional().or(z.literal("")),

  // ── Tax Calculation (TaxJar) ──────────────────────────────────────────────
  // Optional: if not set, tax calculation falls back to a 0% rate.
  // Set this before going live in US markets that require sales tax collection.
  TAXJAR_API_KEY: z.string().min(10).optional().or(z.literal("")),
})

// ── Client-side env schema ──────────────────────────────────
// Variables prefixed with NEXT_PUBLIC_ are bundled into the
// client JS and therefore CANNOT be validated at runtime on the
// server in the same way. We validate them separately and mark
// optional keys accordingly.

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be a valid URL")
    .transform((val) => val.replace(/\/$/, ""))
    .optional()
    .transform((val) => {
      if (val) return val;
      if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
      console.error("CRITICAL: NEXT_PUBLIC_SITE_URL is missing in production. App may break. Set it to https://tcglore.com");
      return "";
    }),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1).optional().or(z.literal("")),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional().or(z.literal("")),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().min(1).optional().or(z.literal("")),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal("")),
})

// ============================================================
// Validation runner
// ============================================================

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>

/**
 * Validated server environment.
 *
 * Runs Zod `.safeParse` and produces a human-readable error
 * listing every missing/invalid variable before throwing.
 */
function validateServerEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors

    console.error("\n")
    console.error("╔══════════════════════════════════════════════════════════╗")
    console.error("║      ❌ MISSING OR INVALID ENVIRONMENT VARIABLES       ║")
    console.error("╚══════════════════════════════════════════════════════════╝")
    console.error("")

    for (const [key, messages] of Object.entries(errors)) {
      const detail = messages?.join("; ") ?? "Invalid value"
      console.error(`  ✗ ${key}`)
      console.error(`    └─ ${detail}`)
      console.error("")
    }

    console.error("  Refer to .env.example for the expected format.")
    console.error("  Copy it to .env.local and fill in real values.\n")

    throw new Error(
      `Environment validation failed: ${Object.keys(errors).join(", ")} — see console output above for details.`
    )
  }

  return result.data
}

function validateClientEnv(): ClientEnv {
  const rawClientEnv = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  }

  const result = clientSchema.safeParse(rawClientEnv)

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors

    // Client env issues are warnings, not fatal errors, since
    // most NEXT_PUBLIC_ keys are optional feature flags.
    console.warn("\n")
    console.warn("⚠️  CLIENT ENVIRONMENT WARNINGS:")
    for (const [key, messages] of Object.entries(errors)) {
      console.warn(`  ⚠ ${key}: ${messages?.join("; ")}`)
    }
    console.warn("")

    // All client vars are optional — return the raw input cast as
    // ClientEnv so the app continues with whatever values exist.
    return rawClientEnv as ClientEnv
  }

  return result.data
}

// ============================================================
// Singleton — only validates once per process lifecycle
// ============================================================

let _serverEnv: ServerEnv | undefined
let _clientEnv: ClientEnv | undefined

/**
 * Validated & typed server environment variables.
 * Import this in any server-side module instead of raw `process.env`.
 */
export function getServerEnv(): ServerEnv {
  if (!_serverEnv) {
    _serverEnv = validateServerEnv()
  }
  return _serverEnv
}

/**
 * Validated & typed client environment variables.
 */
export function getClientEnv(): ClientEnv {
  if (!_clientEnv) {
    _clientEnv = validateClientEnv()
  }
  return _clientEnv
}

// ── Eagerly validate on import (runs at build/startup) ──────
// Server env is only validated when running on the server.
// This prevents client bundles from crashing on missing secrets.
if (typeof window === "undefined") {
  const isBuild = process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";
  if (!isBuild) {
    getServerEnv()
  }
  getClientEnv()
}
