import { headers } from "next/headers"

export async function profileDbQuery<T>(
  queryLabel: string,
  queryFn: () => Promise<T>
): Promise<T> {
  if (process.env.PROFILE_DB_TRANSFER !== "true") {
    return queryFn()
  }

  const start = Date.now()
  const result = await queryFn()
  const durationMs = Date.now() - start

  let rowCount = 0
  if (Array.isArray(result)) {
    rowCount = result.length
  } else if (result && typeof result === "object" && "length" in result) {
    rowCount = (result as any).length
  } else if (result) {
    rowCount = 1
  }

  // Approximate byte size using JSON.stringify
  let bytes = 0
  try {
    const jsonStr = JSON.stringify(result)
    bytes = Buffer.byteLength(jsonStr, "utf8")
  } catch (e) {
    bytes = -1
  }

  let ua = "unknown"
  let path = "unknown"
  try {
    // Await headers() for Next.js 15+ compatibility, works in 14 too
    const h = headers()
    ua = h.get("user-agent") || "unknown"
    path = h.get("x-invoke-path") || h.get("referer") || "unknown"
  } catch (e) {
    // Fails in contexts without headers (e.g. background tasks or static generation)
  }

  const warning = bytes > 1_000_000 ? " WARNING=large_transfer" : ""

  console.log(
    `[db-profile] path=${path} query=${queryLabel} rows=${rowCount} bytes=${bytes} durationMs=${durationMs}${warning}`
  )

  return result
}
