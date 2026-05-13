export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { findUserByEmail } from "@/lib/auth-database"
import { generateVerificationToken } from "@/lib/token-utils"
import { sendVerificationEmail } from "@/lib/email/send-email"
import { getSql } from "@/lib/db-client"


export async function POST(request: NextRequest) {
  const sql = getSql();

  try {
    const body = await request.json()
    const { email } = body

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Find user by email
    const user = await findUserByEmail(email.toLowerCase())

    const genericResponse = NextResponse.json({
      success: true,
      message: "If an account exists, a verification link has been sent.",
    })

    if (!user) {
      return genericResponse
    }

    if (user.email_verified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 })
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account is not active" }, { status: 400 })
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Update user with new verification token
    await sql`
      UPDATE users 
      SET email_verification_token = ${verificationToken},
          email_verification_expires = ${verificationExpires},
          updated_at = NOW()
      WHERE user_id = ${user.user_id}
    `

    // Send verification email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tcglore.com"
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`

    try {
      const emailResult = await sendVerificationEmail(
        {
          id: user.user_id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
        },
        verificationUrl,
        24, // expires in 24 hours
      )

      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error)
        return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
      }
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
    }

    return genericResponse
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

