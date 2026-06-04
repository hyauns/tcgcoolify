export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireSession } from "@/lib/auth-guard"
import { assertSameOrigin } from "@/lib/csrf"
import { resolveCustomerIdForUser } from "@/lib/customer"

function getSqlConnection() {
  return getSql()
}

async function getCustomerIdForUser(userId: string): Promise<string | null> {
  return resolveCustomerIdForUser(userId)
}

export async function GET() {
  const sql = getSqlConnection();

  const session = await requireSession()
  if (session instanceof NextResponse) return session

  const customerId = await getCustomerIdForUser(session.userId)
  if (!customerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const addresses = await sql`
      SELECT
        id, first_name, last_name, company,
        address_line1, address_line2, city, state,
        postal_code, country, phone, is_default,
        created_at
      FROM shipping_addresses
      WHERE customer_id = ${customerId}
      ORDER BY is_default DESC, created_at DESC
    `
    return NextResponse.json({ addresses })
  } catch (error) {
    console.error("Addresses fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const sql = getSqlConnection();

  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  const session = await requireSession()
  if (session instanceof NextResponse) return session

  const customerId = await getCustomerIdForUser(session.userId)
  if (!customerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const {
      first_name, last_name, company,
      address_line1, address_line2, city, state,
      postal_code, country, phone, is_default,
    } = body

    // If the new address is marked as default, clear existing defaults first
    if (is_default) {
      await sql`
        UPDATE shipping_addresses SET is_default = false WHERE customer_id = ${customerId}
      `
    }

    const [created] = await sql`
      INSERT INTO shipping_addresses (
        customer_id, first_name, last_name, company,
        address_line1, address_line2, city, state,
        postal_code, country, phone, is_default
      ) VALUES (
        ${customerId}, ${first_name}, ${last_name}, ${company ?? null},
        ${address_line1}, ${address_line2 ?? null}, ${city}, ${state},
        ${postal_code}, ${country ?? "AU"}, ${phone ?? null}, ${is_default ?? false}
      )
      RETURNING *
    `
    return NextResponse.json({ address: created }, { status: 201 })
  } catch (error) {
    console.error("Address create error:", error)
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 })
  }
}

