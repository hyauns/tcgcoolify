/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
import { getSiteUrl } from "./shared"
interface AdminOrderNotificationProps {
  orderNumber: string
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    image?: string
  }>
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  currency: string
  paymentMethod: string
  transactionId: string
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  orderDate: Date
  priority?: "normal" | "high" | "urgent"
}

export function AdminOrderNotificationTemplate({
  orderNumber,
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  items,
  subtotal,
  shippingCost,
  tax,
  total,
  currency = "USD",
  paymentMethod,
  transactionId,
  shippingAddress,
  orderDate,
  priority = "normal",
}: AdminOrderNotificationProps) {
  const priorityColors = {
    normal: { bg: "#e3f2fd", border: "#2196f3", text: "#1976d2" },
    high: { bg: "#fff3e0", border: "#ff9800", text: "#f57c00" },
    urgent: { bg: "#ffebee", border: "#f44336", text: "#d32f2f" },
  }

  const priorityColor = priorityColors[priority]

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>New Order Alert - {orderNumber}</title>
      </head>
      <body
        style={{
          fontFamily: "Arial, sans-serif",
          lineHeight: "1.6",
          color: "#333",
          margin: 0,
          padding: 0,
          backgroundColor: "#f8f9fa",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto", backgroundColor: "#ffffff" }}>
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)",
              padding: "30px",
              textAlign: "center",
            }}
          >
            <h1 style={{ color: "white", margin: 0, fontSize: "28px" }}>🚨 New Order Alert</h1>
            <p style={{ color: "white", margin: "10px 0 0 0", opacity: 0.9, fontSize: "16px" }}>
              TCG Lore Admin Dashboard
            </p>
          </div>

          {/* Priority Badge */}
          {priority !== "normal" && (
            <div
              style={{
                background: priorityColor.bg,
                border: `2px solid ${priorityColor.border}`,
                padding: "15px",
                textAlign: "center",
                color: priorityColor.text,
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              {priority.toUpperCase()} PRIORITY ORDER
            </div>
          )}

          {/* Main Content */}
          <div style={{ padding: "30px" }}>
            <h2 style={{ color: "#333", marginTop: 0 }}>New Order Received!</h2>

            <p>A new order has been placed on TCG Lore Please review the details below and process accordingly.</p>

            {/* Order Overview */}
            <div style={{ background: "#f8f9fa", padding: "25px", borderRadius: "8px", margin: "25px 0" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>Order Overview</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <strong>Order Number:</strong>
                  <br />
                  <span style={{ fontFamily: "monospace", fontSize: "16px", color: "#667eea" }}>{orderNumber}</span>
                </div>
                <div>
                  <strong>Order ID:</strong>
                  <br />
                  <span style={{ fontFamily: "monospace", fontSize: "14px", color: "#666" }}>{orderId}</span>
                </div>
                <div>
                  <strong>Order Date:</strong>
                  <br />
                  {orderDate.toLocaleString()}
                </div>
                <div>
                  <strong>Total Amount:</strong>
                  <br />
                  <span style={{ fontSize: "18px", fontWeight: "bold", color: "#28a745" }}>
                    ${total.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div style={{ background: "#e3f2fd", padding: "25px", borderRadius: "8px", margin: "25px 0" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#1976d2" }}>Customer Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <strong>Name:</strong>
                  <br />
                  {customerName}
                </div>
                <div>
                  <strong>Email:</strong>
                  <br />
                  <a href={`mailto:${customerEmail}`} style={{ color: "#1976d2" }}>
                    {customerEmail}
                  </a>
                </div>
                {customerPhone && (
                  <div>
                    <strong>Phone:</strong>
                    <br />
                    <a href={`tel:${customerPhone}`} style={{ color: "#1976d2" }}>
                      {customerPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div style={{ background: "#f3e5f5", padding: "25px", borderRadius: "8px", margin: "25px 0" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#7b1fa2" }}>Payment Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <strong>Payment Method:</strong>
                  <br />
                  {paymentMethod}
                </div>
                <div>
                  <strong>Transaction ID:</strong>
                  <br />
                  <span style={{ fontFamily: "monospace", fontSize: "14px" }}>{transactionId}</span>
                </div>
                <div>
                  <strong>Payment Status:</strong>
                  <br />
                  <span style={{ color: "#28a745", fontWeight: "bold" }}>✅ PAID</span>
                </div>
              </div>
            </div>

            {/* Items Ordered */}
            <div style={{ margin: "30px 0" }}>
              <h3 style={{ color: "#333", marginBottom: "20px" }}>Items Ordered ({items.length})</h3>
              <div style={{ border: "1px solid #dee2e6", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ padding: "15px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Product</th>
                      <th style={{ padding: "15px", textAlign: "center", borderBottom: "1px solid #dee2e6" }}>Qty</th>
                      <th style={{ padding: "15px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Price</th>
                      <th style={{ padding: "15px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={item.id}
                        style={{ borderBottom: index < items.length - 1 ? "1px solid #dee2e6" : "none" }}
                      >
                        <td style={{ padding: "15px" }}>
                          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{item.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>ID: {item.id}</div>
                        </td>
                        <td style={{ padding: "15px", textAlign: "center", fontWeight: "bold" }}>{item.quantity}</td>
                        <td style={{ padding: "15px", textAlign: "right" }}>${item.price.toFixed(2)}</td>
                        <td style={{ padding: "15px", textAlign: "right", fontWeight: "bold" }}>
                          ${(item.quantity * item.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div style={{ background: "#f8f9fa", padding: "25px", borderRadius: "8px", margin: "25px 0" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>Pricing Breakdown</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tr>
                  <td style={{ padding: "8px 0", fontSize: "16px" }}>Subtotal:</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontSize: "16px" }}>${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontSize: "16px" }}>Shipping:</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontSize: "16px" }}>${shippingCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", fontSize: "16px" }}>Tax:</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontSize: "16px" }}>${tax.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: "2px solid #333", fontWeight: "bold", fontSize: "20px" }}>
                  <td style={{ padding: "15px 0 8px 0" }}>Total:</td>
                  <td style={{ padding: "15px 0 8px 0", textAlign: "right", color: "#28a745" }}>
                    ${total.toFixed(2)} {currency}
                  </td>
                </tr>
              </table>
            </div>

            {/* Shipping Address */}
            <div style={{ background: "#fff3e0", padding: "25px", borderRadius: "8px", margin: "25px 0" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#f57c00" }}>Shipping Address</h3>
              <div style={{ fontSize: "16px", lineHeight: "1.6" }}>
                <div style={{ fontWeight: "bold" }}>{shippingAddress.name}</div>
                <div>{shippingAddress.street}</div>
                <div>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                </div>
                <div>{shippingAddress.country}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ background: "#e8f5e8", padding: "25px", borderRadius: "8px", margin: "25px 0" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#2e7d32" }}>Quick Actions</h3>
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}
              >
                <a
                  href={`${getSiteUrl()}/admin/orders/${orderId}`}
                  style={{
                    background: "#4caf50",
                    color: "white",
                    padding: "12px 20px",
                    textDecoration: "none",
                    borderRadius: "5px",
                    textAlign: "center",
                    fontWeight: "bold",
                    display: "block",
                  }}
                >
                  View Order Details
                </a>
                <a
                  href={`${getSiteUrl()}/admin/orders/${orderId}/fulfill`}
                  style={{
                    background: "#2196f3",
                    color: "white",
                    padding: "12px 20px",
                    textDecoration: "none",
                    borderRadius: "5px",
                    textAlign: "center",
                    fontWeight: "bold",
                    display: "block",
                  }}
                >
                  Process Order
                </a>
                <a
                  href={`mailto:${customerEmail}?subject=Your TCG Lore Order ${orderNumber}`}
                  style={{
                    background: "#ff9800",
                    color: "white",
                    padding: "12px 20px",
                    textDecoration: "none",
                    borderRadius: "5px",
                    textAlign: "center",
                    fontWeight: "bold",
                    display: "block",
                  }}
                >
                  Contact Customer
                </a>
              </div>
            </div>

            <p style={{ color: "#666", fontSize: "14px", marginTop: "30px" }}>
              This is an automated notification from the TCG Lore order management system.
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              backgroundColor: "#f8f9fa",
              color: "#666",
              fontSize: "12px",
            }}
          >
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "13px", color: "#444" }}>TCG Lore Admin System</p>
            <p style={{ margin: "4px 0 0 0" }}>
              <a href="mailto:cs@tcglore.com" style={{ color: "#ff6b35", textDecoration: "none" }}>cs@tcglore.com</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136</p>
            <p style={{ margin: "8px 0 0 0" }}>© 2026 TCG Lore All rights reserved.</p>
            <p style={{ margin: "4px 0 0 0" }}>Generated at {new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
    </html>
  )
}

// Plain text version
export function getAdminOrderNotificationText({
  orderNumber,
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  items,
  subtotal,
  shippingCost,
  tax,
  total,
  currency = "USD",
  paymentMethod,
  transactionId,
  shippingAddress,
  orderDate,
  priority = "normal",
}: AdminOrderNotificationProps): string {
  return `
🚨 NEW ORDER ALERT - TCG Lore Admin

${priority !== "normal" ? `${priority.toUpperCase()} PRIORITY ORDER\n` : ""}
ORDER OVERVIEW:
Order Number: ${orderNumber}
Order ID: ${orderId}
Order Date: ${orderDate.toLocaleString()}
Total Amount: $${total.toFixed(2)} ${currency}

CUSTOMER INFORMATION:
Name: ${customerName}
Email: ${customerEmail}${customerPhone ? `\nPhone: ${customerPhone}` : ""}

PAYMENT INFORMATION:
Payment Method: ${paymentMethod}
Transaction ID: ${transactionId}
Payment Status: ✅ PAID

ITEMS ORDERED (${items.length}):
${items.map((item) => `${item.name} - Qty: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`).join("\n")}

PRICING BREAKDOWN:
Subtotal: $${subtotal.toFixed(2)}
Shipping: $${shippingCost.toFixed(2)}
Tax: $${tax.toFixed(2)}
Total: $${total.toFixed(2)} ${currency}

SHIPPING ADDRESS:
${shippingAddress.name}
${shippingAddress.street}
${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
${shippingAddress.country}

QUICK ACTIONS:
• View Order: ${getSiteUrl()}/admin/orders/${orderId}
• Process Order: ${getSiteUrl()}/admin/orders/${orderId}/fulfill
• Contact Customer: ${customerEmail}

This is an automated notification from the TCG Lore order management system.

© 2026 TCG Lore All rights reserved.
Admin: cs@tcglore.com | 1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
Generated at ${new Date().toLocaleString()}
  `.trim()
}

