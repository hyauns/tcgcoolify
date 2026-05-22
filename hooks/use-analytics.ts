"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

// ---------------------------------------------------------------------------
// Session ID — stable per browser tab, generated once on first use
// ---------------------------------------------------------------------------

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let sid = sessionStorage.getItem("_tgc_sid")
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem("_tgc_sid", sid)
  }
  return sid
}

// ---------------------------------------------------------------------------
// Core fire-and-forget sender
// ---------------------------------------------------------------------------

function sendEvent(
  eventType: string,
  extra: {
    pageUrl?: string
    productId?: number | null
    metadata?: Record<string, unknown>
  } = {}
) {
  if (typeof window === "undefined") return
  
  // We don't grab session ID here anymore, it's passed dynamically if tracking is enabled.
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAnalytics(enabled: boolean = true) {
  const pathname = usePathname()
  const lastPathRef = useRef<string | null>(null)

  const _send = useCallback((
    eventType: string,
    extra: {
      pageUrl?: string
      productId?: number | null
      metadata?: Record<string, unknown>
    } = {}
  ) => {
    if (typeof window === "undefined" || !enabled) return
    const sessionId = getSessionId()
    const payload = JSON.stringify({
      eventType,
      pageUrl: extra.pageUrl ?? window.location.pathname,
      productId: extra.productId ?? null,
      sessionId,
      metadata: extra.metadata ?? null,
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }))
    } else {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        credentials: "include",
        keepalive: true,
      }).catch(() => {})
    }
  }, [enabled])

  // Automatic page-view tracking on route change
  useEffect(() => {
    if (pathname === lastPathRef.current || !enabled) return
    lastPathRef.current = pathname
    _send("page_view", { pageUrl: pathname ?? undefined })
  }, [pathname, enabled, _send])

  /** Track an add-to-cart event */
  const trackAddToCart = useCallback(
    (productId: number, productName?: string, price?: number) => {
      _send("add_to_cart", {
        productId,
        metadata: { productName, price },
      })
    },
    [_send]
  )

  /** Track a product detail page view */
  const trackProductView = useCallback((productId: number, productName?: string) => {
    _send("product_view", {
      productId,
      metadata: { productName },
    })
  }, [_send])

  /** Track checkout initiation */
  const trackCheckoutStart = useCallback(() => {
    _send("checkout_start")
  }, [_send])

  /** Track a completed purchase */
  const trackPurchase = useCallback(
    (orderId: string, total: number) => {
      _send("purchase", {
        metadata: { orderId, total },
      })
    },
    [_send]
  )

  /** Generic custom event */
  const trackEvent = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      _send(eventType, { metadata })
    },
    [_send]
  )

  return { trackAddToCart, trackProductView, trackCheckoutStart, trackPurchase, trackEvent }
}
