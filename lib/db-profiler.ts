/**
 * Lightweight DB query profiler.
 *
 * Enable by setting PROFILE_DB_TRANSFER=true in environment.
 *
 * IMPORTANT: This module must NOT import next/headers or any other
 * Next.js dynamic API.  Doing so would force every page that
 * transitively calls profileDbQuery() to become fully dynamic,
 * breaking static/ISR generation for product detail pages.
 */

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

  const warning = bytes > 1_000_000 ? " WARNING=large_transfer" : ""

  console.log(
    `[db-profile] query=${queryLabel} rows=${rowCount} bytes=${bytes} durationMs=${durationMs}${warning}`
  )

  return result
}
