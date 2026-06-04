import { getSql } from "@/lib/db-client"

/**
 * Resolve the `customers.id` for a logged-in user, provisioning/linking the row
 * if one does not yet exist for this user_id.
 *
 * A logged-in user can legitimately have no `customers` row keyed by user_id:
 *  - they registered before `createUser()` started auto-creating the row, or
 *  - a guest checkout created a `customers` row keyed by email with user_id NULL.
 *
 * Resolution order:
 *  1. existing row by user_id
 *  2. existing email-keyed row -> link it (set user_id)   ┐ handled atomically
 *  3. no row at all            -> create it                ┘ via ON CONFLICT (email)
 *
 * Returns null only when the user record itself is missing (e.g. stale session).
 *
 * `customers.email` has a UNIQUE constraint and `users.email` is unique too, so
 * an email maps 1:1 to a user — the conflict update can safely claim the row.
 */
export async function resolveCustomerIdForUser(userId: string): Promise<string | null> {
  if (!userId) return null
  const sql = getSql()

  const byUser = await sql`SELECT id FROM customers WHERE user_id = ${userId}::uuid LIMIT 1`
  if (byUser.length > 0) return String(byUser[0].id)

  const userRes = await sql`SELECT email, first_name, last_name FROM users WHERE user_id = ${userId}::uuid LIMIT 1`
  if (userRes.length === 0) return null
  const { email, first_name, last_name } = userRes[0]

  const resolved = await sql`
    INSERT INTO customers (user_id, email, first_name, last_name, total_orders, total_spent)
    VALUES (${userId}::uuid, ${email}, ${first_name}, ${last_name}, 0, 0)
    ON CONFLICT (email) DO UPDATE SET user_id = ${userId}::uuid
    RETURNING id
  `
  return resolved.length > 0 ? String(resolved[0].id) : null
}
