export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireSession } from "@/lib/auth-guard"
import { assertSameOrigin } from "@/lib/csrf"

function getSqlConnection() {
  return getSql()
}

async function getCustomerIdForUser(userId: string): Promise<string | null> {
  const sql = getSqlConnection()
  const [row] = await sql`SELECT id FROM customers WHERE user_id = ${userId} LIMIT 1`
  return row?.id ? String(row.id) : null
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { addressId: string } },
) {
  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  const session = await requireSession()
  if (session instanceof NextResponse) return session

  const customerId = await getCustomerIdForUser(session.userId)
  if (!customerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const sql = getSqlConnection()
    const result = await sql`
      DELETE FROM shipping_addresses
      WHERE id = ${params.addressId} AND customer_id = ${customerId}
      RETURNING id
    `
    if (result.length === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Address delete error:", error)
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { addressId: string } },
) {
  const csrfError = assertSameOrigin(request)
  if (csrfError) return csrfError

  const session = await requireSession()
  if (session instanceof NextResponse) return session

  const customerId = await getCustomerIdForUser(session.userId)
  if (!customerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const sql = getSqlConnection()
    const body = await request.json()
    const {
      first_name, last_name, company,
      address_line1, address_line2, city, state,
      postal_code, country, phone, is_default,
    } = body

    if (is_default) {
      await sql`
        UPDATE shipping_addresses SET is_default = false WHERE customer_id = ${customerId}
      `
    }

    const [updated] = await sql`
      UPDATE shipping_addresses SET
        first_name   = ${first_name},
        last_name    = ${last_name},
        company      = ${company ?? null},
        address_line1 = ${address_line1},
        address_line2 = ${address_line2 ?? null},
        city         = ${city},
        state        = ${state},
        postal_code  = ${postal_code},
        country      = ${country ?? "AU"},
        phone        = ${phone ?? null},
        is_default   = ${is_default ?? false}
      WHERE id = ${params.addressId} AND customer_id = ${customerId}
      RETURNING *
    `

    if (!updated) return NextResponse.json({ error: "Address not found" }, { status: 404 })
    return NextResponse.json({ address: updated })
  } catch (error) {
    console.error("Address update error:", error)
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 })
  }
}
