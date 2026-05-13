import postgres from "postgres"
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, idle_timeout: 5 })

async function main() {
  // 1. Check inventory table
  const inv = await sql`SELECT to_regclass('public.inventory') as inv_exists`
  console.log("inventory table exists:", inv[0].inv_exists)

  // 2. Check products.stock_quantity
  const col = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock_quantity'
  `
  console.log("products.stock_quantity exists:", col.length > 0)

  // 3. Check the Disney Lorcana product
  const prod = await sql`
    SELECT id, name, stock_quantity, is_pre_order, price 
    FROM products 
    WHERE name ILIKE ${"%" + "Wilds" + "%" + "Unknown" + "%" + "Booster Box" + "%"}
    LIMIT 3
  `
  console.log("Disney Lorcana products:", JSON.stringify(prod))

  // 4. Test: does LEFT JOIN inventory fail inside a transaction?
  console.log("\nTesting inventory JOIN inside transaction...")
  try {
    await sql.begin(async (tx) => {
      const r = await tx`
        SELECT p.id, p.stock_quantity
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = 9489
      `
      console.log("  JOIN result:", JSON.stringify(r))
    })
  } catch (e: any) {
    console.log("  Transaction ABORTED:", e.message)
  }

  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
