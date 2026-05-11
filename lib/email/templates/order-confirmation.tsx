/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
}

import { getLogoUrl } from "./shared"

interface OrderConfirmationProps {
  orderNumber: string
  orderDate: Date
  customerName: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  currency: string
  estimatedDelivery?: string
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  trackingNumber?: string
}

export function OrderConfirmationTemplate({
  orderNumber,
  orderDate,
  customerName,
  items,
  subtotal,
  shippingCost,
  tax,
  total,
  currency = "USD",
  estimatedDelivery,
  shippingAddress,
  trackingNumber,
}: OrderConfirmationProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Order Confirmation - {orderNumber}</title>
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
        <div style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "#ffffff" }}>
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "30px",
              textAlign: "center",
            }}
          >
            <img src={getLogoUrl()} alt="TCG Lore Operated by TCG Lore Logo" width="180" style={{ height: "auto", display: "block", margin: "0 auto" }} />
            <p style={{ color: "white", margin: "10px 0 0 0", opacity: 0.9 }}>Order Confirmation</p>
          </div>

          {/* Main Content */}
          <div style={{ padding: "40px" }}>
            <h2 style={{ color: "#333", marginTop: 0 }}>Thank you for your order, {customerName}!</h2>

            <p>Your order has been confirmed and will be shipped soon. Here are your order details:</p>

            {/* Order Summary */}
            <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", margin: "20px 0" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Order Summary</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tr>
                  <td style={{ padding: "5px 0", fontWeight: "bold" }}>Order Number:</td>
                  <td style={{ padding: "5px 0", textAlign: "right" }}>{orderNumber}</td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0", fontWeight: "bold" }}>Order Date:</td>
                  <td style={{ padding: "5px 0", textAlign: "right" }}>{orderDate.toLocaleDateString()}</td>
                </tr>
                {trackingNumber && (
                  <tr>
                    <td style={{ padding: "5px 0", fontWeight: "bold" }}>Tracking Number:</td>
                    <td style={{ padding: "5px 0", textAlign: "right", fontFamily: "monospace" }}>{trackingNumber}</td>
                  </tr>
                )}
                {estimatedDelivery && (
                  <tr>
                    <td style={{ padding: "5px 0", fontWeight: "bold" }}>Estimated Delivery:</td>
                    <td style={{ padding: "5px 0", textAlign: "right" }}>{estimatedDelivery}</td>
                  </tr>
                )}
              </table>
            </div>

            {/* Items */}
            <div style={{ margin: "30px 0" }}>
              <h3 style={{ color: "#333", marginBottom: "20px" }}>Items Ordered</h3>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    borderBottom: index < items.length - 1 ? "1px solid #eee" : "none",
                    padding: "15px 0",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>{item.name}</div>
                    <div style={{ color: "#666", fontSize: "14px" }}>
                      Quantity: {item.quantity} × ${item.price.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>${(item.quantity * item.price).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Pricing Breakdown */}
            <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", margin: "20px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tr>
                  <td style={{ padding: "5px 0" }}>Subtotal:</td>
                  <td style={{ padding: "5px 0", textAlign: "right" }}>${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0" }}>Shipping:</td>
                  <td style={{ padding: "5px 0", textAlign: "right" }}>${shippingCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0" }}>Tax:</td>
                  <td style={{ padding: "5px 0", textAlign: "right" }}>${tax.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: "2px solid #333", fontWeight: "bold", fontSize: "18px" }}>
                  <td style={{ padding: "10px 0 5px 0" }}>Total:</td>
                  <td style={{ padding: "10px 0 5px 0", textAlign: "right" }}>
                    ${total.toFixed(2)} USD
                  </td>
                </tr>
              </table>
            </div>

            {/* Shipping Address */}
            <div style={{ margin: "30px 0" }}>
              <h3 style={{ color: "#333", marginBottom: "15px" }}>Shipping Address</h3>
              <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}>
                <div>{shippingAddress.name}</div>
                <div>{shippingAddress.street}</div>
                <div>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                </div>
                <div>{shippingAddress.country}</div>
              </div>
            </div>

            {/* Next Steps */}
            <div style={{ background: "#e3f2fd", padding: "20px", borderRadius: "8px", margin: "30px 0" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#1976d2" }}>What's Next?</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#333" }}>
                <li>We'll send you tracking information once your order ships</li>
                <li>You can track your order status in your account</li>
                <li>Contact us if you have any questions about your order</li>
              </ul>
            </div>

            <p style={{ color: "#666", fontSize: "14px" }}>
              Thank you for choosing TCG Lore for your trading card needs!
            </p>

            <p style={{ color: "#666", fontSize: "14px" }}>
              Best regards,
              <br />
              The TCG Lore Team
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
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "13px", color: "#444" }}>TCG Lore</p>
            <p style={{ margin: "4px 0 0 0" }}>
              <a href="mailto:cs@tcglore.com" style={{ color: "#667eea", textDecoration: "none" }}>cs@tcglore.com</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>
              <a href="tel:+13036683245" style={{ color: "#667eea", textDecoration: "none" }}>+1 (303) 668-3245</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136</p>
            <p style={{ margin: "8px 0 0 0" }}>© 2026 TCG LORE Operated by TCG Lore. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  )
}

// Plain text version
export function getOrderConfirmationText({
  orderNumber,
  orderDate,
  customerName,
  items,
  subtotal,
  shippingCost,
  tax,
  total,
  currency = "USD",
  estimatedDelivery,
  shippingAddress,
  trackingNumber,
}: OrderConfirmationProps): string {
  return `
Order Confirmation - TCG Lore Operated by TCG Lore.

Thank you for your order, ${customerName}!

Your order has been confirmed and will be shipped soon.

ORDER DETAILS:
Order Number: ${orderNumber}
Order Date: ${orderDate.toLocaleDateString()}
${trackingNumber ? `Tracking Number: ${trackingNumber}` : ""}
${estimatedDelivery ? `Estimated Delivery: ${estimatedDelivery}` : ""}

ITEMS ORDERED:
${items.map((item) => `${item.name} - Qty: ${item.quantity} × $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`).join("\n")}

PRICING:
Subtotal: $${subtotal.toFixed(2)}
Shipping: $${shippingCost.toFixed(2)}
Tax: $${tax.toFixed(2)}
Total: $${total.toFixed(2)} USD

SHIPPING ADDRESS:
${shippingAddress.name}
${shippingAddress.street}
${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}
${shippingAddress.country}

WHAT'S NEXT:
• We'll send you tracking information once your order ships
• You can track your order status in your account
• Contact us if you have any questions about your order

Thank you for choosing TCG Lore Operated by TCG Lore. for your trading card needs!

Best regards,
The TCG Lore Operated by TCG Lore. Team

© 2026 TCG Lore Operated by TCG Lore. All rights reserved.
Support: cs@tcglore.com | Phone: +1 (303) 668-3245
1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
  `.trim()
}


