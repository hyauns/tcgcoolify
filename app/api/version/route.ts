import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({
    commitSha: process.env.COMMIT_SHA || process.env.SOURCE_COMMIT || "unknown",
    buildTime: process.env.BUILD_TIME || "unknown",
    nodeEnv: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
  })
}
