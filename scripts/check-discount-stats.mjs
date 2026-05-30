// Read-only diagnostic for the Google Merchant Center review (suspension reason #4:
// "excessive number of highly discounted products"). Reports how many active
// products show a strikethrough discount and how deep those discounts are.
// No writes, no DDL.
import dotenv from "dotenv"
import postgres from "postgres"

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
  // A "discounted" product = active, has original_price, and it is strictly
  // greater than the current price (so a real strikethrough renders).
  const summary = await sql`
    SELECT
      COUNT(*)::int AS total_active,
      COUNT(*) FILTER (
        WHERE original_price IS NOT NULL AND original_price > price
      )::int AS discounted,
      COUNT(*) FILTER (
        WHERE original_price IS NOT NULL AND original_price > price
          AND (original_price - price) / original_price >= 0.30
      )::int AS off_30plus,
      COUNT(*) FILTER (
        WHERE original_price IS NOT NULL AND original_price > price
          AND (original_price - price) / original_price >= 0.50
      )::int AS off_50plus,
      COUNT(*) FILTER (
        WHERE original_price IS NOT NULL AND original_price > price
          AND (original_price - price) / original_price >= 0.70
      )::int AS off_70plus
    FROM products
    WHERE is_active = true
  `
  const s = summary[0]
  const pct = (n) => (s.total_active ? ((n / s.total_active) * 100).toFixed(1) : "0.0")

  console.log("=== Active catalog discount summary ===")
  console.log(`Total active products      : ${s.total_active}`)
  console.log(`Showing a discount         : ${s.discounted}  (${pct(s.discounted)}% of catalog)`)
  console.log(`  ...of which >=30% off     : ${s.off_30plus}  (${pct(s.off_30plus)}% of catalog)`)
  console.log(`  ...of which >=50% off     : ${s.off_50plus}  (${pct(s.off_50plus)}% of catalog)`)
  console.log(`  ...of which >=70% off     : ${s.off_70plus}  (${pct(s.off_70plus)}% of catalog)`)

  const depth = await sql`
    SELECT
      ROUND(AVG((original_price - price) / original_price * 100))::int AS avg_off,
      ROUND(MAX((original_price - price) / original_price * 100))::int AS max_off
    FROM products
    WHERE is_active = true AND original_price IS NOT NULL AND original_price > price
  `
  if (depth[0].avg_off !== null) {
    console.log(`Average discount depth     : ${depth[0].avg_off}% off`)
    console.log(`Deepest single discount    : ${depth[0].max_off}% off`)
  }

  // Top 10 deepest discounts so the owner can eyeball whether the original_price
  // (compare-at) values look like genuine MSRPs or inflated anchors.
  const worst = await sql`
    SELECT name, price, original_price,
           ROUND((original_price - price) / original_price * 100)::int AS off_pct
    FROM products
    WHERE is_active = true AND original_price IS NOT NULL AND original_price > price
    ORDER BY (original_price - price) / original_price DESC
    LIMIT 10
  `
  if (worst.length) {
    console.log("\n=== Top 10 deepest discounts (verify these are real MSRPs) ===")
    for (const w of worst) {
      console.log(`  -${w.off_pct}%  $${w.price} (was $${w.original_price})  ${w.name}`)
    }
  }
} catch (err) {
  console.error("query error:", err?.code, err?.message)
} finally {
  await sql.end()
}
