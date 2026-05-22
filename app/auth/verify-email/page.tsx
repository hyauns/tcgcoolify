"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Header } from "../../components/header"
import { Footer } from "../../components/footer"

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get("token") ?? null

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token provided")
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`)

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setStatus("success")
            setMessage("Your email has been successfully verified!")
            // Redirect to login after 3 seconds
            setTimeout(() => {
              router.push("/auth/login?verified=true")
            }, 3000)
          } else {
            setStatus("error")
            setMessage(data.error || "Email verification failed")
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: "Email verification failed" }))
          setStatus("error")
          setMessage(errorData.error || "Email verification failed")
        }
      } catch (error) {
        console.error("Verification error:", error)
        setStatus("error")
        setMessage("An error occurred during verification")
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Email Verification</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {status === "loading" && (
                <>
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                  <p>Verifying your email address...</p>
                </>
              )}

              {status === "success" && (
                <>
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
                  <Alert>
                    <AlertDescription className="text-center">{message}</AlertDescription>
                  </Alert>
                  <p className="text-sm text-gray-600">You will be redirected to the login page in a few seconds.</p>
                  <Link href="/auth/login">
                    <Button className="w-full">Continue to Login</Button>
                  </Link>
                </>
              )}

              {status === "error" && (
                <>
                  <XCircle className="h-12 w-12 mx-auto text-red-600" />
                  <Alert variant="destructive">
                    <AlertDescription className="text-center">{message}</AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Link href="/auth/login">
                      <Button variant="outline" className="w-full bg-transparent">
                        Go to Login
                      </Button>
                    </Link>
                    <Link href="/auth/register">
                      <Button variant="ghost" className="w-full">
                        Create New Account
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}

