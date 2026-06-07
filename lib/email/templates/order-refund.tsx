/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */

import { getLogoUrl } from "./shared"

interface OrderRefundProps {
  orderNumber: string
  customerName: string
  refundedAt: Date
  /** Amount refunded back to the customer. */
  amount: number
  currency: string
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function OrderRefundTemplate({
  orderNumber,
  customerName,
  refundedAt,
  amount,
  currency,
}: OrderRefundProps) {
  const formatted = formatAmount(amount, currency)
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Order Cancelled & Refunded - {orderNumber}</title>
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
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              padding: "30px",
              textAlign: "center",
            }}
          >
            <img src={getLogoUrl()} alt="TCG Lore Logo" width="180" style={{ height: "auto", display: "block", margin: "0 auto" }} />
            <p style={{ color: "white", margin: "10px 0 0 0", opacity: 0.95 }}>Refund Confirmed</p>
          </div>

          {/* Main Content */}
          <div style={{ padding: "40px" }}>
            <h2 style={{ color: "#333", marginTop: 0 }}>Hi {customerName},</h2>

            <p>
              Your order has been cancelled and a full refund of{" "}
              <strong>{formatted}</strong> has been issued back to your original
              payment method.
            </p>
            <p>
              Depending on your bank or card issuer, it can take{" "}
              <strong>5–10 business days</strong> for the refund to appear on your
              statement. No further action is needed on your side.
            </p>

            <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", margin: "20px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "5px 0", fontWeight: "bold" }}>Order Number:</td>
                    <td style={{ padding: "5px 0", textAlign: "right" }}>{orderNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "5px 0", fontWeight: "bold" }}>Amount Refunded:</td>
                    <td style={{ padding: "5px 0", textAlign: "right" }}>{formatted}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "5px 0", fontWeight: "bold" }}>Refunded On:</td>
                    <td style={{ padding: "5px 0", textAlign: "right" }}>{refundedAt.toLocaleDateString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              We're sorry this order didn't work out. If you have any questions
              about your refund, just reply to this email or contact us at{" "}
              <a href="mailto:cs@tcglore.com" style={{ color: "#11998e", textDecoration: "underline" }}>
                cs@tcglore.com
              </a>{" "}
              with your order number — we're happy to help.
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
              <a href="mailto:cs@tcglore.com" style={{ color: "#11998e", textDecoration: "none" }}>cs@tcglore.com</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>
              <a href="tel:+18884961626" style={{ color: "#11998e", textDecoration: "none" }}>(888) 496-1626</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136</p>
            <p style={{ margin: "8px 0 0 0" }}>© 2026 TCG Lore. Operated by TOY HAULERZ LLC. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  )
}

export function getOrderRefundText({
  orderNumber,
  customerName,
  refundedAt,
  amount,
  currency,
}: OrderRefundProps): string {
  const formatted = formatAmount(amount, currency)
  return `
Order Cancelled & Refunded - TCG Lore

Hi ${customerName},

Your order has been cancelled and a full refund of ${formatted} has been issued back to your original payment method.

Depending on your bank or card issuer, it can take 5-10 business days for the refund to appear on your statement. No further action is needed on your side.

ORDER DETAILS:
Order Number: ${orderNumber}
Amount Refunded: ${formatted}
Refunded On: ${refundedAt.toLocaleDateString()}

We're sorry this order didn't work out. If you have any questions about your refund, just reply to this email or contact us at cs@tcglore.com with your order number — we're happy to help.

Best regards,
The TCG Lore Team

© 2026 TCG Lore. Operated by TOY HAULERZ LLC. All rights reserved.
Support: cs@tcglore.com | Phone: (888) 496-1626
1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
  `.trim()
}
