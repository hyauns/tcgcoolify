/* eslint-disable react/no-unescaped-entities */
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  CheckCircle,
  CreditCard,
  Lock,
  Eye,
  AlertTriangle,
  Info,
  Phone,
  Mail,
  ArrowRight,
  Zap,
  Globe,
  Database,
  Package,
} from "lucide-react"
import Link from "next/link"
import { Header } from "../../components/header"
import { Footer } from "../../components/footer"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

type OrderSuccessPayload = {
  success: boolean
  order: {
    id: string
    orderNumber: string
    status: string
    actualStatus: string
    paymentStatus: string
    subtotal: number
    tax: number
    shipping: number
    total: number
    customerEmail: string | null
    orderDate: string
    createdAt: string
    trackingNumber: string | null
    estimatedDelivery: string
    items: Array<{
      id: string
      productId: string
      productName: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
  }
  emailNotifications: {
    adminNotificationSent: boolean
    customerConfirmationSent: boolean
  }
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams?.get("orderNumber") ?? null
  // Stripe redirect flow returns ?transaction_id=&status= instead of ?orderNumber=
  const transactionId = searchParams?.get("transaction_id") ?? null
  const lookupQuery = orderNumber
    ? `orderNumber=${encodeURIComponent(orderNumber)}`
    : transactionId
    ? `transactionId=${encodeURIComponent(transactionId)}`
    : null
  const [orderData, setOrderData] = useState<OrderSuccessPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const conversionFiredRef = useRef(false)

  // Fire the Google Ads purchase conversion once, after the order is confirmed.
  // Reads orderData only — does not touch the polling/payment flow above.
  // The conversion ID/label are exposed on window by the global gtag tag in app/layout.tsx.
  // gtag loads "afterInteractive", so it may not be ready the instant the order
  // confirms — retry every 500ms (up to ~10s) until it is, so the event is never lost.
  useEffect(() => {
    if (conversionFiredRef.current) return
    if (!orderData?.success || !orderData.order) return
    if (typeof window === "undefined") return

    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const tryFire = () => {
      if (conversionFiredRef.current) return

      const w = window as any
      const conversionId: string | undefined = w.__googleAdsConversionId
      const conversionLabel: string | undefined = w.__googleAdsConversionLabel

      if (typeof w.gtag === "function" && conversionId && conversionLabel) {
        conversionFiredRef.current = true
        w.gtag("event", "conversion", {
          send_to: `${conversionId}/${conversionLabel}`,
          value: orderData.order.total,
          currency: "USD",
          transaction_id: orderData.order.orderNumber,
        })
        return
      }

      // gtag tag not ready yet (or tracking not configured) — retry briefly.
      attempts++
      if (attempts <= 20) {
        timer = setTimeout(tryFire, 500)
      }
    }

    tryFire()

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [orderData])

  useEffect(() => {
    let isMounted = true
    let pollTimer: NodeJS.Timeout | null = null
    let pollAttempts = 0
    const MAX_ATTEMPTS = 30 // 90 seconds

    async function loadOrder(isManualRefresh = false) {
      if (isManualRefresh) pollAttempts = 0

      if (!lookupQuery) {
        if (isMounted) {
          setError("Missing order reference.")
          setLoading(false)
        }
        return
      }

      try {
        const cacheBuster = Date.now()
        const response = await fetch(`/api/orders/complete?${lookupQuery}&_t=${cacheBuster}`, {
          credentials: "include",
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null
          console.warn(`[polling] API returned ${response.status}:`, payload?.error)
          throw new Error(payload?.error || "Unable to verify this order.")
        }

        const payload = (await response.json()) as OrderSuccessPayload
        const status = payload.order?.actualStatus?.toUpperCase()
        const paymentStatus = payload.order?.paymentStatus?.toUpperCase()
        
        console.log(`[polling] Attempt ${pollAttempts + 1}/${MAX_ATTEMPTS} — actualStatus=${status}, paymentStatus=${paymentStatus}`)

        if (status === "PENDING" || paymentStatus === "PENDING") {
          pollAttempts++
          if (pollAttempts >= MAX_ATTEMPTS) {
            if (isMounted) {
              setLoading(false)
              setIsPending(false)
              setError("We are still waiting for the payment gateway to confirm your charge. It is taking longer than expected. Please check back later or contact support if the issue persists.")
            }
            return
          }

          // Webhook hasn't arrived yet. Keep polling.
          if (isMounted) {
            setIsPending(true)
            setLoading(false)
            if (pollTimer) clearTimeout(pollTimer)
            pollTimer = setTimeout(() => loadOrder(false), 3000)
          }
          return
        }

        // Webhook arrived and order is completed/failed
        console.log(`[polling] ✅ Order confirmed! Transitioning to success UI.`)
        if (isMounted) {
          setIsPending(false)
          setOrderData(payload)
          setLoading(false)
          setError(null)
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to verify this order.")
          setLoading(false)
          setIsPending(false)
        }
      }
    }

    // Expose loadOrder to the component so manual refresh button can use it
    if (typeof window !== "undefined") {
      ;(window as any).__retryLoadOrder = () => loadOrder(true)
    }

    loadOrder()

    return () => {
      isMounted = false
      if (pollTimer) clearTimeout(pollTimer)
      if (typeof window !== "undefined") {
        delete (window as any).__retryLoadOrder
      }
    }
  }, [lookupQuery])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verifying your order...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-24 flex items-center justify-center">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Processing</h2>
              <p className="text-gray-500">
                Waiting for secure gateway confirmation. Please do not close this page...
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  We Couldn't Verify This Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {error || "This order confirmation link is invalid or you do not have access to this order."}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    variant="default" 
                    className="w-full sm:w-auto" 
                    onClick={() => {
                      setLoading(true)
                      setError(null)
                      if (typeof window !== "undefined" && (window as any).__retryLoadOrder) {
                        ;(window as any).__retryLoadOrder()
                      } else {
                        window.location.reload()
                      }
                    }}
                  >
                    Refresh Status
                  </Button>
                  <Link href="/contact">
                    <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const verifiedOrder = orderData.order
  const estimatedDelivery = verifiedOrder.estimatedDelivery
  const paymentStatusLabel =
    verifiedOrder.actualStatus?.toLowerCase() === "pending" ? "Processing" : "Processed"

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Thank You for Your Order!</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Your order has been successfully placed and is now being processed. You will receive confirmation emails
              shortly.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Shield className="h-6 w-6 text-green-600" />
              <h2 className="text-lg font-semibold text-green-800">Your Order is Confirmed</h2>
            </div>
            <p className="text-green-700">
              Your order has been successfully placed and payment processed. you&apos;ll receive order confirmation and
              shipping updates via email.
            </p>
          </div>
        </div>

        {/* Order Details Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Order Number:</span>
                    <span className="font-mono text-blue-600">#{verifiedOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Estimated Delivery:</span>
                    <span>{estimatedDelivery}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Shipping Method:</span>
                    <span>Standard Shipping</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Order Status:</span>
                    <span className="text-green-600 font-medium">Confirmed</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Payment Status:</span>
                    <span className="text-green-600 font-medium">{paymentStatusLabel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Confirmation Email:</span>
                    <span className="text-green-600">
                      {orderData.emailNotifications.customerConfirmationSent ? "Sent" : "Processing"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Process Timeline */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">Understanding Your Payment Process</h2>

          <div className="space-y-8">
            {/* Step 1: Order Placement */}
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-blue-800 mb-2">1. Order Placed Successfully</h3>
                    <p className="text-gray-700 mb-3">
                      Congratulations! Your order has been successfully submitted to our system. At this stage,
                      <strong className="text-blue-800"> your card has not been charged</strong> for the full purchase
                      amount.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <Info className="h-4 w-4 inline mr-2" />
                        We believe in transparency - you&apos;ll only be charged when your order is ready to ship.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Verification Hold */}
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-orange-800 mb-2">2. Payment Method Verification</h3>
                    <p className="text-gray-700 mb-3">
                      We may place a small temporary authorization hold on your payment method to verify its validity.
                      This is a standard security practice that helps us confirm your card is active and has sufficient
                      funds.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-orange-800 mb-2">What You Might See:</h4>
                        <ul className="text-sm text-orange-700 space-y-1">
                          <li>• A pending charge on your statement</li>
                          <li>• Authorization for $1-5 (typical amount)</li>
                          <li>• Temporary hold that will be released</li>
                        </ul>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-orange-800 mb-2">Important Notes:</h4>
                        <ul className="text-sm text-orange-700 space-y-1">
                          <li>• This is NOT your final charge</li>
                          <li>• Hold typically releases in 1-3 days</li>
                          <li>• No actual money is taken</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Security Verification */}
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-purple-800 mb-2">3. Comprehensive Security Checks</h3>
                    <p className="text-gray-700 mb-4">
                      Our advanced fraud prevention system conducts multiple security verifications to protect both you
                      and our business from fraudulent activities. These checks happen automatically and typically
                      complete within minutes.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Lock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-semibold text-purple-800 mb-1">Billing Verification</h4>
                        <p className="text-xs text-purple-700">
                          We verify your billing address matches your card's registered address
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Eye className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-semibold text-purple-800 mb-1">Pattern Analysis</h4>
                        <p className="text-xs text-purple-700">
                          Our AI analyzes purchase patterns to detect unusual activity
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Globe className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-semibold text-purple-800 mb-1">Location Checks</h4>
                        <p className="text-xs text-purple-700">
                          We verify shipping and billing locations for consistency
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Final Processing */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-green-800 mb-2">4. Order Processing & Payment</h3>
                    <p className="text-gray-700 mb-3">
                      Once all security checks are complete and your order is ready to ship, we&apos;ll process the final
                      payment. This is when the actual charge for your purchase will appear on your statement.
                    </p>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2">When Payment is Processed:</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Your order is packed and ready to ship</li>
                        <li>• All security verifications are complete</li>
                        <li>• you&apos;ll receive an email confirmation with tracking</li>
                        <li>• The charge will reflect your actual purchase amount</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Security Measures Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-blue-900 flex items-center justify-center gap-2">
                <Shield className="h-8 w-8" />
                Secure Transaction Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-gray-700 text-lg">
                Your payment was processed securely using industry-leading encryption and fraud protection.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <Lock className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Secure Payment</h4>
                  <p className="text-sm text-gray-600">Bank-level encryption protected your transaction</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <Database className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">PCI Compliant</h4>
                  <p className="text-sm text-gray-600">Highest payment security standards maintained</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <Eye className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Fraud Protection</h4>
                  <p className="text-sm text-gray-600">Advanced monitoring detected no suspicious activity</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Verified</h4>
                  <p className="text-sm text-gray-600">Transaction successfully verified and processed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What to Expect Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-to-r from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-gray-900">What Happens Next</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Order Processing</h3>
                  <p className="text-sm text-gray-600">
                    Your order is being prepared for shipment. Most orders ship within 1-2 business days.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Email Updates</h3>
                  <p className="text-sm text-gray-600">
                    you&apos;ll receive email notifications when your order ships, including tracking information.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Customer Support</h3>
                  <p className="text-sm text-gray-600">Questions about your order? Our support team is here to help.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Potential Issues Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-xl text-orange-800 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6" />
                If Additional Verification is Needed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-orange-800">
                In rare cases, our security system may require additional verification. This could happen if:
              </p>
              <ul className="space-y-2 text-orange-700 ml-4">
                <li>• Your billing and shipping addresses don&apos;t match</li>
                <li>• This is your first large order with us</li>
                <li>• Your order contains high-value or limited items</li>
                <li>• Our system detects unusual purchasing patterns</li>
              </ul>
              <div className="bg-orange-100 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">What We Might Request:</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Photo ID verification</li>
                  <li>• Confirmation of billing address</li>
                  <li>• Phone verification call</li>
                  <li>• Additional payment method verification</li>
                </ul>
              </div>
              <p className="text-orange-800 font-medium">
                If additional verification is needed, we&apos;ll contact you within 2 hours via email or phone with specific
                instructions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Section */}
        <div className="max-w-4xl mx-auto text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions About Your Order?</h2>
              <p className="text-gray-600 mb-6">
                Our customer service team is here to help with any questions about your order or shipping.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="text-center">
                  <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Email Support</h3>
                  <p className="text-blue-600">cs@tcglore.com</p>
                  <p className="text-sm text-gray-500">Response within 24 hours</p>
                </div>
                <div className="text-center">
                  <Phone className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Phone Support</h3>
                  <p className="text-green-600">(888) 496-1626</p>
                  <p className="text-sm text-gray-500">Mon-Fri 9AM-6PM EST</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button size="lg" className="w-full sm:w-auto">
                    Contact Support
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/products">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <Header />
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading order confirmation...</p>
          </div>
          <Footer />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}


