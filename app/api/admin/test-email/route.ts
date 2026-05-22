import { NextResponse } from "next/server"
import { sendEmailWithRetry, EMAIL_CONFIG } from "@/lib/email/resend-client"
import { requireAdmin } from "@/lib/auth-guard"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin instanceof NextResponse) return admin

  try {
    const body = await request.json()
    const recipient = body.to || EMAIL_CONFIG.adminEmail

    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 })
    }

    console.log(`[test-email] Sending test email to ${recipient} from ${EMAIL_CONFIG.from}`)

    const result = await sendEmailWithRetry({
      to: recipient,
      subject: "TCG Lore - Resend Test Email",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Resend Email Configuration Test</h2>
          <p>If you are reading this, your Resend API integration is working correctly.</p>
          <ul>
            <li><strong>From:</strong> ${EMAIL_CONFIG.from}</li>
            <li><strong>To:</strong> ${recipient}</li>
            <li><strong>Environment:</strong> ${process.env.NODE_ENV}</li>
            <li><strong>Time:</strong> ${new Date().toISOString()}</li>
          </ul>
        </div>
      `,
      text: `Resend Email Test\n\nIf you are reading this, your Resend integration is working.\n\nFrom: ${EMAIL_CONFIG.from}\nTo: ${recipient}\nEnv: ${process.env.NODE_ENV}`
    })

    if (result.success) {
      return NextResponse.json({
        ok: true,
        message: "Test email sent successfully",
        id: result.messageId,
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo,
        to: recipient
      })
    } else {
      return NextResponse.json({
        ok: false,
        error: result.error,
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo,
        to: recipient
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error("[test-email] Unhandled error:", error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
