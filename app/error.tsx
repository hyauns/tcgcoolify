"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        extra: {
          digest: error.digest,
        },
      })
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong!
        </h2>

        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Our team has been notified and is working to fix it.
        </p>

        {error.digest && (
          <p className="text-xs text-gray-400 mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            className="flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <Button variant="outline" className="flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" />
            <a href="mailto:cs@tcglore.com">Contact Support</a>
          </Button>
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500">
            If this problem persists, please email us at{" "}
            <a href="mailto:cs@tcglore.com" className="text-blue-600 hover:underline">
              cs@tcglore.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

