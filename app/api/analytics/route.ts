export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { requireSession } from "@/lib/auth-guard"


/**
 * POST /api/analytics
 * Body: { eventType, pageUrl, productId?, sessionId?, metadata? }
 *
 * Silent endpoint — always returns 200 so the client never retries.
 */
export async function POST(request: NextRequest) {
  const sql = getSql();

  const session = await requireSession()
  if (session instanceof NextResponse) return session

  try {
    const body = await request.json()
    const { eventType, pageUrl, productId, sessionId, metadata } = body

    if (!eventType) return NextResponse.json({ ok: true })

    const customerId = session.userId

    await sql`
      INSERT INTO website_analytics (
        event_type,
        page_url,
        product_id,
        customer_id,
        session_id,
        metadata,
        created_at
      ) VALUES (
        ${eventType},
        ${pageUrl ?? null},
        ${productId ?? null},
        ${customerId ?? null},
        ${sessionId ?? null},
        ${metadata ? JSON.stringify(metadata) : null},
        NOW()
      )
    `
  } catch {
    // Never surface analytics errors to the client
  }

  return NextResponse.json({ ok: true })
}

