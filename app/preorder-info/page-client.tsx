"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "../components/header"
import { Footer } from "../components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Clock,
  Shield,
  CreditCard,
  Package,
  Bell,
  CheckCircle,
  Calendar,
  Star,
  ArrowRight,
  Info,
  Truck,
  Mail,
  Phone,
  AlertCircle,
  Gift,
  Zap,
  Users,
  Award,
  Eye,
  Heart,
  ShoppingCart,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"
import { RarityBadge } from "@/app/components/rarity-badge"
import type { Product } from "@/lib/product-filters"
import { generateSlug } from "@/lib/utils"

interface PreOrderInfoClientProps {
  preOrderProducts: Product[]
}

export default function PreOrderInfoClient({ preOrderProducts }: PreOrderInfoClientProps) {
  const [selectedTab, setSelectedTab] = useState("overview")

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=600&width=1200&text=Pre-Order+Background')] bg-cover bg-center opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Clock className="w-4 h-4" />
              Pre-Order Information
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Secure Your Cards Early
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100 leading-relaxed">
              Be the first to get the latest releases with our secure pre-order system. Reserve your cards today and
              never miss out on limited editions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products?isPreOrder=true">
                <Button size="lg" className="bg-white text-purple-900 hover:bg-purple-50 text-lg px-8 py-4 h-auto">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Browse Pre-Orders
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-purple-900 text-lg px-8 py-4 h-auto bg-transparent"
                onClick={() => setSelectedTab("process")}
              >
                Learn How It Works
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent"></div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Payment Security Alert */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Secure Payment Process:</strong> Your payment will be processed immediately upon order placement.
            Before shipment, we conduct thorough payment verification and fraud prevention checks to ensure your
            transaction security.
          </AlertDescription>
        </Alert>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-12">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* What is Pre-Order */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  What is Pre-Ordering?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      Pre-ordering allows you to reserve upcoming trading card game releases before they&apos;re officially
                      available. This ensures you&apos;ll receive your products as soon as they&apos;re released, often with
                      exclusive bonuses and guaranteed availability.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Guaranteed Availability</h4>
                          <p className="text-sm text-gray-600">
                            Secure your copy even if the product sells out upon release
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Exclusive Bonuses</h4>
                          <p className="text-sm text-gray-600">
                            Receive special pre-order bonuses like promo cards, playmats, or exclusive packaging
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-900">Priority Shipping</h4>
                          <p className="text-sm text-gray-600">
                            Your order ships as soon as we receive the products from the manufacturer
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg p-6">
                    <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      Pre-Order Benefits
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Early access to new releases</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Exclusive pre-order bonuses</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Guaranteed product availability</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Special pre-order pricing</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Priority customer support</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Featured Pre-Orders — DB-driven */}
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Featured Pre-Orders</h2>
                <p className="text-gray-600 text-lg">don&apos;t miss out on these upcoming releases</p>
              </div>

              {preOrderProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {preOrderProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="group hover:shadow-2xl transition-all duration-500 border-0 shadow-lg overflow-hidden"
                    >
                      <div className="relative">
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          <ImageWithFallback
                            src={product.image || "/placeholder.svg"} fallbackSrc="/placeholder.png"
                            alt={`${product.name} - ${product.category} Pre-Order`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg border-0 px-2.5 py-1 text-xs font-semibold animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            PRE-ORDER
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide">
                            {product.category}
                          </div>
                          <RarityBadge rarity={product.rarity} />
                        </div>
                        <h3 className="text-sm font-bold mb-2 line-clamp-2 leading-snug">{product.name}</h3>

                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(product.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-xs text-gray-600 ml-1">({product.rating?.toFixed(1) ?? "N/A"})</span>
                        </div>

                        {product.releaseDate && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs text-gray-600 font-medium">Ships {product.releaseDate}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg font-bold text-purple-600">${product.price.toFixed(2)}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <>
                              <span className="text-xs text-gray-500 line-through">
                                ${product.originalPrice.toFixed(2)}
                              </span>
                              <Badge className="bg-red-100 text-red-800 text-[10px] px-1.5">
                                Save ${(product.originalPrice - product.price).toFixed(2)}
                              </Badge>
                            </>
                          )}
                        </div>

                        <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                          <Button className="w-full h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300">
                            <Clock className="h-3.5 w-3.5 mr-1.5" />
                            Pre-Order Now
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pre-Orders Available</h3>
                  <p className="text-gray-500">Check back soon for upcoming releases!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="process" className="space-y-8">
            {/* Pre-Order Process Steps */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  How Pre-Ordering Works
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-8">
                  {[
                    {
                      step: 1,
                      title: "Browse & Select",
                      description: "Browse our pre-order section and select the products you want to reserve.",
                      icon: Eye,
                      color: "blue",
                    },
                    {
                      step: 2,
                      title: "Place Your Order",
                      description: "Add items to cart and complete the checkout process with your payment information.",
                      icon: ShoppingCart,
                      color: "purple",
                    },
                    {
                      step: 3,
                      title: "Payment Processing",
                      description:
                        "Your payment is charged immediately and verified through our secure fraud prevention system.",
                      icon: CreditCard,
                      color: "green",
                    },
                    {
                      step: 4,
                      title: "Order Confirmation",
                      description:
                        "Receive confirmation email with order details and expected release date information.",
                      icon: CheckCircle,
                      color: "emerald",
                    },
                    {
                      step: 5,
                      title: "Status Updates",
                      description: "Get notified about any changes to release dates or shipping information via email.",
                      icon: Bell,
                      color: "orange",
                    },
                    {
                      step: 6,
                      title: "Product Release",
                      description:
                        "Once the product is released and allocated to our inventory, we prepare your order for shipment.",
                      icon: Package,
                      color: "red",
                    },
                    {
                      step: 7,
                      title: "Shipment & Delivery",
                      description: "Your order ships with tracking information and arrives at your doorstep.",
                      icon: Truck,
                      color: "indigo",
                    },
                  ].map((step, index) => (
                    <div key={step.step} className="flex items-start gap-6">
                      <div
                        className={`w-12 h-12 bg-gradient-to-r from-${step.color}-500 to-${step.color}-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg`}
                      >
                        <step.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Step {step.step}: {step.title}
                          </h3>
                        </div>
                        <p className="text-gray-600 leading-relaxed">{step.description}</p>
                      </div>
                      {index < 6 && (
                        <div className="absolute left-6 mt-12 w-0.5 h-8 bg-gradient-to-b from-gray-300 to-transparent"></div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Status Tracking */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  Tracking Your Pre-Order
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg text-gray-900">Order Status Options</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h5 className="font-medium text-blue-900">Pre-Order Confirmed</h5>
                          <p className="text-sm text-blue-700">Your order is confirmed and awaiting product release</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h5 className="font-medium text-yellow-900">Processing</h5>
                          <p className="text-sm text-yellow-700">Product received, preparing your order for shipment</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <Truck className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h5 className="font-medium text-green-900">Shipped</h5>
                          <p className="text-sm text-green-700">Your order is on its way with tracking information</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg text-gray-900">How to Check Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-gray-900">Account Dashboard</h5>
                          <p className="text-sm text-gray-600">Log into your account to view all pre-order statuses</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-gray-900">Email Notifications</h5>
                          <p className="text-sm text-gray-600">
                            Automatic updates sent to your registered email address
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-gray-900">Order Tracking Page</h5>
                          <p className="text-sm text-gray-600">
                            Use your order number to track status without logging in
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Link href="/track-order">
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                          <Bell className="w-4 h-4 mr-2" />
                          Track Your Order
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-8">
            {/* Payment Terms */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-pink-600 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  Payment Terms & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Payment Processing */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">Immediate Payment Processing</h3>
                        <p className="text-blue-800 leading-relaxed mb-4">
                          Your payment will be charged immediately when you place your pre-order. This secures your
                          reservation and ensures product availability upon release.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-800">Payment processed at time of order</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-800">Immediate order confirmation</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-800">Guaranteed product reservation</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Verification */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900 mb-2">
                          Payment Verification & Fraud Prevention
                        </h3>
                        <p className="text-green-800 leading-relaxed mb-4">
                          Before processing your order for shipment, we conduct comprehensive payment verification and
                          fraud prevention checks to ensure the security of your transaction and protect against
                          unauthorized purchases.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-green-900">Security Measures:</h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-800">SSL encryption</span></div>
                              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-800">Address verification</span></div>
                              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-800">CVV validation</span></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-green-900">Fraud Detection:</h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-800">Transaction monitoring</span></div>
                              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-800">Risk assessment</span></div>
                              <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-800">Identity verification</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accepted Payment Methods */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Accepted Payment Methods</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border">
                        <Image src="/images/visa.svg" alt="Visa" width={60} height={40} className="h-8 w-auto" />
                      </div>
                      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border">
                        <Image src="/images/mastercard.svg" alt="Mastercard" width={60} height={40} className="h-8 w-auto" />
                      </div>
                      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border">
                        <Image src="/images/amex.svg" alt="American Express" width={60} height={40} className="h-8 w-auto" />
                      </div>
                      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border">
                        <Image src="/images/discover.svg" alt="Discover" width={60} height={40} className="h-8 w-auto" />
                      </div>
                    </div>
                  </div>

                  {/* Refund Policy */}
                  <div className="bg-gray-50 rounded-lg p-6 border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Pre-Order Refund Policy
                    </h3>
                    <div className="space-y-3 text-sm text-gray-700">
                      <p><strong>Cancellation Window:</strong> Pre-orders can be cancelled up to 48 hours before the expected release date for a full refund.</p>
                      <p><strong>Release Date Changes:</strong> If a release date is delayed by more than 30 days, you may request a full refund.</p>
                      <p><strong>Product Changes:</strong> If significant product specifications change, you&apos;ll be notified and given the option to cancel for a full refund.</p>
                      <p><strong>Refund Processing:</strong> Approved refunds are processed within 3-5 business days to your original payment method.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            {/* FAQ Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {[
                    { question: "When will my payment be charged?", answer: "Your payment is charged immediately when you place your pre-order. This secures your reservation and ensures the product will be available for you upon release." },
                    { question: "What happens if the release date changes?", answer: "we&apos;ll notify you immediately via email if there are any changes to the release date. If the delay is more than 30 days, you can request a full refund if desired." },
                    { question: "Can I cancel my pre-order?", answer: "Yes, pre-orders can be cancelled up to 48 hours before the expected release date for a full refund. After that, the order enters final processing and cannot be cancelled." },
                    { question: "Do I get charged shipping twice if I have other items?", answer: "No, if you have other items ready to ship, we&apos;ll hold them and ship everything together when your pre-order arrives, unless you specifically request separate shipments." },
                    { question: "What if the product is damaged during shipping?", answer: "All pre-orders are fully insured. If your product arrives damaged, contact us within 48 hours with photos and we&apos;ll send a replacement immediately at no cost." },
                    { question: "Are pre-order bonuses guaranteed?", answer: "Yes, all advertised pre-order bonuses are guaranteed for orders placed before the cutoff date. Bonuses are subject to availability and may vary by product." },
                    { question: "How do I track my pre-order status?", answer: "You can track your pre-order status through your account dashboard, via email notifications, or using our order tracking page with your order number." },
                    { question: "What payment methods do you accept?", answer: "We accept Credit Card payments. All transactions are encrypted and secure." },
                  ].map((faq, index) => (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        {faq.question}
                      </h3>
                      <p className="text-gray-700 leading-relaxed pl-7">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-blue-900 mb-2">Still Have Questions?</h3>
                <p className="text-blue-800 mb-6">
                  Our customer support team is here to help with any pre-order questions or concerns.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/contact">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Support
                    </Button>
                  </Link>
                  <Link href="tel:+18884961626">
                    <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 bg-transparent">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Us
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <Card className="border-0 shadow-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <CardContent className="p-12 text-center relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <Award className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Secure Your Cards?</h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              don&apos;t miss out on the latest releases. Pre-order now and be among the first to experience the newest
              trading card games with exclusive bonuses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products?isPreOrder=true">
                <Button
                  size="lg"
                  className="bg-white text-purple-900 hover:bg-purple-50 text-lg px-8 py-4 h-auto font-semibold shadow-lg"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Browse Pre-Orders
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/account">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-purple-900 text-lg px-8 py-4 h-auto bg-transparent font-semibold"
                >
                  <Bell className="mr-2 h-5 w-5" />
                  Track Orders
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}

