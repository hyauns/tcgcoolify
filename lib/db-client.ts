import postgres from "postgres"

/**
 * Centralised database connection using postgres.js (TCP driver).
 *
 * Why postgres.js instead of @neondatabase/serverless?
 * - @neondatabase/serverless uses HTTP fetch for every query — great for
 *   serverless cold-starts on Vercel, but terrible for a long-running
 *   Docker container (Coolify). Each query = new DNS lookup + TLS
 *   handshake + HTTP request, causing ETIMEDOUT under load.
 * - postgres.js opens a persistent TCP connection pool, reuses
 *   connections, and handles keepalive automatically.
 *
 * The tagged-template API is identical to neon():
 *   const rows = await sql`SELECT * FROM users WHERE id = ${id}`
 *
 * This module is safe to import at module scope — the connection is
 * lazy-initialised on first query, not on import.
 */

let _sql: ReturnType<typeof postgres> | null = null

export function getSql() {
  if (_sql) return _sql

  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING

  if (!url) {
    throw new Error(
      "[db-client] No database connection string found. Set DATABASE_URL."
    )
  }

  _sql = postgres(url, {
    // Connection pool size — 10 is plenty for a single container.
    // Neon's pooler supports up to 10k, but we only need a handful.
    max: 10,

    // Idle timeout — close connections unused for 30s
    idle_timeout: 30,

    // Connect timeout — fail fast instead of hanging for 60s+
    connect_timeout: 10,

    // Statement preparation — disable for Neon pooler compatibility.
    // Neon's PgBouncer-based pooler doesn't support prepared statements
    // in transaction mode.
    prepare: false,
  })

  return _sql
}

/**
 * Convenience export — use this in most files:
 *
 *   import { sql } from "@/lib/db-client"
 *   const rows = await sql`SELECT 1`
 *
 * For files that need a null-safe check (e.g. during build when
 * DATABASE_URL is absent), use getSql() with a try/catch instead.
 */
export { getSql as sql }
