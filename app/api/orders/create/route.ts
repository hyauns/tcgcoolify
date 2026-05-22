export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { checkCheckoutRateLimit, getClientIP } from "@/lib/rate-limiter"
import { requireSession } from "@/lib/auth-guard"
import { getSql } from "@/lib/db-client"
import { detectCardBrand, encryptPhone, maskPhone, encryptCardNumber, createHash, encryptCvv } from "@/lib/payment-security"
import { calculateSalesTax } from "@/lib/tax"
import { calculateShipping } from "@/lib/shipping"

async function resolveCustomerId(sql: any, userId: string): Promise<string | null> {
  if (!userId || userId === "guest") return null

  const existingRes = await sql`SELECT id FROM customers WHERE user_id = ${userId}::uuid LIMIT 1`
  if (existingRes.length > 0) return String(existingRes[0].id)

  const userRes = await sql`SELECT email, first_name, last_name FROM users WHERE user_id = ${userId}::uuid LIMIT 1`
  if (userRes.length === 0) return null

  const userRow = userRes[0]

  const createRes = await sql`
    INSERT INTO customers (user_id, email, first_name, last_name, total_orders, total_spent)
    SELECT ${userId}::uuid, ${userRow.email}, ${userRow.first_name}, ${userRow.last_name}, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM customers WHERE user_id = ${userId}::uuid)
    RETURNING id
  `

  if (createRes.length === 0) {
    const refetchRes = await sql`SELECT id FROM customers WHERE user_id = ${userId}::uuid LIMIT 1`
    return refetchRes.length > 0 ? String(refetchRes[0].id) : null
  }
  return String(createRes[0].id)
}

async function resolveGuestCustomerId(
  sql: any,
  email: string,
  firstName: string,
  lastName: string,
): Promise<string | null> {
  if (!email) return null

  // Look up ANY existing customer row with this email — registered or guest.
  // The `customers.email` column has a UNIQUE constraint, so there can be at most one.
  // Previously this only checked `user_id IS NULL`, which missed registered users
  // and caused a duplicate-key violation on the subsequent INSERT.
  const existingRes = await sql`SELECT id FROM customers WHERE email = ${email} LIMIT 1`
  if (existingRes.length > 0) return String(existingRes[0].id)

  const createRes = await sql`
    INSERT INTO customers (email, first_name, last_name, total_orders, total_spent)
    VALUES (${email}, ${firstName}, ${lastName}, 0, 0)
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id
  `
  return createRes.length > 0 ? String(createRes[0].id) : null
}

function sanitizeAddress(raw: Record<string, any>) {
  return {
    first_name: raw.firstName ?? raw.first_name ?? "",
    last_name: raw.lastName ?? raw.last_name ?? "",
    address_line1: raw.address1 ?? raw.addressLine1 ?? raw.address ?? "",
    address_line2: raw.address2 ?? raw.addressLine2 ?? null,
    city: raw.city ?? "",
    state: (raw.state ?? "").slice(0, 10),
    postal_code: raw.zipCode ?? raw.postalCode ?? "",
    country: raw.country ?? "United States",
    phone: raw.phone ?? null,
  }
}

function encryptAddressPhone(addr: ReturnType<typeof sanitizeAddress>) {
  return {
    ...addr,
    phone: addr.phone ? encryptPhone(addr.phone) : null,
  }
}

function isAddressValid(addr: ReturnType<typeof sanitizeAddress>): boolean {
  return !!(
    addr.first_name.trim() &&
    addr.last_name.trim() &&
    addr.address_line1.trim() &&
    addr.city.trim() &&
    addr.state.trim() &&
    addr.postal_code.trim()
  )
}

export async function POST(request: NextRequest) {
  const t0 = performance.now()
  const timings: Record<string, number> = {}

  const clientIP = getClientIP(request)
  const rateLimitResult = await checkCheckoutRateLimit(clientIP)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many checkout attempts. Please try again later." }, { status: 429 })
  }

  try {
    const body = await request.json()
    const {
      userId,
      orderNumber,
      items,
      subtotal,
      shippingMethod,
      totalAmount,
      shippingAddress: rawShipping,
      billingAddress: rawBilling,
      paymentInfo,
    } = body
    // `shippingAmount` is intentionally NOT destructured. The server now
    // recomputes shipping from the chosen method + server-verified subtotal
    // via `calculateShipping()` so a tampered or stale client value cannot
    // poison the gateway charge. See _audit/17-PHASE-4C-2-BLOCKER-REPORT.md.

    if (!orderNumber || !items || !Array.isArray(items) || !totalAmount) {
      return NextResponse.json({ error: "Missing required order data" }, { status: 400 })
    }

    if (userId && userId !== "guest") {
      const session = await requireSession()
      if (session instanceof NextResponse) {
        return session
      }
      if (session.userId !== userId) {
        return NextResponse.json({ error: "Unauthorized: Invalid session for this user ID" }, { status: 403 })
      }
    }

    const rootSql = getSql()

    // postgres.js transaction — replaces Pool.connect() + BEGIN/COMMIT/ROLLBACK
    // sql.begin() auto-COMMITs on success, auto-ROLLBACKs on throw.
    const result = await rootSql.begin(async (sql) => {
      let t1 = performance.now()

      let serverSubtotal = 0

      for (const item of items) {
        const requestedQuantity = Number(item.quantity)

        // Lock the product row and read stock + price
        const productRows = await sql`
          SELECT id, stock_quantity, is_pre_order, price
          FROM products
          WHERE id = ${String(item.id)}
          FOR UPDATE
        `
        if (productRows.length === 0) {
          throw new Error(`PRODUCT_NOT_FOUND:${item.name}`)
        }

        const product = productRows[0]
        const stockQuantity = Number(product.stock_quantity) || 0
        const isPreOrder = Boolean(product.is_pre_order)
        item.price = Number(product.price) || 0

        // Pre-order products skip stock check
        if (!isPreOrder && stockQuantity < requestedQuantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.name}`)
        }

        // Atomic stock deduction — prevents overselling via WHERE guard
        const updateResult = await sql`
          UPDATE products
          SET stock_quantity = stock_quantity - ${requestedQuantity}
          WHERE id = ${String(item.id)}
            AND stock_quantity >= ${requestedQuantity}
          RETURNING id, stock_quantity
        `

        // If no row returned and not pre-order, another checkout took the stock
        if (updateResult.length === 0 && !isPreOrder) {
          throw new Error(`INSUFFICIENT_STOCK:${item.name}`)
        }

        // For pre-order products where stock might be 0, allow negative
        if (updateResult.length === 0 && isPreOrder) {
          await sql`
            UPDATE products
            SET stock_quantity = GREATEST(0, stock_quantity - ${requestedQuantity})
            WHERE id = ${String(item.id)}
          `
        }

        serverSubtotal += item.price * requestedQuantity
      }

      timings.inventory_check = performance.now() - t1
      t1 = performance.now()

      const customerEmail: string | null =
        body.customerEmail ?? body.email ?? rawShipping?.email ?? rawBilling?.email ?? null

      let customerId: string | null = null
      if (userId && userId !== "guest") {
        customerId = await resolveCustomerId(sql, userId)
      } else if (customerEmail) {
        const guestFirst = rawShipping?.firstName ?? rawBilling?.firstName ?? "Guest"
        const guestLast = rawShipping?.lastName ?? rawBilling?.lastName ?? ""
        customerId = await resolveGuestCustomerId(sql, customerEmail, guestFirst, guestLast)
      }

      timings.customer_lookup = performance.now() - t1
      t1 = performance.now()

      const cleanShipping = sanitizeAddress(rawShipping ?? {})
      const cleanBilling = sanitizeAddress(rawBilling ?? rawShipping ?? {})

      // Canonical shipping cost — computed from the customer's chosen method
      // and the server-verified subtotal. Mirrors the UI calculation so the
      // gateway is charged the same amount the customer saw at checkout. Never
      // read shipping from the client body.
      const verifiedShippingAmount = calculateShipping(shippingMethod, serverSubtotal)
      const formattedShippingAmount = Number(verifiedShippingAmount.toFixed(2))

      const verifiedTaxAmount = await calculateSalesTax({
        amount: serverSubtotal,
        shipping: verifiedShippingAmount,
        toZip: cleanShipping.postal_code,
        toState: cleanShipping.state,
        toCity: cleanShipping.city,
        toCountry: cleanShipping.country,
      })

      const verifiedTotalAmount = serverSubtotal + verifiedShippingAmount + verifiedTaxAmount
      const formattedTotalAmount = Number(verifiedTotalAmount.toFixed(2))
      const formattedTaxAmount = Number(verifiedTaxAmount.toFixed(2))

      const encryptedShipping = encryptAddressPhone(cleanShipping)
      const encryptedBilling = encryptAddressPhone(cleanBilling)

      timings.encryption = performance.now() - t1
      t1 = performance.now()

      console.log(
        `[orders/create] Encrypted checkout phone data for shipping ${maskPhone(cleanShipping.phone)} and billing ${maskPhone(cleanBilling.phone)}`,
      )

      const shippingJson = JSON.stringify(encryptedShipping)
      const billingJson = JSON.stringify(encryptedBilling)

      const orderRes = await sql`
        INSERT INTO orders (
          customer_id, order_number, status,
          subtotal, tax_amount, shipping_amount, total_amount,
          payment_status, shipping_address, billing_address, order_date
        ) VALUES (
          ${customerId ?? "guest"}, ${orderNumber}, 'PENDING',
          ${serverSubtotal}, ${formattedTaxAmount},
          ${formattedShippingAmount}, ${formattedTotalAmount},
          'PENDING',
          ${shippingJson},
          ${billingJson},
          NOW()
        ) RETURNING *
      `
      const order = orderRes[0]

      timings.insert_order = performance.now() - t1
      t1 = performance.now()

      // Batch line-item insert. Same columns, same values, same row order as the
      // previous per-item loop — just one round-trip to Neon instead of N. Still
      // inside the existing sql.begin() transaction, so atomicity is unchanged
      // (any error here rolls back the order row, customer updates, and stock
      // deductions). The empty-array guard preserves the previous loop's silent
      // no-op behavior on an empty items array.
      if (items.length > 0) {
        const orderItemRows = items.map((item: any) => ({
          order_id: order.id,
          product_id: String(item.id),
          product_name: item.name,
          quantity: Number(item.quantity),
          unit_price: Number(item.price),
          total_price: Number(item.price) * Number(item.quantity),
        }))
        await sql`
          INSERT INTO order_items ${sql(
            orderItemRows,
            "order_id",
            "product_id",
            "product_name",
            "quantity",
            "unit_price",
            "total_price",
          )}
        `
      }

      timings.insert_line_items = performance.now() - t1
      t1 = performance.now()

      if (customerId && isAddressValid(cleanShipping)) {
        await sql`
          INSERT INTO shipping_addresses (
            customer_id, first_name, last_name,
            address_line1, address_line2, city, state,
            postal_code, country, phone, is_default
          ) VALUES (${Number(customerId)}, ${cleanShipping.first_name}, ${cleanShipping.last_name}, ${cleanShipping.address_line1}, ${cleanShipping.address_line2}, ${cleanShipping.city}, ${cleanShipping.state}, ${cleanShipping.postal_code}, ${cleanShipping.country}, ${encryptedShipping.phone}, false)
          ON CONFLICT DO NOTHING
        `
      }

      let billingAddressId: string | null = null
      if (customerId && isAddressValid(cleanBilling)) {
        const billingRes = await sql`
          INSERT INTO billing_addresses (
            customer_id, first_name, last_name,
            address_line1, address_line2, city, state,
            postal_code, country
          ) VALUES (${String(customerId)}, ${cleanBilling.first_name}, ${cleanBilling.last_name}, ${cleanBilling.address_line1}, ${cleanBilling.address_line2}, ${cleanBilling.city}, ${cleanBilling.state}, ${cleanBilling.postal_code}, ${cleanBilling.country})
          RETURNING id
        `
        billingAddressId = billingRes.length > 0 ? String(billingRes[0].id) : null
      } else if (paymentInfo?.cardNumber && isAddressValid(cleanBilling)) {
        const billingRes = await sql`
          INSERT INTO billing_addresses (
            customer_id, first_name, last_name,
            address_line1, address_line2, city, state,
            postal_code, country
          ) VALUES (${"guest"}, ${cleanBilling.first_name}, ${cleanBilling.last_name}, ${cleanBilling.address_line1}, ${cleanBilling.address_line2}, ${cleanBilling.city}, ${cleanBilling.state}, ${cleanBilling.postal_code}, ${cleanBilling.country})
          RETURNING id
        `
        billingAddressId = billingRes.length > 0 ? String(billingRes[0].id) : null
      }

      let paymentMethodId: string | null = null
      if (paymentInfo?.cardNumber) {
        const rawCard = String(paymentInfo.cardNumber).replace(/\D/g, "")
        const last4 = rawCard.slice(-4)
        const brand = detectCardBrand(rawCard)
        const rawCvv = String(paymentInfo.cvv ?? "")

        const [mm, yy] = String(paymentInfo.expiryDate ?? "").split("/")
        const expiryMonth = parseInt(mm, 10) || 1
        const rawYear = parseInt(yy, 10) || 0
        const expiryYear = rawYear < 100 ? 2000 + rawYear : rawYear

        const pmCustomerId = customerId ?? "guest"
        const pmUserId = userId && userId !== "guest" ? userId : null

        const encCard = encryptCardNumber(rawCard)
        const cardHash = createHash(rawCard)
        const encCvv = encryptCvv("")
        const cvvHash = createHash("")

        const pmRes = await sql`
          INSERT INTO payment_methods (
            user_id, customer_id, billing_address_id,
            last4, brand, expiry_month, expiry_year,
            encrypted_card_number, card_number_hash,
            encrypted_cvv, cvv_hash,
            is_default
          ) VALUES (${pmUserId ? String(pmUserId) : null}, ${pmCustomerId}, ${billingAddressId ?? null}, ${last4}, ${brand}, ${expiryMonth}, ${expiryYear}, ${encCard}, ${cardHash}, ${encCvv}, ${cvvHash}, true)
          ON CONFLICT (customer_id, card_number_hash)
          DO UPDATE SET
            last_used = NOW(),
            is_default = true,
            billing_address_id = EXCLUDED.billing_address_id
          RETURNING id
        `
        if (pmRes.length === 0) throw new Error("payment_methods INSERT returned no row")
        paymentMethodId = String(pmRes[0].id)
      }

      timings.payment_method = performance.now() - t1
      t1 = performance.now()

      const transactionId = `txn_${Date.now()}_${globalThis.crypto.randomUUID().slice(0, 8)}`
      if (paymentMethodId) {
        const txCustomerId = customerId ?? "guest"
        const gatewayResponse = JSON.stringify({ source: "checkout" })
        await sql`
          INSERT INTO payment_transactions (
            customer_id, payment_method_id, order_id,
            transaction_id, amount, currency,
            status, risk_score, gateway_response
          ) VALUES (${txCustomerId}, ${paymentMethodId}, ${String(order.id)}, ${transactionId}, ${formattedTotalAmount}, 'USD', 'pending', 0, ${gatewayResponse})
        `
      }

      if (customerId) {
        await sql`
          UPDATE customers
          SET total_orders    = total_orders + 1,
              total_spent     = total_spent  + ${formattedTotalAmount},
              last_order_date = NOW(),
              updated_at      = NOW()
          WHERE id = ${customerId}
        `
      }

      timings.finalize = performance.now() - t1

      return {
        order,
        orderNumber,
        transactionId,
        paymentMethodId,
      }
    })

    return NextResponse.json({
      success: true,
      order: {
        id: String(result.order.id),
        orderNumber: result.orderNumber,
        status: result.order.status,
        total: result.order.total_amount,
        createdAt: result.order.order_date,
        transactionId: result.transactionId,
        paymentMethodId: result.paymentMethodId,
      },
    })
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[orders/create] Error:", message)

    if (message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json(
        { error: "Insufficient stock", detail: `Not enough stock for ${message.split(":")[1]}` },
        { status: 400 },
      )
    }
    if (message.startsWith("PRODUCT_NOT_FOUND:")) {
      return NextResponse.json({ error: "Product not found", detail: message.split(":")[1] }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  } finally {
    const t1 = performance.now()
    const total = Math.round(t1 - t0)
    const breakdown = Object.entries(timings).map(([k, v]) => `${k}=${Math.round(v)}ms`).join(", ")
    console.log(`[Perf] Create Order: ${total}ms [${breakdown}]`)
  }
}
