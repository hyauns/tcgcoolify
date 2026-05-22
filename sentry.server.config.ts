import * as Sentry from "@sentry/nextjs"

const isProd = process.env.NODE_ENV === "production"

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Server traces are the most expensive Sentry signal (every request fans
    // out into spans for postgres / Next render / outbound fetches via the
    // OpenTelemetry instrumentations). Match the client policy: light sampling
    // in production, full tracing in dev for debugging.
    tracesSampleRate: isProd ? 0.1 : 1.0,

    tracePropagationTargets: ["localhost", /^https:\/\/tcglore\.com/, /^https:\/\/.*\.vercel\.app/],
  })
}
