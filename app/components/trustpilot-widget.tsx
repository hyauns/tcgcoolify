"use client"

import { useCallback, useEffect, useRef } from 'react'
import Script from 'next/script'
import { useCookieConsent } from "@/lib/cookie-consent-context"

declare global {
  interface Window {
    Trustpilot?: {
      loadFromElement: (element: HTMLElement | null, forceReload?: boolean) => void;
    };
  }
}

export function TrustpilotWidget() {
  const ref = useRef<HTMLDivElement>(null)
  const { preferences } = useCookieConsent()
  const hasConsent = preferences?.functional === true

  const loadTrustpilot = useCallback(() => {
    if (window.Trustpilot && ref.current) {
      window.Trustpilot.loadFromElement(ref.current, true)
    }
  }, [])

  useEffect(() => {
    if (hasConsent) {
      loadTrustpilot()
    }
  }, [hasConsent, loadTrustpilot])

  if (!hasConsent) {
    return null
  }

  return (
    <>
      <Script 
        src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" 
        strategy="afterInteractive" 
        onLoad={loadTrustpilot}
      />
      <div
        ref={ref}
        className="trustpilot-widget"
        data-locale="en-US"
        data-template-id="5419b6ffb0d04a076446a9af"
        data-businessunit-id="69f75a315488d8599954ebf2"
        data-style-height="20px"
        data-style-width="100%"
        data-token="bfb0f3b4-c2b7-4399-a9b3-cac330622e5c"
      >
        <a href="https://www.trustpilot.com/review/tcglore.com" target="_blank" rel="noopener noreferrer">
          Trustpilot
        </a>
      </div>
    </>
  )
}

