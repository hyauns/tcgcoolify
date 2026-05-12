export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { verifyPassword } from "@/lib/password-utils"
import { findUserByEmail, updateLastLogin, logLoginAttempt, isUserLocked } from "@/lib/auth-database"
import { checkLoginRateLimit, getClientIP } from "@/lib/rate-limiter"
import { sign } from "jsonwebtoken"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  const t0 = performance.now()
  try {
    // Read JWT_SECRET lazily — never at module scope
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      console.error("[auth/login] FATAL: JWT_SECRET is not set.")
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    const body = await request.json()
    const { email, password, rememberMe = false } = body

    // Get client IP for rate limiting
    const clientIP = getClientIP(request)

    // Check rate limiting with Upstash Redis
    const rateLimitResult = await checkLoginRateLimit(clientIP)
    if (!rateLimitResult.backendAvailable) {
      return NextResponse.json({ error: "Login is temporarily unavailable. Please try again later." }, { status: 503 })
    }
    if (rateLimitResult.limited) {
      const remainingSeconds = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      const minutes = Math.ceil(remainingSeconds / 60)
      await logLoginAttempt(email, false, clientIP)
      return NextResponse.json(
        {
          error: `Too many login attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
          rateLimited: true,
          retryAfter: remainingSeconds,
        },
        { status: 429, headers: { "Retry-After": String(remainingSeconds) } },
      )
    }

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Find user by email
    const user = await findUserByEmail(email.toLowerCase())
    if (!user) {
      await logLoginAttempt(email, false, clientIP)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const isLocked = await isUserLocked(user.email)
    if (isLocked) {
      return NextResponse.json(
        { error: "Account is temporarily locked due to multiple failed login attempts. Please try again later." },
        { status: 403 }
      )
    }

    if (user.status !== "active") {
      await logLoginAttempt(email, false, clientIP)
      return NextResponse.json({ error: "Account is deactivated. Please contact support." }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      await logLoginAttempt(email, false, clientIP)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (!user.email_verified) {
      await logLoginAttempt(email, false, clientIP)
      return NextResponse.json(
        {
          error: "Please verify your email address before logging in.",
          needsVerification: true,
        },
        { status: 401 },
      )
    }

    // Successful login — update login record
    await updateLastLogin(user.user_id)
    await logLoginAttempt(email, true, clientIP)

    // Create JWT token
    const tokenExpiry = rememberMe ? "30d" : "24h"
    const token = sign(
      { userId: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: tokenExpiry },
    )

    // Set HTTP-only cookie
    const cookieStore = cookies()
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    })

    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
    })
  } catch (error) {
    console.error("Login error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    const t1 = performance.now()
    console.log("[Perf] Auth Login:", t1 - t0, "ms")
  }
}
