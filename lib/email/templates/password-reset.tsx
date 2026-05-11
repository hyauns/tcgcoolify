/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
import { getLogoUrl } from "./shared"

interface PasswordResetProps {
  firstName: string
  email: string
  resetUrl: string
  expiresInHours?: number
  ipAddress?: string
  userAgent?: string
}

export function PasswordResetTemplate({
  firstName,
  email,
  resetUrl,
  expiresInHours = 1,
  ipAddress,
  userAgent,
}: PasswordResetProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password - TCG Lore</title>
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
              background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
              padding: "40px",
              textAlign: "center",
            }}
          >
            <img src={getLogoUrl()} alt="TCG Lore Operated by TCG Lore Logo" width="180" style={{ height: "auto", display: "block", margin: "0 auto" }} />
            <p style={{ color: "white", margin: "15px 0 0 0", opacity: 0.9, fontSize: "18px" }}>
              Password Reset Request
            </p>
          </div>

          {/* Main Content */}
          <div style={{ padding: "40px" }}>
            <h2 style={{ color: "#333", marginTop: 0 }}>Hello {firstName}!</h2>

            <p>
              We received a request to reset the password for your TCG Store account associated with{" "}
              <strong>{email}</strong>.
            </p>

            <p>
              If you made this request, click the button below to reset your password. If you didn't request this, you
              can safely ignore this email.
            </p>

            {/* Reset Button */}
            <div style={{ textAlign: "center", margin: "40px 0" }}>
              <a
                href={resetUrl}
                style={{
                  background: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                  color: "white",
                  padding: "18px 36px",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  display: "inline-block",
                  fontSize: "18px",
                  boxShadow: "0 4px 12px rgba(220, 53, 69, 0.3)",
                }}
              >
                Reset Password
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
                  color: "#dc3545",
                  fontSize: "14px",
                  fontFamily: "monospace",
                  background: "#ffffff",
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #e9ecef",
                }}
              >
                {resetUrl}
              </p>
            </div>

            {/* Security Notice */}
            <div
              style={{
                background: "#f8d7da",
                border: "1px solid #f5c6cb",
                padding: "20px",
                borderRadius: "8px",
                margin: "30px 0",
              }}
            >
              <h3 style={{ margin: "0 0 15px 0", color: "#721c24", fontSize: "16px" }}>Security Notice</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#721c24", fontSize: "14px" }}>
                <li>
                  This reset link will expire in {expiresInHours} hour{expiresInHours !== 1 ? "s" : ""}
                </li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
                <li>For security, this link can only be used once</li>
              </ul>
            </div>

            {/* Request Details */}
            {(ipAddress || userAgent) && (
              <div style={{ background: "#e2e3e5", padding: "20px", borderRadius: "8px", margin: "30px 0" }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#383d41", fontSize: "16px" }}>Request Details</h3>
                <div style={{ fontSize: "14px", color: "#383d41" }}>
                  <p style={{ margin: "5px 0" }}>
                    <strong>Time:</strong> {new Date().toLocaleString()}
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
            )}

            {/* What to Do Next */}
            <div style={{ background: "#d1ecf1", padding: "20px", borderRadius: "8px", margin: "30px 0" }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#0c5460" }}>What to Do Next</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#0c5460", fontSize: "14px" }}>
                <li>Click the reset button above</li>
                <li>Create a strong, unique password</li>
                <li>Consider using a password manager</li>
                <li>Contact us if you didn't request this reset</li>
              </ul>
            </div>

            <p style={{ color: "#666", fontSize: "14px" }}>
              If you have any questions or concerns about your account security, please contact our support team
              immediately.
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
              <a href="mailto:cs@tcglore.com" style={{ color: "#dc3545", textDecoration: "none" }}>cs@tcglore.com</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>
              <a href="tel:+13036683245" style={{ color: "#dc3545", textDecoration: "none" }}>+1 (303) 668-3245</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136</p>
            <p style={{ margin: "8px 0 0 0" }}>© 2026 TCG Lore Operated by TCG Lore. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  )
}

// Plain text version
export function getPasswordResetText({
  firstName,
  email,
  resetUrl,
  expiresInHours = 1,
  ipAddress,
  userAgent,
}: PasswordResetProps): string {
  return `
TCG Lore Operated by TCG Lore. - Password Reset Request

Hello ${firstName}!

We received a request to reset the password for your TCG Lore Operated by TCG Lore. account associated with ${email}.

If you made this request, click the link below to reset your password. If you didn't request this, you can safely ignore this email.

RESET YOUR PASSWORD:
${resetUrl}

SECURITY NOTICE:
• This reset link will expire in ${expiresInHours} hour${expiresInHours !== 1 ? "s" : ""}
• If you didn't request this reset, please ignore this email
• Your password will remain unchanged until you create a new one
• For security, this link can only be used once

REQUEST DETAILS:
Time: ${new Date().toLocaleString()}${ipAddress ? `\nIP Address: ${ipAddress}` : ""}${userAgent ? `\nDevice: ${userAgent.includes("Mobile") ? "Mobile Device" : "Desktop/Laptop"}` : ""}

WHAT TO DO NEXT:
• Click the reset link above
• Create a strong, unique password
• Consider using a password manager
• Contact us if you didn't request this reset

If you have any questions or concerns, please contact our support team at cs@tcglore.com immediately.

Best regards,
The TCG Lore Operated by TCG Lore. Security Team

© 2026 TCG Lore Operated by TCG Lore. All rights reserved.
Support: cs@tcglore.com | Phone: +1 (303) 668-3245
1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
  `.trim()
}


