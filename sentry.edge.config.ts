import * as Sentry from "@sentry/nextjs"

const isProd = process.env.NODE_ENV === "production"

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Edge middleware runs on every matched request; full tracing in prod is
    // overkill. Mirror the client/server sampling policy.
    tracesSampleRate: isProd ? 0.1 : 1.0,

    tracePropagationTargets: ["localhost", /^https:\/\/tcglore\.com/, /^https:\/\/.*\.vercel\.app/],
  })
}
