// Runs migration 17 (make payment_transactions.payment_method_id nullable)
// against the DB this storefront uses. Resolve the connection string the same
// way the app does, reading .env.local.
//
//   node scripts/run-migration-17.cjs
//
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  return out;
}

(async () => {
  const root = path.join(__dirname, "..");
  const env = { ...parseEnv(path.join(root, ".env")), ...parseEnv(path.join(root, ".env.local")) };
  const cs =
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.DATABASE_URL_UNPOOLED ||
    env.POSTGRES_URL_NON_POOLING;
  if (!cs) {
    console.error("No connection string found in .env.local / .env");
    process.exit(1);
  }
  console.log("DB host:", cs.replace(/.*@/, "").replace(/[/?].*/, ""));

  const sql = neon(cs);
  try {
    await sql`ALTER TABLE payment_transactions ALTER COLUMN payment_method_id DROP NOT NULL`;
    const check = await sql`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payment_transactions' AND column_name = 'payment_method_id'
    `;
    console.log("Migration 17 applied. payment_method_id is_nullable =", check[0]?.is_nullable);
  } catch (err) {
    console.error("Migration 17 failed:", err.message);
    process.exit(1);
  }
})();
