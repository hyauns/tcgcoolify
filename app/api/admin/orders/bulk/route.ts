export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-guard"
import { revalidateProductPages } from "@/lib/admin-actions"
import { applyOrderStatusUpdate } from "@/lib/order-status-update"

const VALID_STATUSES = new Set([
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
])

// Safety cap: bulk actions are outward-facing (CANCELLED emails customers).
// Refuse oversized batches so a runaway selection can't blast hundreds of mails.
const MAX_BULK = 100

/**
 * Bulk order status update. Body: { ids: string[], status, tracking? }.
 * Each order is updated through the same guarded helper as the single PATCH, so
 * the non-cancelled -> CANCELLED transition emails the customer exactly once
 * (and only CANCELLED sends mail). Product pages are revalidated once at the end.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const { ids, status, tracking } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No order ids provided" }, { status: 400 })
    }
    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    if (ids.length > MAX_BULK) {
      return NextResponse.json(
        { error: `Too many orders selected (max ${MAX_BULK})` },
        { status: 400 },
      )
    }

    // De-duplicate and stringify ids defensively.
    const uniqueIds = Array.from(new Set(ids.map((id: unknown) => String(id))))

    let updated = 0
    const failed: string[] = []
    // Sequential: keeps cancellation emails orderly and avoids hammering the
    // mailer / DB pool when a full page is cancelled at once.
    for (const id of uniqueIds) {
      try {
        await applyOrderStatusUpdate(id, status, tracking)
        updated++
      } catch (err) {
        console.error(`[admin-orders/bulk] update failed for order ${id}:`, err)
        failed.push(id)
      }
    }

    await revalidateProductPages()

    return NextResponse.json({ success: true, updated, failed })
  } catch (error) {
    console.error("Error in bulk order update:", error)
    return NextResponse.json({ error: "Failed to bulk update orders" }, { status: 500 })
  }
}
