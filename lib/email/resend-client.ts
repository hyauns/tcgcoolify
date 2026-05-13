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
  replyTo: process.env.EMAIL_REPLY_TO || "cs@tcglore.com",
  adminEmail: process.env.ADMIN_EMAIL || "orders@email.tcglore.com",
  baseUrl: siteUrl,
  testMode: process.env.NODE_ENV === "development",
}

function extractDomain(emailOrArray: string | string[]): string {
  const email = Array.isArray(emailOrArray) ? emailOrArray[0] : emailOrArray;
  if (!email || typeof email !== 'string') return 'unknown';
  const parts = email.split('@');
  return parts.length > 1 ? parts[1] : 'unknown';
}

// Email sending wrapper with error handling and retry logic
export async function sendEmailWithRetry(
  emailData: {
    to: string | string[]
    subject: string
    html: string
    text?: string
    from?: string
    replyTo?: string
  },
  maxRetries = 3,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let lastError: any = null
  
  const fromAddress = emailData.from || EMAIL_CONFIG.from;
  const replyToAddress = emailData.replyTo || EMAIL_CONFIG.replyTo;
  const toDomain = extractDomain(emailData.to);
  // Simple heuristic for type based on subject
  const emailType = emailData.subject.toLowerCase().includes('order') ? 'order_confirmation' : 
                    emailData.subject.toLowerCase().includes('welcome') ? 'welcome' : 
                    emailData.subject.toLowerCase().includes('verify') ? 'verification' : 
                    emailData.subject.toLowerCase().includes('reset') ? 'password_reset' : 'other';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[email] send_start type=${emailType} from=${fromAddress} replyTo=${replyToAddress} toDomain=${toDomain} subject="${emailData.subject}" attempt=${attempt}`)

      const result = await getResend().emails.send({
        from: fromAddress,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        replyTo: replyToAddress,
      })

      if (result.data?.id) {
        console.log(`[email] send_success type=${emailType} resendId=${result.data.id}`)
        return { success: true, messageId: result.data.id }
      } else {
        const errorMsg = result.error?.message || "No message ID returned from Resend";
        const errorName = result.error?.name || "UnknownError";
        throw new Error(`${errorName}: ${errorMsg}`)
      }
    } catch (error: any) {
      lastError = error
      const status = error.statusCode || error.status || "Unknown";
      const message = error.message || String(error);
      console.error(`[email] send_failed type=${emailType} status=${status} message="${message}" attempt=${attempt}`)

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  const finalErrorMessage = lastError?.message || "Unknown error occurred";
  return { success: false, error: finalErrorMessage }
}
