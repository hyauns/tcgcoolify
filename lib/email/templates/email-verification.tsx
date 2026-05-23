/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
import { getLogoUrl } from "./shared"

interface EmailVerificationProps {
  firstName: string
  email: string
  verificationUrl: string
  expiresInHours?: number
}

export function EmailVerificationTemplate({
  firstName,
  email,
  verificationUrl,
  expiresInHours = 24,
}: EmailVerificationProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email - TCG Lore</title>
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
            <p style={{ color: "white", margin: "15px 0 0 0", opacity: 0.9, fontSize: "18px" }}>
              Verify Your Email Address
            </p>
          </div>

          {/* Main Content */}
          <div style={{ padding: "40px" }}>
            <h2 style={{ color: "#333", marginTop: 0 }}>Hello {firstName}!</h2>

            <p>
              Thank you for creating an account with TCG Lore! To complete your registration and start shopping for
              your favorite trading cards, please verify your email address.
            </p>

            <p>
              We need to confirm that <strong>{email}</strong> is your correct email address.
            </p>

            {/* Verification Button */}
            <div style={{ textAlign: "center", margin: "40px 0" }}>
              <a
                href={verificationUrl}
                style={{
                  background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                  color: "white",
                  padding: "18px 36px",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  display: "inline-block",
                  fontSize: "18px",
                  boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
                }}
              >
                Verify Email Address
              </a>
            </div>

            {/* Alternative Link */}
            <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", margin: "30px 0" }}>
              <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#666" }}>
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p
                style={{
                  margin: 0,
                  wordBreak: "break-all",
                  color: "#667eea",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  background: "#ffffff",
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #e9ecef",
                }}
              >
                {verificationUrl}
              </p>
            </div>

            {/* Security Notice */}
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffeaa7",
                padding: "20px",
                borderRadius: "8px",
                margin: "30px 0",
              }}
            >
              <h3 style={{ margin: "0 0 15px 0", color: "#856404", fontSize: "16px" }}>Security Notice</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#856404", fontSize: "14px" }}>
                <li>This verification link will expire in {expiresInHours} hours</li>
                <li>If you didn't create this account, please ignore this email</li>
                <li>Your account will remain inactive until you verify your email</li>
              </ul>
            </div>

            {/* What's Next */}
            <div style={{ background: "#e3f2fd", padding: "20px", borderRadius: "8px", margin: "30px 0" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#1976d2" }}>What's Next?</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#333", fontSize: "14px" }}>
                <li>Click the verification button above</li>
                <li>You'll be redirected to TCG Lore</li>
                <li>Start browsing our collection of trading cards</li>
                <li>Enjoy secure shopping and fast shipping</li>
              </ul>
            </div>

            <p style={{ color: "#666", fontSize: "14px" }}>
              If you have any questions, our support team is here to help. Just reply to this email.
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
export function getEmailVerificationText({
  firstName,
  email,
  verificationUrl,
  expiresInHours = 24,
}: EmailVerificationProps): string {
  return `
TCG Lore - Verify Your Email Address

Hello ${firstName}!

Thank you for creating an account with TCG Lore! To complete your registration and start shopping for your favorite trading cards, please verify your email address.

We need to confirm that ${email} is your correct email address.

VERIFY YOUR EMAIL:
${verificationUrl}

SECURITY NOTICE:
• This verification link will expire in ${expiresInHours} hours
• If you didn't create this account, please ignore this email
• Your account will remain inactive until you verify your email

WHAT'S NEXT:
• Click the verification link above
• You'll be redirected to TCG Lore
• Start browsing our collection of trading cards
• Enjoy secure shopping and fast shipping

If you have any questions, our support team is here to help. Email us at cs@tcglore.com.

Best regards,
The TCG Lore Team

© 2026 TCG Lore. Operated by A Toy Haulerz LLC. All rights reserved.
Support: cs@tcglore.com | Phone: (888) 496-1626
1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
  `.trim()
}


