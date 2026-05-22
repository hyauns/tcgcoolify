// Read-only verification helper for Phase 4C-3C.
// Confirms the `processed_webhook_events` table exists with the expected
// column shape and reports the current row count. No writes, no DDL.
import dotenv from "dotenv"
import postgres from "postgres"

// Match scripts/run-sql-file.cjs convention — load .env.local explicitly.
dotenv.config({ path: ".env.local" })

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING

if (!url) {
  console.error("No DATABASE_URL found in environment.")
  process.exit(1)
}

const sql = postgres(url, { max: 1, idle_timeout: 5 })

try {
  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'processed_webhook_events'
    ORDER BY ordinal_position
  `
  console.log("columns:")
  for (const c of columns) {
    console.log(`  - ${c.column_name} :: ${c.data_type} :: nullable=${c.is_nullable}`)
  }

  if (columns.length === 0) {
    console.error("TABLE MISSING")
  } else {
    const count = await sql`SELECT COUNT(*)::int AS n FROM processed_webhook_events`
    console.log(`row count: ${count[0].n}`)
  }
} catch (err) {
  console.error("query error:", err?.code, err?.message)
} finally {
  await sql.end()
}
