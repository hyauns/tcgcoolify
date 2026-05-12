import { Resend } from "resend"

// Lazy-initialize Resend client to avoid crashing during `next build`
// when RESEND_API_KEY is not available (build-time vs runtime secrets).
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export { getResend as resend }

import { siteUrl, siteFromEmail } from "@/lib/site-config"

// Configuration constants
export const EMAIL_CONFIG = {
  from: siteFromEmail,
  adminEmail: process.env.ADMIN_EMAIL || "cs@tcglore.com",
  baseUrl: siteUrl,
  testMode: process.env.NODE_ENV === "development",
}

// Email sending wrapper with error handling and retry logic
export async function sendEmailWithRetry(
  emailData: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    from?: string
  },
  maxRetries = 3,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Sending email (attempt ${attempt}/${maxRetries}) to:`, emailData.to)

      const result = await getResend().emails.send({
        from: emailData.from || EMAIL_CONFIG.from,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      })

      if (result.data?.id) {
        console.log(`✅ Email sent successfully! Message ID: ${result.data.id}`)
        return { success: true, messageId: result.data.id }
      } else {
        throw new Error("No message ID returned from Resend")
      }
    } catch (error) {
      lastError = error as Error
      console.error(`❌ Email send attempt ${attempt} failed:`, error)

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
        console.log(`⏳ Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  const errorMessage = lastError?.message || "Unknown error occurred"
  console.error(`❌ All email send attempts failed. Final error: ${errorMessage}`)

  return { success: false, error: errorMessage }
}
