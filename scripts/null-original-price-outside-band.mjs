// GMC reason #4 remediation: stop ~100% of the catalog showing a strikethrough.
// Keep discounts ONLY for products priced $50-$150; NULL original_price for the rest.
// REVERSIBLE: backs up (id, original_price) to `original_price_backup_20260530`
// before nulling, inside a single transaction.
import dotenv from "dotenv"
import postgres from "postgres"
dotenv.config({ path: ".env.local" })
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING
if (!url) { console.error("No DATABASE_URL"); process.exit(1) }
const sql = postgres(url, { max: 1, idle_timeout: 10 })

const WHERE_OUTSIDE_BAND = sql`original_price IS NOT NULL AND (price < 50 OR price > 150)`

try {
  const out = await sql.begin(async (tx) => {
    // Fresh backup table (drop any prior partial run).
    await tx`DROP TABLE IF EXISTS original_price_backup_20260530`
    await tx`
      CREATE TABLE original_price_backup_20260530 AS
      SELECT id, original_price FROM products WHERE ${WHERE_OUTSIDE_BAND}
    `
    const backup = await tx`SELECT COUNT(*)::int AS n FROM original_price_backup_20260530`
    const upd = await tx`UPDATE products SET original_price = NULL WHERE ${WHERE_OUTSIDE_BAND}`
    return { backed_up: backup[0].n, updated: upd.count }
  })
  console.log(`Backed up rows : ${out.backed_up}  -> table original_price_backup_20260530`)
  console.log(`Rows nulled    : ${out.updated}`)
  console.log("Committed.")
  console.log("\nTo REVERT later:")
  console.log("  UPDATE products p SET original_price = b.original_price")
  console.log("  FROM original_price_backup_20260530 b WHERE p.id = b.id;")
} catch (e) {
  console.error("FAILED (rolled back):", e?.code, e?.message)
  process.exit(1)
} finally {
  await sql.end()
}
