export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { sendEmailWithRetry, EMAIL_CONFIG } from "@/lib/email/resend-client"
import { checkContactRateLimit, getClientIP } from "@/lib/rate-limiter"

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/**
 * Validate that the request Origin matches our own site.
 * In production, rejects cross-origin POST requests.
 * In development, allows requests without an Origin header (e.g. curl, Postman).
 */
function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  // In development, allow requests without origin (curl, Postman, etc.)
  if (process.env.NODE_ENV !== "production") {
    return true
  }

  // Production: require Origin or Referer header
  if (!origin && !referer) {
    return false
  }

  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || ""
  if (!siteUrl) {
    // If no site URL is configured, fall back to checking that origin is present
    // (browsers always send Origin on cross-origin POST, so a missing origin is suspicious)
    return !!origin
  }

  try {
    const siteHost = new URL(siteUrl).host
    if (origin) {
      return new URL(origin).host === siteHost
    }
    if (referer) {
      return new URL(referer).host === siteHost
    }
  } catch {
    return false
  }

  return false
}

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return process.env.NODE_ENV !== "production"
  }

  const formData = new URLSearchParams()
  formData.set("secret", secret)
  formData.set("response", token)
  formData.set("remoteip", ip)

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
    cache: "no-store",
  })

  if (!response.ok) return false

  const result = (await response.json()) as { success?: boolean }
  return result.success === true
}

export async function POST(request: NextRequest) {
  try {
    // Origin validation — reject cross-origin form submissions
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
    }

    const clientIP = getClientIP(request)
    
    // Start parsing body and checking rate limit concurrently
    const bodyPromise = request.json()
    const rateLimitResult = await checkContactRateLimit(clientIP)

    if (!rateLimitResult.backendAvailable) {
      return NextResponse.json({ error: "Contact form is temporarily unavailable." }, { status: 503 })
    }

    if (rateLimitResult.limited) {
      const retryAfter = Math.max(Math.ceil((rateLimitResult.reset - Date.now()) / 1000), 1)
      return NextResponse.json(
        { error: "Too many contact attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      )
    }

    const body = await bodyPromise
    const { name, email, subject, message, captchaToken } = body

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "All fields (name, email, subject, message) are required." },
        { status: 400 },
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 })
    }

    // CAPTCHA is enforced only when Turnstile is configured. When TURNSTILE_SECRET_KEY
    // is absent the form falls back to rate-limiting alone (5/hour per IP, checked above).
    // Setting TURNSTILE_SECRET_KEY (+ NEXT_PUBLIC_TURNSTILE_SITE_KEY) re-enables CAPTCHA
    // automatically with no further code change.
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!captchaToken || !(await verifyTurnstileToken(String(captchaToken), clientIP))) {
        return NextResponse.json({ error: "Security verification failed. Please try again." }, { status: 400 })
      }
    }

    const safeName = escapeHtml(String(name).trim())
    const safeEmail = escapeHtml(String(email).trim())
    const safeSubject = escapeHtml(String(subject).trim())
    const safeMessage = escapeHtml(String(message).trim())

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "full",
      timeStyle: "short",
    })

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">New Contact Form Submission</h1>
        </div>
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 100px;">Name</td>
              <td style="padding: 8px 0; color: #111827;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151;">Email</td>
              <td style="padding: 8px 0; color: #111827;">
                <a href="mailto:${safeEmail}" style="color: #2563eb;">${safeEmail}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151;">Subject</td>
              <td style="padding: 8px 0; color: #111827;">${safeSubject}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="font-weight: 600; color: #374151; margin-bottom: 8px;">Message</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; white-space: pre-wrap; color: #111827; line-height: 1.6;">
${safeMessage}
          </div>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">
            Received on ${timestamp} (EST) via TCG Lore Contact Form
          </p>
        </div>
      </div>
    `

    const text = [
      "New Contact Form Submission",
      "---------------------------",
      `Name:    ${String(name).trim()}`,
      `Email:   ${String(email).trim()}`,
      `Subject: ${String(subject).trim()}`,
      "",
      "Message:",
      String(message).trim(),
      "",
      `Received on ${timestamp} (EST) via TCG Lore Contact Form`,
    ].join("\n")

    const result = await sendEmailWithRetry({
      to: EMAIL_CONFIG.adminEmail,
      subject: `[Contact Form] ${String(subject).trim()}`,
      html,
      text,
      from: EMAIL_CONFIG.from,
    })

    if (!result.success) {
      console.error("[contact] Email send failed")
      return NextResponse.json({ error: "Failed to send your message. Please try again." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch {
    console.error("[contact] Unexpected error")
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 })
  }
}

