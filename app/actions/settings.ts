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

export async function getGatewayProviderSettings() {
  const sql = getSqlConnection()
  const result = await sql`SELECT key, value FROM store_settings WHERE key IN ('GATEWAY_BASE_URL', 'GATEWAY_STORE_ID', 'GATEWAY_API_KEY', 'GATEWAY_WEBHOOK_SECRET')`
  
  const settings = {
    baseUrl: "",
    storeId: "",
    apiKey: "",
    webhookSecret: ""
  }
  
  result.forEach((row: any) => {
    if (row.key === "GATEWAY_BASE_URL") settings.baseUrl = row.value
    if (row.key === "GATEWAY_STORE_ID") settings.storeId = row.value
    if (row.key === "GATEWAY_API_KEY") settings.apiKey = row.value
    if (row.key === "GATEWAY_WEBHOOK_SECRET") settings.webhookSecret = row.value
  })
  
  return settings
}

export async function saveGatewayProviderSettings(baseUrl: string, storeId: string, apiKey: string, webhookSecret: string) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return { success: false, message: "Unauthorized" }

  const sql = getSqlConnection()
  
  // Neon doesn't have an explicit .begin() via default neon() http client without driver. 
  // For HTTP neon, we just run the queries sequentially in a Promise.all or one block.
  await Promise.all([
    sql`
      INSERT INTO store_settings (key, value, updated_at) 
      VALUES ('GATEWAY_BASE_URL', ${baseUrl}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${baseUrl}, updated_at = NOW()
    `,
    sql`
      INSERT INTO store_settings (key, value, updated_at) 
      VALUES ('GATEWAY_STORE_ID', ${storeId}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${storeId}, updated_at = NOW()
    `,
    sql`
      INSERT INTO store_settings (key, value, updated_at) 
      VALUES ('GATEWAY_API_KEY', ${apiKey}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${apiKey}, updated_at = NOW()
    `,
    sql`
      INSERT INTO store_settings (key, value, updated_at) 
      VALUES ('GATEWAY_WEBHOOK_SECRET', ${webhookSecret}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${webhookSecret}, updated_at = NOW()
    `
  ])

  revalidatePath("/admin/settings/payments")
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
   const sql = getSqlConnection()
   const result = await sql`SELECT value FROM store_settings WHERE key = 'GATEWAY_WEBHOOK_SECRET'`
   return result.length > 0 ? result[0].value : process.env.WEBHOOK_SECRET
}
