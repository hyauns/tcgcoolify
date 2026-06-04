import { createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getSql } from "@/lib/db-client"
import { getWebhookSecret } from "@/app/actions/settings"
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email/send-email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getSqlConnection() {
  return getSql()
}
type GatewayWebhookPayload = {
  event: string
  event_id: string
  transaction_id: string
  paypal_order_id: string | null
  amount: string
  currency?: string
  status: string
  timestamp: string
  status_reason?: string
  paypal_event_type?: string
  paypal_capture_id?: string
  authorization_id?: string
  gateway_fee?: string
  net_amount?: string
  payment_method?: "paypal" | "card" | "mock_card"
  card_last_4?: string
  card_brand?: string
  exp_month?: string
  exp_year?: string
  buyer_name?: string
  billing_address?: string | Record<string, unknown> | null
}

function verifyGatewaySignature(input: {
  rawBody: string
  timestamp: string
  signature: string
  secret: string
}) {
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.rawBody}`)
    .digest("hex")

  // The signature shouldn't include 'sha256=' prefix, but handle it if it does
  const received = input.signature.replace(/^sha256=/, "")

  const expectedBuffer = Buffer.from(expected, "hex")
  const receivedBuffer = Buffer.from(received, "hex")

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

export async function POST(req: NextRequest) {
  const webhookSecret = await getWebhookSecret()
  if (!webhookSecret) {
    console.error("[gateway-webhook] Missing WEBHOOK_SECRET in Database")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  const signature = req.headers.get("X-Webhook-Signature")
  const timestamp = req.headers.get("X-Webhook-Timestamp")
  const eventName = req.headers.get("X-Webhook-Event")

  if (!signature || !timestamp || !eventName) {
    return NextResponse.json(
      { error: "Missing required webhook headers" },
      { status: 400 }
    )
  }

  // IMPORTANT:
  // Read the raw body first to guarantee perfect signature match
  const rawBody = await req.text()

  const isValid = verifyGatewaySignature({
    rawBody,
    timestamp,
    signature,
    secret: webhookSecret,
  })

  if (!isValid) {
    console.error("[gateway-webhook] Invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // Reject replays / stale events. The gateway's X-Webhook-Timestamp is an
  // ISO 8601 string (per WEBHOOK_INTEGRATION_GUIDE.md) and is part of the
  // signed HMAC input, so the value is tamper-resistant. A 5-minute window
  // matches Stripe/Shopify defaults and tolerates normal NTP clock skew.
  const timestampMs = new Date(timestamp).getTime()
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    console.error("[gateway-webhook] Stale or invalid timestamp:", timestamp)
    return NextResponse.json({ error: "Stale or invalid timestamp" }, { status: 400 })
  }

  let payload: GatewayWebhookPayload
  try {
    payload = JSON.parse(rawBody) as GatewayWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  // Idempotency: every gateway delivery is keyed by payload.event_id, which is
  // signed via HMAC because it lives in rawBody. First delivery inserts a row
  // and runs the rest of the handler normally. Gateway retries of the same
  // event_id raise unique_violation (SQLSTATE 23505) → we ack 200 with no
  // further side effects so the gateway stops retrying.
  //
  // PRE-DEPLOY REQUIREMENT: scripts/15-create-processed-webhook-events.sql
  // MUST be applied to Neon BEFORE this code reaches production. Until the
  // table exists, every webhook will fail with 42P01 (undefined_table) and
  // orders will stay PENDING. See _audit/21-PHASE-4C-3B-EXECUTION-REPORT.md.
  const eventId = payload?.event_id || req.headers.get("X-Webhook-Event-ID")
  if (!eventId) {
    console.error("[gateway-webhook] Missing event_id in payload + header")
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 })
  }

  const idemSql = getSqlConnection()
  try {
    await idemSql`
      INSERT INTO processed_webhook_events (event_id, event_type, transaction_id)
      VALUES (${eventId}, ${eventName}, ${payload.transaction_id || null})
    `
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code
    if (code === "23505") {
      console.log(`[gateway-webhook] Duplicate event_id=${eventId} — ack 200 with no side effects`)
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 })
    }
    const message = (err as { message?: string } | null)?.message
    console.error("[gateway-webhook] Idempotency INSERT failed:", code, message)
    return NextResponse.json({ error: "Idempotency check failed" }, { status: 500 })
  }

  try {
    if (eventName === "payment.capture.completed") {
      const {
        transaction_id,
        amount,
        status,
        card_last_4,
        card_brand,
        buyer_name,
        billing_address,
      } = payload

      // Skip processing if transaction_id is missing
      if (!transaction_id) {
        console.error("[gateway-webhook] Missing transaction_id in capture payload")
        return NextResponse.json({ error: "Missing transaction_id" }, { status: 400 })
      }

      // Check if this transaction exists locally
      const sql = getSqlConnection()
      const existingTxResult = await sql`SELECT * FROM payment_transactions WHERE transaction_id = ${transaction_id}`

      if (existingTxResult.length === 0) {
        console.warn(`[gateway-webhook] Transaction ${transaction_id} not found locally`)
        // Returning 200 here ensures the gateway stops retrying even if we missed the record
        // (Perhaps the customer dropped off before we could even initialize the transaction locally)
        return NextResponse.json({ ok: true, message: "Transaction not found locally" }, { status: 200 })
      }
      
      const existingTx = existingTxResult[0]
      console.log(`[gateway-webhook] Found local transaction: id=${existingTx.id}, order_id=${existingTx.order_id}, current_status=${existingTx.status}`)

      // Prepare metadata carefully to ensure we only save safe scalar values 
      const parsedBillingAddress = billing_address 
        ? typeof billing_address === "string" ? billing_address : JSON.stringify(billing_address)
        : null

      // Map gateway status values to local DB-compatible status values.
      // The payment_transactions table has a CHECK constraint: 
      // status IN ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')
      // The gateway sends 'COMPLETED', 'FAILED', etc. which violates the constraint.
      const statusMap: Record<string, string> = {
        'COMPLETED': 'succeeded',
        'SUCCEEDED': 'succeeded',
        'FAILED': 'failed',
        'REFUNDED': 'refunded',
        'PENDING': 'pending',
      }
      const mappedStatus = statusMap[status?.toUpperCase()] || 'succeeded'

      // Update the transaction in database with safe fields
      await sql`
        UPDATE payment_transactions
        SET status = ${mappedStatus},
            card_last_4 = COALESCE(${card_last_4 || null}, card_last_4),
            card_brand = COALESCE(${card_brand || null}, card_brand),
            buyer_name = COALESCE(${buyer_name || null}, buyer_name),
            billing_address = COALESCE(${parsedBillingAddress}::jsonb, billing_address)
        WHERE transaction_id = ${transaction_id}
      `
      console.log(`[gateway-webhook] Updated payment_transactions: transaction_id=${transaction_id}, status=${status} -> ${mappedStatus}`)

      // Update the parent order to reflect completion
      if (existingTx.order_id) {
        const orderUpdateResult = await sql`
          UPDATE orders
          SET payment_status = 'COMPLETED',
              status = 'PROCESSING'
          WHERE id = ${Number(existingTx.order_id)}
          RETURNING id, order_number, payment_status, status
        `
        if (orderUpdateResult.length > 0) {
          console.log(`[gateway-webhook] ✅ Order updated: id=${orderUpdateResult[0].id}, order_number=${orderUpdateResult[0].order_number}, payment_status=${orderUpdateResult[0].payment_status}, status=${orderUpdateResult[0].status}`)
        } else {
          console.error(`[gateway-webhook] ⚠️ ORDER UPDATE MATCHED 0 ROWS! order_id=${existingTx.order_id} — the polling page will never see COMPLETED.`)
        }
        
        // Fire & Forget Background Email Tasks
        // We use an async IIFE to detach it from the main request lifecycle,
        // so the Gateway receives 200 OK immediately and doesn't time out.
        ;(async () => {
          try {
            console.log(`[gateway-webhook] Dispatching background email for Order ${existingTx.order_id}`)
            
            const rows = await sql`
              SELECT o.order_number, o.subtotal, o.tax_amount, o.shipping_amount, o.total_amount, o.shipping_address,
                     c.email as customer_email, o.tracking_number, o.created_at,
                     COALESCE(
                       json_agg(
                         json_build_object('id', oi.id, 'name', oi.product_name, 'price', oi.unit_price, 'quantity', oi.quantity)
                       ) FILTER (WHERE oi.id IS NOT NULL),
                       '[]'::json
                     ) as items
              FROM orders o
              LEFT JOIN customers c ON c.id::text = o.customer_id
              LEFT JOIN order_items oi ON oi.order_id = o.id
              WHERE o.id = ${existingTx.order_id}
              GROUP BY o.id, c.email
              LIMIT 1
            `
            const order = rows[0]
            if (!order) return

            let parsedShipping
            try {
              parsedShipping = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address
            } catch (e) { parsedShipping = null }

            // Read address fields from the stored shipping_address JSON. The
            // server canonicalises keys to snake_case via sanitizeAddress()
            // in orders/create, but we also accept camelCase variants for
            // forward compatibility — same pattern as orders/complete.
            const sFirstName = parsedShipping?.first_name ?? parsedShipping?.firstName ?? ""
            const sLastName  = parsedShipping?.last_name  ?? parsedShipping?.lastName  ?? ""
            const composedName = `${sFirstName} ${sLastName}`.trim()
            const shippingName = composedName || payload.buyer_name || "Customer"

            const orderEmailData = {
              orderId: String(existingTx.order_id),
              orderNumber: order.order_number,
              customerId: existingTx.customer_id || '',
              customerEmail: order.customer_email || "cs@tcglore.com",
              customerPhone: "",
              paymentMethodId: "",
              transactionId: transaction_id,
              amount: Number(order.subtotal),
              currency: payload.currency || "USD",
              items: order.items,
              shippingMethod: "Standard Shipping",
              shippingCost: Number(order.shipping_amount),
              tax: Number(order.tax_amount),
              total: Number(order.total_amount),
              orderDate: new Date(order.created_at),
              estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US"),
              shippingAddress: {
                name: shippingName,
                street:
                  parsedShipping?.address_line1 ??
                  parsedShipping?.address1 ??
                  parsedShipping?.addressLine1 ??
                  "Address not provided",
                city: parsedShipping?.city || "City not provided",
                state: parsedShipping?.state || "State not provided",
                zipCode:
                  parsedShipping?.postal_code ??
                  parsedShipping?.zipCode ??
                  parsedShipping?.postalCode ??
                  "ZIP not provided",
                country: parsedShipping?.country || "Country not provided",
              },
              trackingNumber: order.tracking_number,
            }

            // Await these internally so we catch errors, but it's detached from the HTTP response
            const customerName = payload.buyer_name || shippingName
            await sendOrderConfirmation(orderEmailData, customerName)
            await sendAdminOrderNotification(orderEmailData, customerName, Number(order.total_amount) > 500 ? "high" : "normal")
            
            console.log(`[gateway-webhook] Background emails sent efficiently for Order ${existingTx.order_id}`)
          } catch (bgError) {
            console.error("[gateway-webhook] Background email processing failed:", bgError)
          }
        })();
      }
    }

    // ── Refund (full) ─────────────────────────────────────────────────────────
    // The gateway emits payment.capture.refunded for BOTH PayPal and Stripe
    // refunds. Mark the local payment + order as refunded. Idempotency is already
    // guaranteed by the processed_webhook_events insert above (per event_id), so
    // a redelivery never double-processes.
    if (eventName === "payment.capture.refunded") {
      const { transaction_id } = payload

      if (!transaction_id) {
        console.error("[gateway-webhook] Missing transaction_id in refund payload")
        return NextResponse.json({ error: "Missing transaction_id" }, { status: 400 })
      }

      const sql = getSqlConnection()
      const existingTxResult = await sql`SELECT * FROM payment_transactions WHERE transaction_id = ${transaction_id}`

      if (existingTxResult.length === 0) {
        console.warn(`[gateway-webhook] Refund for unknown transaction ${transaction_id} — ack`)
        return NextResponse.json({ ok: true, message: "Transaction not found locally" }, { status: 200 })
      }

      const existingTx = existingTxResult[0]

      // payment_transactions.status CHECK allows 'refunded'.
      await sql`
        UPDATE payment_transactions
        SET status = 'refunded'
        WHERE transaction_id = ${transaction_id}
      `
      console.log(`[gateway-webhook] payment_transactions ${transaction_id} -> refunded`)

      // orders.status / payment_status are free-form VARCHAR. Mark the order
      // cancelled + payment refunded so it leaves the active fulfilment queue.
      if (existingTx.order_id) {
        const orderUpdateResult = await sql`
          UPDATE orders
          SET payment_status = 'REFUNDED',
              status = 'CANCELLED'
          WHERE id = ${Number(existingTx.order_id)}
          RETURNING id, order_number, payment_status, status
        `
        if (orderUpdateResult.length > 0) {
          console.log(`[gateway-webhook] ✅ Order refunded: id=${orderUpdateResult[0].id}, order_number=${orderUpdateResult[0].order_number}`)
        } else {
          console.error(`[gateway-webhook] ⚠️ Refund order update matched 0 rows! order_id=${existingTx.order_id}`)
        }
      }
    }

    // Acknowledge receipt broadly
    return NextResponse.json({ ok: true }, { status: 200 })

  } catch (error) {
    console.error("[gateway-webhook] Processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
