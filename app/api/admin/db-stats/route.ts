import { NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireAdmin } from "@/lib/auth-guard"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Admin-only diagnostic endpoint for Neon DB stats.
 * Shows table sizes, row counts, and top queries (if pg_stat_statements is available).
 * Authorization: session cookie with role=admin (via requireAdmin).
 */
export async function GET(_request: Request) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  const sql = getSql()
  const results: Record<string, any> = {}

  // 1. Table sizes
  try {
    const tableSizes = await sql`
      SELECT
        relname,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_total_relation_size(relid) AS total_bytes
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 20
    `
    results.tableSizes = tableSizes
  } catch (e: any) {
    results.tableSizes = { error: e.message }
  }

  // 2. Approximate row counts
  try {
    const rowCounts = await sql`
      SELECT relname, n_live_tup
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20
    `
    results.rowCounts = rowCounts
  } catch (e: any) {
    results.rowCounts = { error: e.message }
  }

  // 3. Check if pg_stat_statements is available
  try {
    const ext = await sql`SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements'`
    results.pgStatStatements = ext.length > 0 ? "available" : "not_installed"

    if (ext.length > 0) {
      // Top queries by rows returned
      try {
        const topByRows = await sql`
          SELECT calls, rows, total_exec_time::numeric(12,2) as total_exec_ms, mean_exec_time::numeric(12,2) as mean_exec_ms, query
          FROM pg_stat_statements
          ORDER BY rows DESC
          LIMIT 15
        `
        results.topQueriesByRows = topByRows
      } catch (e: any) {
        results.topQueriesByRows = { error: e.message }
      }

      // Top queries by execution time
      try {
        const topByTime = await sql`
          SELECT calls, rows, total_exec_time::numeric(12,2) as total_exec_ms, mean_exec_time::numeric(12,2) as mean_exec_ms, query
          FROM pg_stat_statements
          ORDER BY total_exec_time DESC
          LIMIT 15
        `
        results.topQueriesByTime = topByTime
      } catch (e: any) {
        results.topQueriesByTime = { error: e.message }
      }
    }
  } catch (e: any) {
    results.pgStatStatements = { error: e.message }
  }

  // 4. products table column sizes (sampled)
  try {
    const colSizes = await sql`
      SELECT 
        'products' as tbl,
        COUNT(*) as row_count,
        pg_size_pretty(SUM(pg_column_size(description))) as desc_total_size,
        pg_size_pretty(AVG(pg_column_size(description))::bigint) as desc_avg_size
      FROM products 
      WHERE is_active = true AND description IS NOT NULL
    `
    results.productDescriptionStats = colSizes
  } catch (e: any) {
    results.productDescriptionStats = { error: e.message }
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  })
}
