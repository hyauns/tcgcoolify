import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const start = Date.now()

  try {
    const url = process.env.DATABASE_URL
    if (!url) {
      return NextResponse.json(
        { ok: false, db: "error", error: "database_not_configured", latencyMs: 0 },
        { status: 503 }
      )
    }

    const sql = neon(url, {
      fetchOptions: { signal: AbortSignal.timeout(5000) },
    })

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
