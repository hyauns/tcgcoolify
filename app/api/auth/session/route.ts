export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { getSql } from "@/lib/db-client"

export async function GET(request: NextRequest) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("[auth/session] FATAL: JWT_SECRET is not set. Set it in your environment.")
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }
    const JWT_SECRET: string = process.env.JWT_SECRET
    const sql = getSql()
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No authentication token found" }, { status: 401 })
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }

    // JOIN users + customers to return a unified profile
    const [row] = await sql`
      SELECT
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.email_verified,
        u.status,
        u.created_at,
        c.id            AS customer_id,
        c.total_orders,
        c.total_spent,
        c.last_order_date
      FROM users u
      LEFT JOIN customers c ON c.user_id = u.user_id
      WHERE u.user_id = ${decoded.userId}
      LIMIT 1
    `

    if (!row || row.status !== "active") {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        user_id: row.user_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        email_verified: row.email_verified,
        created_at: row.created_at,
        // Commerce fields — present only when a customers row exists
        customer_id: row.customer_id ?? null,
        total_orders: row.total_orders ? Number(row.total_orders) : 0,
        total_spent: row.total_spent ? Number(row.total_spent) : 0,
        last_order_date: row.last_order_date ?? null,
      },
    })
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
  }
}
