import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Clock, CreditCard, Package, AlertTriangle, RefreshCw } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pre-order Policy | TCG Lore",
  description: "Learn about our pre-order policies, including payment, release dates, mixed cart shipping, and cancellations.",
}

export default function PreorderPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pre-order Policy
            </h1>
            <p className="text-gray-600">
              Everything you need to know about pre-ordering upcoming trading card games and accessories.
              <br />
              <span className="text-sm mt-2 block">Last Updated: March 1, 2024</span>
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  When Customers Are Charged
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 space-y-4">
                <p>
                  To secure your allocation of highly anticipated products, <strong>your payment method is charged immediately upon placing a pre-order</strong>. 
                </p>
                <p>
                  This immediate charge ensures that your order is recorded in our system. It allows us to accurately coordinate with our distributors and manage our inventory allocation upon release.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-purple-600" />
                  Estimated Release Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 space-y-4">
                <p>
                  Release dates provided on product pages are <strong>estimates based on information from manufacturers and distributors</strong>. 
                </p>
                <p>
                  We strive to provide the most accurate release dates possible. However, the exact date is subject to change. If a product's release date is delayed significantly, we will update the product page and attempt to notify you via email.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-green-600" />
                  Shipping After Release
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 space-y-4">
                <p>
                  Pre-ordered items are generally shipped within <strong>1-2 business days</strong> of the official release date or upon our receipt of the product from the distributor.
                </p>
                <p>
                  In rare cases, distributors may ship products to us in waves. If this happens, orders will be fulfilled chronologically based on when the pre-order was placed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  Mixed Cart Handling
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 space-y-4">
                <p>
                  If you place an order containing both <strong>in-stock items and pre-order items</strong>, or multiple pre-order items with different release dates, <strong>the entire order will be held until all items are in stock and ready to ship</strong>.
                </p>
                <p>
                  To receive your in-stock items sooner, we strongly recommend placing separate orders for in-stock products and pre-order products.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-red-600" />
                  Cancellation Before Fulfillment
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 space-y-4">
                <p>
                  You may cancel a pre-order for a full refund at any time <strong>before the product enters the fulfillment process</strong> (typically 3-5 days before the release date).
                </p>
                <p>
                  To request a cancellation, please contact our support team immediately at <a href="mailto:cs@tcglore.com" className="text-blue-600 hover:underline">cs@tcglore.com</a> with your order number. Once a pre-order has begun fulfillment or has shipped, it can no longer be canceled and falls under our standard Return Policy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-slate-600" />
                  Manufacturer or Distributor Release Date Changes
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-700 space-y-4">
                <p>
                  Occasionally, manufacturers or distributors may change release dates, alter product allocations, or cancel products entirely. 
                </p>
                <p>
                  If a product is officially canceled by the manufacturer, you will receive a full refund to your original payment method. If our allocation is severely cut by a distributor and we cannot fulfill your order, we will issue a full refund and notify you immediately.
                </p>
              </CardContent>
            </Card>
            
            <section className="mb-8 mt-12 bg-white p-6 rounded-xl border shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions regarding our pre-order policies, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Business Operator:</strong> TOY HAULERZ LLC
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong> <a href="mailto:cs@tcglore.com" className="text-blue-600 hover:underline">cs@tcglore.com</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Phone:</strong> <a href="tel:+18884961626" className="text-blue-600 hover:underline">(888) 496-1626</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Address:</strong> 1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136, United States
                </p>
                <p className="text-gray-700 mt-4 text-sm font-medium border-t pt-4">
                  TCG Lore is an online trading card store operated by TOY HAULERZ LLC.
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
