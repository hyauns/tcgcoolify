import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const PROTECTED_ROUTES = ["/account"]
const ADMIN_ROUTES = ["/admin"]
const AUTH_ROUTES = ["/auth/login", "/auth/register"]

const isProd = process.env.NODE_ENV === "production"

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${!isProd ? "'unsafe-eval'" : ""} https://maps.googleapis.com https://challenges.cloudflare.com https://va.vercel-scripts.com https://widget.trustpilot.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://maps.googleapis.com https://challenges.cloudflare.com https://*.trustpilot.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com https://*.trustpilot.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self)",
  "X-XSS-Protection": "1; mode=block",
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("auth-token")?.value

  const getPayload = async () => {
    if (!token) return null

    try {
      const jwtSecret = process.env.JWT_SECRET
      if (!jwtSecret) {
        console.error("[middleware] JWT_SECRET environment variable is not set")
        return null
      }

      const secret = new TextEncoder().encode(jwtSecret)
      const { payload } = await jwtVerify(token, secret)
      return payload as { userId: string; email: string; role: string }
    } catch {
      return null
    }
  }

  // Handle legacy slugs with multiple hyphens (e.g. ---)
  if (pathname.startsWith("/products/")) {
    const slug = pathname.substring(10)
    if (slug && slug.includes("--")) {
      const cleanSlug = slug.replace(/-+/g, "-")
      return withSecurityHeaders(NextResponse.redirect(new URL(`/products/${cleanSlug}`, request.url), 301))
    }
  }

  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    const payload = await getPayload()

    if (!payload) {
      const loginUrl = new URL("/auth/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return withSecurityHeaders(NextResponse.redirect(loginUrl))
    }

    if (payload.role !== "admin") {
      return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)))
    }

    return withSecurityHeaders(NextResponse.next())
  }

  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const payload = await getPayload()

    if (!payload) {
      const loginUrl = new URL("/auth/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return withSecurityHeaders(NextResponse.redirect(loginUrl))
    }

    return withSecurityHeaders(NextResponse.next())
  }

  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const payload = await getPayload()

    if (payload) {
      const destination = payload.role === "admin" ? "/admin/analytics" : "/account"
      return withSecurityHeaders(NextResponse.redirect(new URL(destination, request.url)))
    }

    return withSecurityHeaders(NextResponse.next())
  }

  return withSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/auth/login",
    "/auth/register",
    "/((?!_next/static)(?!_next/image)(?!favicon)(?!robots\\.txt)(?!sitemap\\.xml)(?!sitemap/).*)",
  ],
}
