// Read-only: projects the result of keeping discounts ONLY for $50-$150 products.
import dotenv from "dotenv"
import postgres from "postgres"
dotenv.config({ path: ".env.local" })
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING
if (!url) { console.error("No DATABASE_URL"); process.exit(1) }
const sql = postgres(url, { max: 1, idle_timeout: 5 })
try {
  const r = await sql`
    SELECT
      COUNT(*)::int AS total_active,
      COUNT(*) FILTER (WHERE original_price IS NOT NULL AND original_price > price)::int AS discounted_now,
      COUNT(*) FILTER (WHERE price BETWEEN 50 AND 150)::int AS in_band,
      COUNT(*) FILTER (WHERE price BETWEEN 50 AND 150 AND original_price IS NOT NULL AND original_price > price)::int AS in_band_discounted,
      COUNT(*) FILTER (WHERE NOT (price BETWEEN 50 AND 150) AND original_price IS NOT NULL)::int AS will_null
    FROM products WHERE is_active = true
  `
  const s = r[0]
  const pct = (n) => s.total_active ? ((n / s.total_active) * 100).toFixed(1) : "0.0"
  console.log("=== Plan: NULL original_price everywhere EXCEPT price $50-$150 ===")
  console.log(`Total active products            : ${s.total_active}`)
  console.log(`Discounted NOW                   : ${s.discounted_now}  (${pct(s.discounted_now)}%)`)
  console.log(`Products in $50-$150 band        : ${s.in_band}  (${pct(s.in_band)}%)`)
  console.log(`  ...of those currently discounted: ${s.in_band_discounted}  (${pct(s.in_band_discounted)}%)`)
  console.log(`Rows that WILL be set to NULL     : ${s.will_null}`)
  console.log(`---`)
  console.log(`AFTER the update, discounted ≈    : ${s.in_band_discounted}  (${pct(s.in_band_discounted)}% of catalog)`)
} catch (e) { console.error("err:", e?.code, e?.message) } finally { await sql.end() }
