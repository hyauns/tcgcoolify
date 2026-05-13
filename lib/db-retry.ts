/**
 * Central DB retry wrapper for transient errors.
 *
 * Retries on known-transient error patterns:
 *   - ETIMEDOUT, ECONNRESET, ENETUNREACH (TCP)
 *   - fetch failed (Neon HTTP, legacy)
 *   - CONNECTION_CLOSED (stale pool connection)
 *   - UND_ERR_CONNECT_TIMEOUT (undici)
 *   - connection refused (Docker startup race)
 *
 * Never retries SQL syntax errors, constraint violations, etc.
 */

const TRANSIENT_PATTERNS = [
  "ETIMEDOUT",
  "ECONNRESET",
  "ENETUNREACH",
  "fetch failed",
  "CONNECTION_CLOSED",
  "UND_ERR_CONNECT_TIMEOUT",
  "connection refused",
  "connection terminated",
  "Connection terminated",
  "socket hang up",
  "ENOTFOUND",
  "connect ETIMEDOUT",
]

function isTransientError(error: unknown): boolean {
  if (!error) return false
  const message =
    (error as any)?.message ||
    (error as any)?.cause?.message ||
    String(error)

  return TRANSIENT_PATTERNS.some((p) => message.includes(p))
}

export interface RetryOptions {
  /** Human-readable label for logs, e.g. "getProductBySlug" */
  label: string
  /** Max retry attempts (default 2 = 3 total attempts) */
  maxRetries?: number
  /** Base delay in ms (doubles on each retry). Default 300 */
  baseDelayMs?: number
  /** Absolute timeout per attempt in ms. Default: none (relies on pool connect_timeout) */
  timeoutMs?: number
}

export type DbResult<T> =
  | { ok: true; data: T; attempts: number; durationMs: number }
  | { ok: false; error: Error; isTransient: boolean; attempts: number; durationMs: number }

/**
 * Execute a DB operation with bounded retries for transient errors.
 *
 * Usage:
 *   const result = await withDbRetry({ label: "getProduct" }, async () => {
 *     return await sql`SELECT * FROM products WHERE slug = ${slug}`
 *   })
 *   if (!result.ok) { ... handle error ... }
 *   return result.data
 */
export async function withDbRetry<T>(
  options: RetryOptions,
  fn: () => Promise<T>,
): Promise<DbResult<T>> {
  const maxRetries = options.maxRetries ?? 2
  const baseDelay = options.baseDelayMs ?? 300
  const totalStart = Date.now()
  let lastError: Error = new Error("Unknown error")

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStart = Date.now()

    try {
      let data: T

      if (options.timeoutMs) {
        data = await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`[db-retry] ${options.label} timed out after ${options.timeoutMs}ms`)),
              options.timeoutMs,
            ),
          ),
        ])
      } else {
        data = await fn()
      }

      const durationMs = Date.now() - totalStart
      if (attempt > 0) {
        console.log(`[db-retry] ${options.label} succeeded on attempt ${attempt + 1}/${maxRetries + 1} (${durationMs}ms)`)
      }
      return { ok: true, data, attempts: attempt + 1, durationMs }
    } catch (error) {
      lastError = error as Error
      const attemptMs = Date.now() - attemptStart

      if (!isTransientError(error) || attempt >= maxRetries) {
        const durationMs = Date.now() - totalStart
        const transient = isTransientError(error)

        if (transient) {
          console.error(
            `[db-retry] ${options.label} failed after ${attempt + 1} attempts (${durationMs}ms): ${lastError.message}`,
          )
        }
        // Non-transient errors are logged at the call site, not here
        return { ok: false, error: lastError, isTransient: transient, attempts: attempt + 1, durationMs }
      }

      // Exponential backoff: 300ms, 600ms
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(
        `[db-retry] ${options.label} transient error on attempt ${attempt + 1} (${attemptMs}ms), retrying in ${delay}ms: ${lastError.message}`,
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  // Should never reach here, but just in case
  return { ok: false, error: lastError, isTransient: false, attempts: maxRetries + 1, durationMs: Date.now() - totalStart }
}
