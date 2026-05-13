"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        level: "fatal",
        extra: {
          digest: error.digest,
          isGlobalError: true,
        },
      })
    }).catch(() => {
      // Sentry not available — skip reporting
    })
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Application Error
            </h1>

            <p className="text-gray-600 mb-6">
              A critical error occurred and we couldn&apos;t load the page. Please try refreshing.
            </p>

            {error.digest && (
              <p className="text-xs text-gray-400 mb-6">
                Error ID: {error.digest}
              </p>
            )}

            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>

            <p className="mt-8 text-sm text-gray-500">
              If the problem persists, contact{" "}
              <a
                href="mailto:support@tcglore.com"
                className="text-blue-600 hover:underline"
              >
                support@tcglore.com
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}

