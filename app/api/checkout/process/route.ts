import { NextResponse } from "next/server"
import { checkCheckoutRateLimit, getClientIP } from "@/lib/rate-limiter"
import { getSql } from "@/lib/db-client"
import { getGatewayProviderSettings, getGatewayFlow } from "@/app/actions/settings"
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email/send-email"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: Request) {
  const t0 = performance.now()

  const clientIP = getClientIP(req)
  const rateLimitResult = await checkCheckoutRateLimit(clientIP)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many checkout attempts. Please try again later." }, { status: 429 })
  }

  try {
    const { orderId, transactionId, amount, paymentInfo, customerName, customerEmail } = await req.json()

    const config = await getGatewayProviderSettings()

    const sql = getSql()
    const [txRow] = await sql`SELECT amount FROM payment_transactions WHERE transaction_id = ${transactionId}`
    if (!txRow) {
      console.error(`[checkout-process] Transaction ${transactionId} not found`)
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }
    const trueAmount = txRow.amount

    if (!config.baseUrl || !config.apiKey || !config.storeId) {
      console.error("[checkout-process] Gateway is missing configuration")
      return NextResponse.json({ error: "Gateway configured incorrectly" }, { status: 500 })
    }

    // ── HOSTED REDIRECT FLOW (Stripe / Shopify) ───────────────────────────────
    // When the admin selects Stripe OR Shopify in Payment Settings, defer to the
    // gateway's /api/gateway/checkout (no card collected here) and return a
    // redirect URL. Both are redirect flows — the gateway decides the actual
    // processor from the store's provider_type; the storefront behaves the same.
    // The order stays PENDING and is completed later by the gateway webhook.
    // The mock-charge path below is left completely untouched.
    const flow = await getGatewayFlow()
    if (flow === "stripe" || flow === "shopify") {
      const checkoutEndpoint = config.baseUrl.endsWith("/")
        ? `${config.baseUrl}api/gateway/checkout`
        : `${config.baseUrl}/api/gateway/checkout`

      // Resolve a display item name from the order (the gateway masks it anyway).
      let itemName = "Order"
      try {
        const [itemRow] = await sql`SELECT product_name FROM order_items WHERE order_id = ${Number(orderId)} ORDER BY id ASC LIMIT 1`
        if (itemRow?.product_name) itemName = String(itemRow.product_name)
      } catch {
        // non-fatal — fall back to the generic name
      }

      const checkoutRes = await fetch(checkoutEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Store-ID": config.storeId,
          "X-API-Key": config.apiKey,
        },
        body: JSON.stringify({
          amount: Number(trueAmount),
          currency: "USD",
          itemName,
          customerEmail: customerEmail || undefined,
        }),
      })

      if (!checkoutRes.ok) {
        console.error(`[checkout-process] Stripe checkout init failed (${checkoutRes.status}) for ${transactionId}`)
        return NextResponse.json({ error: "Gateway rejected checkout" }, { status: 400 })
      }

      const checkoutData = await checkoutRes.json()
      const approvalUrl: string | undefined = checkoutData.approvalUrl || checkoutData.popupUrl
      const gatewayTxId: string | undefined = checkoutData.transactionId

      if (!approvalUrl) {
        console.error(`[checkout-process] Stripe checkout returned no approvalUrl for ${transactionId}`)
        return NextResponse.json({ error: "Gateway did not return a redirect URL" }, { status: 502 })
      }

      // Sync our local transaction id to the gateway's so the inbound webhook matches.
      if (gatewayTxId) {
        await sql`
          UPDATE payment_transactions
          SET transaction_id = ${gatewayTxId}
          WHERE transaction_id = ${transactionId}
        `
        console.log(`[checkout-process] Stripe checkout created — synced ${transactionId} -> ${gatewayTxId}`)
      }

      // Order stays PENDING — the gateway webhook flips it to COMPLETED.
      return NextResponse.json({
        success: true,
        redirectUrl: approvalUrl,
        transactionId: gatewayTxId ?? transactionId,
      })
    }

    // ── MOCK-CHARGE FLOW (unchanged) ─────────────────────────────────────────
    const endpoint = config.baseUrl.endsWith("/")
      ? `${config.baseUrl}api/gateway/mock-charge`
      : `${config.baseUrl}/api/gateway/mock-charge`

    const rawCard = String(paymentInfo.cardNumber || "").replace(/\D/g, "")
    const rawCvv = String(paymentInfo.cvv || "").replace(/\D/g, "")

    const [mm, yy] = String(paymentInfo.expiryDate || "").split("/")
    const expMonth = parseInt(mm || "1", 10)
    let expYear = parseInt(yy || "0", 10)
    if (expYear > 0 && expYear < 100) expYear += 2000

    const payloadBody = {
      transaction_id: transactionId,
      amount: Number(trueAmount).toFixed(2),
      currency: "USD",
      cardNumber: rawCard,
      cvv: rawCvv,
      expMonth,
      expYear,
      buyerName: customerName,
      billingAddress: paymentInfo.billingAddress || undefined,
    }

    console.log(`[checkout-process] Forwarding transaction ${transactionId} for order ${orderId ?? "unknown"}`)

    const gatewayRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Store-ID": config.storeId,
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify(payloadBody),
    })

    if (!gatewayRes.ok) {
      console.error(`[checkout-process] Gateway error (${gatewayRes.status}) for transaction ${transactionId}`)
      return NextResponse.json({ error: "Gateway rejected payment" }, { status: 400 })
    }

    const gatewayData = await gatewayRes.json()

    if (gatewayData.transaction_id) {
      await sql`
        UPDATE payment_transactions
        SET transaction_id = ${gatewayData.transaction_id}
        WHERE transaction_id = ${transactionId}
      `
      console.log(`[checkout-process] Synced local transaction ${transactionId}`)
    }

    const gatewayStatus = String(gatewayData.status || "").toUpperCase()
    if (gatewayStatus === "COMPLETED" || gatewayStatus === "SUCCEEDED") {
      await sql`
        UPDATE payment_transactions
        SET status = 'succeeded'
        WHERE transaction_id = ${gatewayData.transaction_id || transactionId}
      `

      if (orderId) {
        const updateResult = await sql`
          UPDATE orders
          SET payment_status = 'COMPLETED',
              status = 'PROCESSING'
          WHERE id = ${Number(orderId)}
          RETURNING id, order_number, payment_status, status
        `
        if (updateResult.length > 0) {
          console.log(`[checkout-process] Order ${updateResult[0].order_number} confirmed directly`)

          // Fire & Forget: Send confirmation email as safety net
          // (Webhook may also send one, but this guarantees delivery)
          const finalOrderId = orderId
          const finalTransactionId = gatewayData.transaction_id || transactionId
          ;(async () => {
            try {
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
                WHERE o.id = ${Number(finalOrderId)}
                GROUP BY o.id, c.email
                LIMIT 1
              `
              const order = rows[0]
              if (!order || !order.customer_email) return

              let parsedShipping
              try {
                parsedShipping = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address
              } catch { parsedShipping = null }

              // Read address fields from the stored shipping_address JSON. The
              // server canonicalises keys to snake_case via sanitizeAddress()
              // in orders/create, but we also accept camelCase variants for
              // forward compatibility — same pattern as orders/complete.
              const sFirstName = parsedShipping?.first_name ?? parsedShipping?.firstName ?? ""
              const sLastName  = parsedShipping?.last_name  ?? parsedShipping?.lastName  ?? ""
              const composedName = `${sFirstName} ${sLastName}`.trim()
              const shippingName = composedName || customerName || "Customer"

              const orderEmailData = {
                orderId: String(finalOrderId),
                orderNumber: order.order_number,
                customerId: '',
                customerEmail: order.customer_email,
                customerPhone: "",
                paymentMethodId: "",
                transactionId: finalTransactionId,
                amount: Number(order.subtotal),
                currency: "USD",
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

              await sendOrderConfirmation(orderEmailData, shippingName)
              await sendAdminOrderNotification(orderEmailData, shippingName, Number(order.total_amount) > 500 ? "high" : "normal")
              console.log(`[checkout-process] Fallback emails sent for Order ${finalOrderId}`)
            } catch (emailErr) {
              console.error("[checkout-process] Fallback email failed:", emailErr)
            }
          })()
        } else {
          console.error(`[checkout-process] Order update matched 0 rows for order ${orderId}`)
        }
      }
    }

    return NextResponse.json({ success: true, message: "Payment accepted by gateway" })
  } catch {
    console.error("[checkout-process] Exception")
    return NextResponse.json({ error: "Internal payment processing error" }, { status: 500 })
  } finally {
    const t1 = performance.now()
    console.log("[Perf] Checkout Process:", t1 - t0, "ms")
  }
}
