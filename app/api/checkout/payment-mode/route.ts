import { NextResponse } from "next/server"
import { getGatewayFlow } from "@/app/actions/settings"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/checkout/payment-mode
 *
 * Lightweight public read used by the checkout page to decide whether to
 * collect a card (mock_charge) or redirect to the hosted gateway (stripe).
 * Exposes ONLY the flow string — no credentials.
 */
export async function GET() {
  try {
    const flow = await getGatewayFlow()
    return NextResponse.json({ flow })
  } catch {
    // Fail safe to the existing direct-card behavior.
    return NextResponse.json({ flow: "mock_charge" })
  }
}
