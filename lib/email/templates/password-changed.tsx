/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
import { getLogoUrl, getSiteUrl } from "./shared"

interface PasswordChangedProps {
  firstName: string
  email: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

export function PasswordChangedTemplate({ firstName, email, timestamp, ipAddress, userAgent }: PasswordChangedProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Changed - TCG Lore</title>
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
              background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
              padding: "40px",
              textAlign: "center",
            }}
          >
            <img src={getLogoUrl()} alt="TCG Lore Logo" width="180" style={{ height: "auto", display: "block", margin: "0 auto" }} />
            <p style={{ color: "white", margin: "15px 0 0 0", opacity: 0.9, fontSize: "18px" }}>
              Password Changed Successfully
            </p>
          </div>

          {/* Main Content */}
          <div style={{ padding: "40px" }}>
            <h2 style={{ color: "#333", marginTop: 0 }}>Hello {firstName}!</h2>

            <p>
              This is a confirmation that the password for your TCG Lore account <strong>{email}</strong> has been
              successfully changed.
            </p>

            {/* Success Message */}
            <div
              style={{
                background: "#d4edda",
                border: "1px solid #c3e6cb",
                padding: "20px",
                borderRadius: "8px",
                margin: "30px 0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "48px", margin: "0 0 15px 0" }}>✅</div>
              <h3 style={{ margin: "0 0 10px 0", color: "#155724", fontSize: "18px" }}>Password Updated</h3>
              <p style={{ margin: 0, color: "#155724", fontSize: "14px" }}>
                Your account is now secured with your new password
              </p>
            </div>

            {/* Change Details */}
            <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "8px", margin: "30px 0" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "16px" }}>Change Details</h3>
              <div style={{ fontSize: "14px", color: "#666" }}>
                <p style={{ margin: "5px 0" }}>
                  <strong>Account:</strong> {email}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>Changed:</strong> {timestamp.toLocaleString()}
                </p>
                {ipAddress && (
                  <p style={{ margin: "5px 0" }}>
                    <strong>IP Address:</strong> {ipAddress}
                  </p>
                )}
                {userAgent && (
                  <p style={{ margin: "5px 0" }}>
                    <strong>Device:</strong> {userAgent.includes("Mobile") ? "Mobile Device" : "Desktop/Laptop"}
                  </p>
                )}
              </div>
            </div>

            {/* Security Alert */}
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffeaa7",
                padding: "20px",
                borderRadius: "8px",
                margin: "30px 0",
              }}
            >
              <h3 style={{ margin: "0 0 15px 0", color: "#856404", fontSize: "16px" }}>Didn't Make This Change?</h3>
              <p style={{ margin: "0 0 15px 0", color: "#856404", fontSize: "14px" }}>
                If you didn't change your password, your account may have been compromised. Please take immediate
                action:
              </p>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#856404", fontSize: "14px" }}>
                <li>Contact our support team immediately</li>
                <li>Review your recent account activity</li>
                <li>Consider enabling two-factor authentication</li>
              </ul>
            </div>

            {/* Security Tips */}
            <div style={{ background: "#e3f2fd", padding: "20px", borderRadius: "8px", margin: "30px 0" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#1976d2" }}>Security Tips</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#333", fontSize: "14px" }}>
                <li>Use a unique password for your TCG Lore account</li>
                <li>Consider using a password manager</li>
                <li>Enable two-factor authentication for extra security</li>
                <li>Never share your password with anyone</li>
                <li>Log out of shared or public computers</li>
              </ul>
            </div>

            {/* Contact Support */}
            <div style={{ textAlign: "center", margin: "40px 0" }}>
              <a
                href={`${getSiteUrl()}/contact`}
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
                Contact Support
              </a>
            </div>

            <p style={{ color: "#666", fontSize: "14px" }}>
              If you have any questions about your account security, please don't hesitate to contact our support team.
            </p>

            <p style={{ color: "#666", fontSize: "14px" }}>
              Best regards,
              <br />
              The TCG Lore Security Team
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
              <a href="mailto:cs@tcglore.com" style={{ color: "#28a745", textDecoration: "none" }}>cs@tcglore.com</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>
              <a href="tel:+18884961626" style={{ color: "#28a745", textDecoration: "none" }}>(888) 496-1626</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136</p>
            <p style={{ margin: "8px 0 0 0" }}>© 2026 TCG Lore. Operated by TOY HAULERZ LLC. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  )
}

// Plain text version
export function getPasswordChangedText({
  firstName,
  email,
  timestamp,
  ipAddress,
  userAgent,
}: PasswordChangedProps): string {
  return `
TCG Lore - Password Changed Successfully

Hello ${firstName}!

This is a confirmation that the password for your TCG Lore account ${email} has been successfully changed.

✅ PASSWORD UPDATED
Your account is now secured with your new password

CHANGE DETAILS:
Account: ${email}
Changed: ${timestamp.toLocaleString()}${ipAddress ? `\nIP Address: ${ipAddress}` : ""}${userAgent ? `\nDevice: ${userAgent.includes("Mobile") ? "Mobile Device" : "Desktop/Laptop"}` : ""}

DIDN'T MAKE THIS CHANGE?
If you didn't change your password, your account may have been compromised. Please take immediate action:
• Contact our support team immediately
• Review your recent account activity
• Consider enabling two-factor authentication

SECURITY TIPS:
• Use a unique password for your TCG Lore account
• Consider using a password manager
• Enable two-factor authentication for extra security
• Never share your password with anyone
• Log out of shared or public computers

Contact Support: ${getSiteUrl()}/contact

If you have any questions about your account security, please don't hesitate to contact our support team.

Best regards,
The TCG Lore Security Team

© 2026 TCG Lore. Operated by TOY HAULERZ LLC. All rights reserved.
Support: cs@tcglore.com | Phone: (888) 496-1626
1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
  `.trim()
}


