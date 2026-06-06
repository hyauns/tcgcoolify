"use server"

import { revalidatePath } from "next/cache"
import { getSql } from "@/lib/db-client"
import { requireAdmin } from "@/lib/auth-guard"
import { NextResponse } from "next/server"

function getSqlConnection() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING
  if (!url) throw new Error("No database connection string. Please check your environment variables.")
  return getSql()
}

/**
 * Checks if the external payment gateway is enabled in the database.
 */
export async function getPaymentGatewayStatus() {
  const sql = getSqlConnection()
  const result = await sql`SELECT value FROM store_settings WHERE key = 'PAYMENT_GATEWAY_ENABLED'`
  
  if (result.length === 0) {
    // Default to true if not configured
    return true
  }
  
  return result[0].value === "true"
}

/**
 * Toggles the gateway switch in the database.
 */
export async function togglePaymentGateway(enabled: boolean) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return { success: false, message: "Unauthorized" }

  const sql = getSqlConnection()
  const val = enabled.toString()
  const desc = "Controls whether the Payment Gateway method is visible on Checkout."
  
  await sql`
    INSERT INTO store_settings (key, value, description, updated_at) 
    VALUES ('PAYMENT_GATEWAY_ENABLED', ${val}, ${desc}, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET value = ${val}, description = ${desc}, updated_at = NOW()
  `

  // Revalidate the checkout and settings paths so UI updates instantly
  revalidatePath("/checkout")
  revalidatePath("/admin/settings/payments")
  
  return { success: true, enabled }
}

/**
 * Resolves the active payment flow for this storefront.
 *   'mock_charge' (default) — direct card charge via /api/gateway/mock-charge
 *   'stripe'                 — Stripe Checkout redirect via /api/gateway/checkout
 * Stored in store_settings under GATEWAY_FLOW so admins can switch without code.
 */
export type GatewayFlow = "mock_charge" | "stripe" | "shopify"

/**
 * Whitelists a raw GATEWAY_FLOW value to a known flow. Both "stripe" and
 * "shopify" are hosted REDIRECT flows (the gateway returns an approvalUrl and
 * the order completes via webhook); anything else defaults to mock_charge.
 */
function normalizeFlow(value: unknown): GatewayFlow {
  return value === "stripe" || value === "shopify" ? value : "mock_charge"
}

export async function getGatewayFlow(): Promise<GatewayFlow> {
  const sql = getSqlConnection()
  const result = await sql`SELECT value FROM store_settings WHERE key = 'GATEWAY_FLOW'`
  return normalizeFlow(result[0]?.value)
}

export interface GatewayCredentials {
  baseUrl: string
  storeId: string
  apiKey: string
  webhookSecret: string
}

// Per-flow credentials are stored under namespaced keys (e.g.
// GATEWAY_API_KEY_STRIPE). The original un-suffixed keys are kept as a
// "legacy mirror" of whichever flow is active, so any older reader keeps
// working and pre-upgrade data still resolves via the fallback below.
function flowSuffix(flow: GatewayFlow): string {
  if (flow === "stripe") return "STRIPE"
  if (flow === "shopify") return "SHOPIFY"
  return "MOCK_CHARGE"
}

async function readGatewaySettingsMap(): Promise<Record<string, string>> {
  const sql = getSqlConnection()
  const rows = await sql`SELECT key, value FROM store_settings WHERE key LIKE 'GATEWAY_%'`
  const map: Record<string, string> = {}
  rows.forEach((r: any) => { map[r.key] = r.value })
  return map
}

function readFlowValue(map: Record<string, string>, base: string, flow: GatewayFlow): string {
  // Prefer the per-flow key; fall back to the legacy un-suffixed key so a
  // storefront that hasn't re-saved yet still resolves its existing config.
  const perFlow = map[`${base}_${flowSuffix(flow)}`]
  if (perFlow !== undefined) return perFlow
  return map[base] ?? ""
}

function resolveFlowCredentials(map: Record<string, string>, flow: GatewayFlow): GatewayCredentials {
  return {
    baseUrl: readFlowValue(map, "GATEWAY_BASE_URL", flow),
    storeId: readFlowValue(map, "GATEWAY_STORE_ID", flow),
    apiKey: readFlowValue(map, "GATEWAY_API_KEY", flow),
    webhookSecret: readFlowValue(map, "GATEWAY_WEBHOOK_SECRET", flow),
  }
}

/**
 * Active-flow provider settings — used at runtime by the checkout/process route
 * and the admin "secret configured" badge. Returns the credentials of whichever
 * flow GATEWAY_FLOW currently points at. Shape is unchanged from before.
 */
export async function getGatewayProviderSettings() {
  const map = await readGatewaySettingsMap()
  const flow: GatewayFlow = normalizeFlow(map["GATEWAY_FLOW"])
  return { ...resolveFlowCredentials(map, flow), flow }
}

/**
 * Both flows' credentials + the active flow — used by the admin Payment form so
 * the operator can configure mock_charge and stripe independently.
 */
export async function getGatewayProviderSettingsAll(): Promise<{
  flow: GatewayFlow
  credentials: { mock_charge: GatewayCredentials; stripe: GatewayCredentials; shopify: GatewayCredentials }
}> {
  const map = await readGatewaySettingsMap()
  const flow: GatewayFlow = normalizeFlow(map["GATEWAY_FLOW"])
  return {
    flow,
    credentials: {
      mock_charge: resolveFlowCredentials(map, "mock_charge"),
      stripe: resolveFlowCredentials(map, "stripe"),
      shopify: resolveFlowCredentials(map, "shopify"),
    },
  }
}

export async function saveGatewayProviderSettings(input: {
  flow: GatewayFlow
  credentials: { mock_charge: GatewayCredentials; stripe: GatewayCredentials; shopify: GatewayCredentials }
}) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return { success: false, message: "Unauthorized" }

  const sql = getSqlConnection()
  const safeFlow: GatewayFlow = normalizeFlow(input.flow)

  const upsert = (key: string, value: string) => sql`
    INSERT INTO store_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `

  const writes: Promise<unknown>[] = []

  // Persist ALL flows under their namespaced keys so none is lost.
  ;(["mock_charge", "stripe", "shopify"] as GatewayFlow[]).forEach((f) => {
    const sfx = flowSuffix(f)
    const c = input.credentials[f]
    writes.push(upsert(`GATEWAY_BASE_URL_${sfx}`, c.baseUrl ?? ""))
    writes.push(upsert(`GATEWAY_STORE_ID_${sfx}`, c.storeId ?? ""))
    writes.push(upsert(`GATEWAY_API_KEY_${sfx}`, c.apiKey ?? ""))
    writes.push(upsert(`GATEWAY_WEBHOOK_SECRET_${sfx}`, c.webhookSecret ?? ""))
  })

  // Active flow.
  writes.push(upsert("GATEWAY_FLOW", safeFlow))

  // Mirror the active flow's credentials into the legacy un-suffixed keys so any
  // legacy reader (and the getWebhookSecret fallback) stays correct.
  const active = input.credentials[safeFlow]
  writes.push(upsert("GATEWAY_BASE_URL", active.baseUrl ?? ""))
  writes.push(upsert("GATEWAY_STORE_ID", active.storeId ?? ""))
  writes.push(upsert("GATEWAY_API_KEY", active.apiKey ?? ""))
  writes.push(upsert("GATEWAY_WEBHOOK_SECRET", active.webhookSecret ?? ""))

  await Promise.all(writes)

  revalidatePath("/admin/settings/payments")
  revalidatePath("/checkout")
  return { success: true }
}

export async function testGatewayConnection(baseUrl: string, storeId: string, apiKey: string) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return { success: false, message: "Unauthorized" }

  try {
    if (!baseUrl || !storeId || !apiKey) return { success: false, message: "Missing Gateway URL, Store ID, or API Key." }
    
    // Explicit health status endpoint requested
    const endpoint = baseUrl.endsWith('/') ? `${baseUrl}api/gateway/auth-check` : `${baseUrl}/api/gateway/auth-check`
    
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Store-ID": storeId,
        "X-API-Key": apiKey
      },
      signal: AbortSignal.timeout(5000)
    })
    
    if (res.ok) {
      return { success: true, message: "Connection Successful: Store recognized by Gateway" }
    } else {
      return { success: false, message: `Connection Failed: Gateway responded with status ${res.status}` }
    }
  } catch (error: any) {
    return { success: false, message: `Connection Failed: Invalid API Key or Gateway unreachable` }
  }
}

export async function getWebhookSecret() {
   // Use the active flow's secret (per-flow key), falling back to the legacy
   // un-suffixed key and finally the env var. Only one flow is active at a time,
   // so the active flow's secret is the one Paydef signs inbound webhooks with.
   const map = await readGatewaySettingsMap()
   const flow: GatewayFlow = normalizeFlow(map["GATEWAY_FLOW"])
   return (
     map[`GATEWAY_WEBHOOK_SECRET_${flowSuffix(flow)}`] ||
     map["GATEWAY_WEBHOOK_SECRET"] ||
     process.env.WEBHOOK_SECRET
   )
}
