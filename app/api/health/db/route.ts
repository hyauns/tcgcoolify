import { NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const start = Date.now()

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, db: "error", error: "database_not_configured", latencyMs: 0 },
        { status: 503 }
      )
    }

    const sql = getSql()
    await sql`SELECT 1`

    const latencyMs = Date.now() - start
    console.log(`[health/db] ok latency=${latencyMs}ms`)

    return NextResponse.json({
      ok: true,
      db: "ok",
      latencyMs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const latencyMs = Date.now() - start
    console.error(`[health/db] error latency=${latencyMs}ms`, (error as Error).message)

    return NextResponse.json(
      { ok: false, db: "error", error: "database_unreachable", latencyMs },
      { status: 503 }
    )
  }
}
