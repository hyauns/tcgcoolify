import * as Sentry from "@sentry/nextjs"

// Sentry's browser SDK runs in the client bundle, so it can only read env vars
// that Next.js inlines at build time — i.e. those prefixed with NEXT_PUBLIC_.
// `process.env.SENTRY_DSN` would always be `undefined` here and silently drop
// all client telemetry.
const clientDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const isProd = process.env.NODE_ENV === "production"

if (clientDsn) {
  Sentry.init({
    dsn: clientDsn,

    // Tracing in production should sample lightly to keep RUM overhead in check
    // and stay within Sentry plan limits. Dev gets full traces for debugging.
    tracesSampleRate: isProd ? 0.1 : 1.0,

    tracePropagationTargets: ["localhost", /^https:\/\/tcglore\.com/, /^https:\/\/.*\.vercel\.app/],

    // Session Replay is the heaviest client integration. Only sample sessions in
    // production; in dev a captured replay on every error is noise.
    replaysSessionSampleRate: isProd ? 0.1 : 0,
    replaysOnErrorSampleRate: isProd ? 1.0 : 0,
  })
}
