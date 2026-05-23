/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
import { getLogoUrl, getSiteUrl } from "./shared"

interface WelcomeEmailProps {
  firstName: string
  email: string
  discountCode?: string
  discountAmount?: number
}

export function WelcomeTemplate({ firstName, email, discountCode, discountAmount }: WelcomeEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to TCG Lore</title>
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
              padding: "40px",
              textAlign: "center",
            }}
          >
            <img src={getLogoUrl()} alt="TCG Lore Logo" width="180" style={{ height: "auto", display: "block", margin: "0 auto" }} />
            <p style={{ color: "white", margin: "10px 0 0 0", fontSize: "20px" }}>Welcome to our community!</p>
            <p style={{ color: "white", margin: "15px 0 0 0", opacity: 0.9, fontSize: "18px" }}>
              Your Trading Card Adventure Begins
            </p>
          </div>

          {/* Main Content */}
          <div style={{ padding: "40px" }}>
            <h2 style={{ color: "#333", marginTop: 0 }}>Hello {firstName}!</h2>

            <p>
              Welcome to the TCG Lore family! We're thrilled to have you join our community of trading card
              enthusiasts.
            </p>

            <p>
              Your email address <strong>{email}</strong> has been verified and your account is now active.
            </p>

            {/* Features */}
            <div style={{ background: "#f8f9fa", padding: "25px", borderRadius: "8px", margin: "30px 0" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#333" }}>What You Can Do Now:</h3>
              <div style={{ display: "grid", gap: "15px" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#667eea",
                      borderRadius: "50%",
                      marginRight: "15px",
                    }}
                  ></div>
                  <span>Browse our extensive collection of Magic: The Gathering, Pokemon, and Yu-Gi-Oh! cards</span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#667eea",
                      borderRadius: "50%",
                      marginRight: "15px",
                    }}
                  ></div>
                  <span>Add your favorite cards to your wishlist</span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#667eea",
                      borderRadius: "50%",
                      marginRight: "15px",
                    }}
                  ></div>
                  <span>Enjoy secure checkout and fast shipping</span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#667eea",
                      borderRadius: "50%",
                      marginRight: "15px",
                    }}
                  ></div>
                  <span>Track your orders in real-time</span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      backgroundColor: "#667eea",
                      borderRadius: "50%",
                      marginRight: "15px",
                    }}
                  ></div>
                  <span>Leave reviews and connect with other collectors</span>
                </div>
              </div>
            </div>

            {/* Discount Code */}
            {discountCode && discountAmount && (
              <div
                style={{
                  background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                  padding: "25px",
                  borderRadius: "8px",
                  margin: "30px 0",
                  textAlign: "center",
                  color: "white",
                }}
              >
                <h3 style={{ margin: "0 0 15px 0", fontSize: "24px" }}>Welcome Gift! 🎉</h3>
                <p style={{ margin: "0 0 15px 0", fontSize: "16px" }}>Get {discountAmount}% off your first purchase</p>
                <div
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "15px",
                    borderRadius: "5px",
                    margin: "15px 0",
                  }}
                >
                  <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "5px" }}>Use code:</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", letterSpacing: "2px", fontFamily: "monospace" }}>
                    {discountCode}
                  </div>
                </div>
                <p style={{ margin: "15px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
                  Valid for 30 days on your first order
                </p>
              </div>
            )}

            {/* CTA Button */}
            <div style={{ textAlign: "center", margin: "40px 0" }}>
              <a
                href={`${getSiteUrl()}/products`}
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  padding: "15px 30px",
                  textDecoration: "none",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  display: "inline-block",
                  fontSize: "16px",
                }}
              >
                Start Shopping Now
              </a>
            </div>

            {/* Popular Categories */}
            <div style={{ margin: "40px 0" }}>
              <h3 style={{ color: "#333", marginBottom: "20px" }}>Popular Categories</h3>
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "15px" }}
              >
                <div style={{ textAlign: "center", padding: "15px", background: "#f8f9fa", borderRadius: "5px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>Magic: The Gathering</div>
                </div>
                <div style={{ textAlign: "center", padding: "15px", background: "#f8f9fa", borderRadius: "5px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>Pokemon</div>
                </div>
                <div style={{ textAlign: "center", padding: "15px", background: "#f8f9fa", borderRadius: "5px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>Yu-Gi-Oh!</div>
                </div>
              </div>
            </div>

            <p style={{ color: "#666", fontSize: "14px" }}>
              If you have any questions, our support team is here to help. Just reply to this email or contact us
              through your account.
            </p>

            <p style={{ color: "#666", fontSize: "14px" }}>
              Happy collecting!
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

// Plain text version
export function getWelcomeText({ firstName, email, discountCode, discountAmount }: WelcomeEmailProps): string {
  return `
Welcome to TCG Lore!

Hello ${firstName}!

Welcome to the TCG Lore family! We're thrilled to have you join our community of trading card enthusiasts.

Your email address ${email} has been verified and your account is now active.

WHAT YOU CAN DO NOW:
• Browse our extensive collection of Magic: The Gathering, Pokemon, and Yu-Gi-Oh! cards
• Add your favorite cards to your wishlist
• Enjoy secure checkout and fast shipping
• Track your orders in real-time
• Leave reviews and connect with other collectors

${discountCode && discountAmount
      ? `
WELCOME GIFT! 🎉
Get ${discountAmount}% off your first purchase
Use code: ${discountCode}
Valid for 30 days on your first order
`
      : ""
    }

POPULAR CATEGORIES:
• Magic: The Gathering
• Pokemon
• Yu-Gi-Oh!

Start shopping: ${getSiteUrl()}/products

If you have any questions, our support team is here to help. Just reply to this email or contact us through your account.

Happy collecting!
The TCG Lore Team

© 2026 TCG Lore. Operated by A Toy Haulerz LLC. All rights reserved.
Support: cs@tcglore.com | Phone: (888) 496-1626
1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
  `.trim()
}


