/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */

import { getLogoUrl } from "./shared"

interface OrderCancellationProps {
  orderNumber: string
  customerName: string
  cancelledAt: Date
}

export function OrderCancellationTemplate({
  orderNumber,
  customerName,
  cancelledAt,
}: OrderCancellationProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Order Cancelled - {orderNumber}</title>
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
            <img src={getLogoUrl()} alt="TCG Lore Logo" width="180" style={{ height: "auto", display: "block", margin: "0 auto" }} />
            <p style={{ color: "white", margin: "10px 0 0 0", opacity: 0.9 }}>Order Cancelled</p>
          </div>

          {/* Main Content */}
          <div style={{ padding: "40px" }}>
            <h2 style={{ color: "#333", marginTop: 0 }}>Hi {customerName},</h2>

            <p>
              Your order has been cancelled because it did not pass our
              fraud-prevention review. Our security system flagged this
              transaction during verification and we were unable to approve
              it at this time.
            </p>
            <p>
              If you believe this was a mistake, please reply to this email
              or contact us at{" "}
              <a href="mailto:cs@tcglore.com" style={{ color: "#667eea", textDecoration: "underline" }}>
                cs@tcglore.com
              </a>{" "}
              with your order number — our team will review your case manually
              and respond as quickly as we can.
            </p>

            <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", margin: "20px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "5px 0", fontWeight: "bold" }}>Order Number:</td>
                    <td style={{ padding: "5px 0", textAlign: "right" }}>{orderNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "5px 0", fontWeight: "bold" }}>Cancelled On:</td>
                    <td style={{ padding: "5px 0", textAlign: "right" }}>{cancelledAt.toLocaleDateString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment note — wording stays safe regardless of whether a charge or only an authorization was placed. */}
            <div
              style={{
                background: "#fff8e1",
                padding: "16px 20px",
                borderRadius: "8px",
                margin: "20px 0",
                border: "1px solid #ffe0b2",
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "#8d6e00", fontSize: "14px" }}>
                About your payment
              </h4>
              <p style={{ margin: 0, color: "#333", fontSize: "13px", lineHeight: "1.5" }}>
                If a payment authorization was placed for this order, it will be handled
                according to your payment provider's timeline. If you have questions about
                a specific charge, please contact us with your order number.
              </p>
            </div>

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
              <a href="tel:+18884961626" style={{ color: "#667eea", textDecoration: "none" }}>(888) 496-1626</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136</p>
            <p style={{ margin: "8px 0 0 0" }}>© 2026 TCG Lore. Operated by A Toy Haulerz LLC. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  )
}

export function getOrderCancellationText({
  orderNumber,
  customerName,
  cancelledAt,
}: OrderCancellationProps): string {
  return `
Order Cancelled - TCG Lore

Hi ${customerName},

Your order has been cancelled because it did not pass our fraud-prevention review. Our security system flagged this transaction during verification and we were unable to approve it at this time.

If you believe this was a mistake, please reply to this email or contact us at cs@tcglore.com with your order number — our team will review your case manually and respond as quickly as we can.

ORDER DETAILS:
Order Number: ${orderNumber}
Cancelled On: ${cancelledAt.toLocaleDateString()}

ABOUT YOUR PAYMENT:
If a payment authorization was placed for this order, it will be handled according to your payment provider's timeline. If you have questions about a specific charge, please contact us with your order number.

Best regards,
The TCG Lore Team

© 2026 TCG Lore. Operated by A Toy Haulerz LLC. All rights reserved.
Support: cs@tcglore.com | Phone: (888) 496-1626
1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
  `.trim()
}
