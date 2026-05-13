"use client"

import React, { useState } from "react"
import Image, { ImageProps } from "next/image"

// ── Trusted domains that Next.js image optimizer can safely proxy ──
// These are CDNs we control or that are fast/reliable enough for server-side fetch.
const OPTIMIZABLE_HOSTS = new Set([
  "cdn.beautypremier.store",
  "pub-383b4a6cc335493b948a15793ecbf997.r2.dev",
])

/**
 * Determine whether a src URL should go through the Next.js image optimizer.
 *
 * - Local/public images (start with "/"):  optimized ✓
 * - Our own R2 CDN (cdn.beautypremier.store):  optimized ✓
 * - Third-party remote images (tcgplayer, bigcommerce, etc.):  unoptimized
 *   → avoids ETIMEDOUT errors when the Next.js server tries to fetch them
 */
function shouldOptimize(src: string | undefined): boolean {
  if (!src || typeof src !== "string") return false

  // Local/public assets
  if (src.startsWith("/")) return true

  // Data URIs / blobs — skip optimizer
  if (src.startsWith("data:") || src.startsWith("blob:")) return false

  try {
    const hostname = new URL(src).hostname
    return OPTIMIZABLE_HOSTS.has(hostname)
  } catch {
    // Invalid URL — don't optimize
    return false
  }
}

interface ImageWithFallbackProps extends ImageProps {
  fallbackSrc?: string
}

export function ImageWithFallback({
  src,
  fallbackSrc = "/placeholder.png",
  alt,
  ...rest
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false)

  // Reset error state when the primary source changes
  React.useEffect(() => {
    setError(false)
  }, [src])

  const currentSrc = error ? fallbackSrc : src
  const unoptimized = error || !shouldOptimize(currentSrc as string) || rest.unoptimized

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt || "Image"}
      unoptimized={unoptimized}
      onError={(e) => {
        // Bypass next/image caching bugs by natively targeting the DOM element
        e.currentTarget.src = fallbackSrc
        e.currentTarget.srcset = ""
        setError(true)
      }}
    />
  )
}
