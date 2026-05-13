"use client"

import { useState } from "react"
import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Package,
  CheckCircle,
  Gift,
  Truck,
  Shield,
  RotateCcw,
  Star,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"
import { Header } from "../components/header"
import { Footer } from "../components/footer"
import { EnhancedDeliveryCalculator } from "../components/enhanced-delivery-calculator"
import { useCart } from "@/lib/cart-context"
import { Skeleton } from "@/components/ui/skeleton"
import { getCartProductDetails, type CartProductDetail } from "./actions"

// ── Rarity system (deterministic, seeded by product id) ─────────────────────

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "Ultra Rare": return "from-purple-500 to-pink-500"
    case "Rare":       return "from-yellow-400 to-orange-500"
    case "Uncommon":   return "from-blue-400 to-blue-600"
    default:           return "from-gray-400 to-gray-600"
  }
}

const getProductRarity = (productId: number, isPreOrder = false) => {
  const seed   = productId * 12345
  const random = (seed % 1000) / 1000
  if (isPreOrder) return random < 0.5 ? "Rare" : "Ultra Rare"
  if (random < 0.4) return "Common"
  if (random < 0.7) return "Uncommon"
  if (random < 0.9) return "Rare"
  return "Ultra Rare"
}

// ── Stock info derived from real DB stock quantity ───────────────────────────

const getStockInfo = (stockQuantity: number) => {
  if (stockQuantity <= 0) {
    return { level: "out",    text: "Out of Stock", count: 0,             color: "text-red-600 bg-red-50" }
  }
  if (stockQuantity <= 3) {
    return { level: "medium", text: "Low Stock",    count: stockQuantity, color: "text-orange-600 bg-orange-50" }
  }
  return   { level: "high",   text: "In Stock",     count: stockQuantity, color: "text-green-600 bg-green-50" }
}

// ── Customer reviews ─────────────────────────────────────────────────────────

const customerReviews = [
  { name: "Sarah M.",     rating: 5, text: "Amazing security features! I felt completely safe making my purchase. The return policy gave me peace of mind.", verified: true },
  { name: "Mike T.",      rating: 5, text: "Super secure checkout and the cards arrived exactly as described. Very happy with my purchase!", verified: true },
  { name: "Jessica L.",   rating: 5, text: "Love the secure payment process and the return policy is fantastic. Great customer service too!", verified: true },
  { name: "David R.",     rating: 5, text: "Fast shipping, authentic cards, and excellent security. This is my go-to store for TCG products now.", verified: true },
  { name: "Amanda K.",    rating: 5, text: "The delivery calculator is so helpful! Products arrived on time and packaging was perfect. Highly recommend!", verified: true },
  { name: "Chris P.",     rating: 5, text: "Outstanding authenticity verification process. Every card was genuine and in perfect condition. Will order again!", verified: true },
  { name: "Emily R.",     rating: 5, text: "Been collecting for 15 years and this is hands down the best TCG store I&apos;ve used. Every single card was mint condition!", verified: true },
  { name: "Jason W.",     rating: 5, text: "Ordered a booster box for my son's birthday. Arrived perfectly packaged and he pulled some amazing cards. Thank you!", verified: true },
  { name: "Maria S.",     rating: 5, text: "Customer service went above and beyond when I had a question about my pre-order. Very impressed with their professionalism.", verified: true },
  { name: "Tyler B.",     rating: 5, text: "The website is so easy to navigate and the product descriptions are detailed. Makes shopping for TCG products a breeze!", verified: true },
  { name: "Rachel H.",    rating: 5, text: "I was skeptical about buying cards online, but the return policy convinced me. Every card was exactly as described!", verified: true },
  { name: "Kevin L.",     rating: 5, text: "Lightning fast shipping! Ordered on Monday, received on Wednesday. Cards were perfectly protected in bubble wrap.", verified: true },
  { name: "Stephanie C.", rating: 5, text: "Love that they offer both new releases and vintage cards. Found some rare cards I&apos;ve been hunting for years!", verified: true },
  { name: "Brandon M.",   rating: 5, text: "The pre-order system is fantastic. Got my Bloomburrow box on release day without any hassle. Will definitely pre-order again!", verified: true },
  { name: "Nicole F.",    rating: 5, text: "Competitive prices and authentic products. The free shipping threshold is very reasonable too. Highly recommend!", verified: true },
  { name: "Alex J.",      rating: 5, text: "Been a customer for 2 years now. Consistent quality, fast shipping, and excellent customer service every single time.", verified: true },
  { name: "Samantha D.",  rating: 5, text: "The packaging is incredible! My cards arrived in perfect condition, each one individually protected. Professional service!", verified: true },
  { name: "Ryan K.",      rating: 5, text: "Great selection of Pokemon, Magic, and Yu-Gi-Oh products. Found everything I needed for my tournament deck in one place.", verified: true },
  { name: "Lisa T.",      rating: 5, text: "The return policy gave me confidence to make a large purchase. Thankfully didn&apos;t need it, but great to know It&apos;s there!", verified: true },
  { name: "Matthew G.",   rating: 5, text: "Ordered a Commander deck and some singles. Everything was exactly as described and arrived faster than expected. A+ service!", verified: true },
  { name: "Hannah B.",    rating: 5, text: "The authenticity verification is top-notch. As someone who's been burned by fakes before, this store gives me total peace of mind.", verified: true },
  { name: "Daniel P.",    rating: 5, text: "Excellent communication throughout the entire process. Got tracking info immediately and updates every step of the way.", verified: true },
  { name: "Ashley M.",    rating: 5, text: "The website's search function is amazing! Found exactly what I was looking for in seconds. User-friendly design too.", verified: true },
  { name: "Jordan R.",    rating: 5, text: "Bought cards for my local game store and the bulk pricing was fantastic. Will definitely be ordering more inventory from here.", verified: true },
  { name: "Megan L.",     rating: 5, text: "The delivery calculator is so accurate! Helped me plan my purchase perfectly for my daughter's tournament. Thank you!", verified: true },
]

// ── CustomerReviewsSection — auto-rotating, fixed mobile height ──────────────

const CustomerReviewsSection = () => {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % customerReviews.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 overflow-hidden w-full">
      <CardContent className="p-0">
        <div className="p-3 sm:p-4 md:p-6">
          <div className="w-full">
            {customerReviews.map((review, index) => (
              <div
                key={index}
                className={`transition-all duration-700 ease-in-out ${
                  index === currentReviewIndex
                    ? "opacity-100 transform translate-y-0 block"
                    : "opacity-0 transform translate-y-4 pointer-events-none hidden"
                }`}
              >
                <div className="bg-white/70 rounded-lg p-3 sm:p-4 border border-blue-200 shadow-sm w-full">
                  <div className="flex items-center gap-1 mb-2 sm:mb-3 flex-wrap">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                          i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                    <span className="text-xs sm:text-sm font-medium ml-1 sm:ml-2 text-blue-900 flex-shrink-0">
                      {review.rating}.0
                    </span>
                  </div>

                  <blockquote className="text-blue-800 italic mb-2 sm:mb-3 leading-relaxed text-sm sm:text-base break-words">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>

                  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-medium text-blue-900 flex-shrink-0">
                        — {review.name}
                      </span>
                      {review.verified && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                          <span className="text-xs text-green-600 font-medium whitespace-nowrap">
                            Verified Customer
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Skeleton UI ───────────────────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-6 flex gap-4">
                  <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <div className="pt-4 flex justify-between">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-10 w-full" /></CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Separator />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-12 w-full mt-4" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CartPageClientProps {}

// ── Main component ────────────────────────────────────────────────────────────

export default function CartPageClient() {
  const { state, dispatch, getTotalAmount, getCartCount } = useCart()
  const [promoCode, setPromoCode]         = React.useState("")
  const [appliedPromo, setAppliedPromo]   = React.useState<{ code: string; discount: number } | null>(null)
  const [selectedShipping, setSelectedShipping] = React.useState<any>(null)
  
  const [productDetails, setProductDetails] = React.useState<Record<number, CartProductDetail>>({})
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(true)

  const itemIdsStr = state.items.map(i => i.id).join(',')

  React.useEffect(() => {
    async function loadDetails() {
      if (state.items.length === 0) {
        setIsLoadingDetails(false)
        return
      }
      const ids = state.items.map(item => item.id)
      const details = await getCartProductDetails(ids)
      setProductDetails(details)
      setIsLoadingDetails(false)
    }
    loadDetails()
  }, [itemIdsStr, state.items.length])

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      dispatch({ type: "REMOVE_ITEM", payload: id })
    } else {
      dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity: newQuantity } })
    }
  }

  const removeItem = (id: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: id })
  }

  const applyPromoCode = () => {
    const validCodes: Record<string, number> = {
      SAVE10:    0.1,
      WELCOME15: 0.15,
      NEWBIE20:  0.2,
    }
    if (validCodes[promoCode]) {
      setAppliedPromo({ code: promoCode, discount: validCodes[promoCode] })
      setPromoCode("")
    }
  }

  const removePromoCode = () => setAppliedPromo(null)

  const handleShippingSelect = (option: any, deliveryInfo: any) => {
    setSelectedShipping({ option, deliveryInfo })
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal             = getTotalAmount()
  const itemCount            = getCartCount()
  const freeShippingThreshold = 75

  const shippingCost = selectedShipping
    ? selectedShipping.deliveryInfo.adjustedPrice
    : subtotal >= freeShippingThreshold
      ? 0
      : 9.99

  const discount            = appliedPromo ? subtotal * appliedPromo.discount : 0
  const subtotalAfterDiscount = subtotal - discount
  const tax                 = 0 // Actual tax is calculated securely at checkout
  const finalTotal          = subtotalAfterDiscount + shippingCost + tax

  // ── Helpers for delivery calculator ────────────────────────────────────────
  const hasPreOrder = state.items.some((item) => productDetails[item.id]?.isPreOrder)
  const firstPreOrderItem = state.items.find((item) => productDetails[item.id]?.isPreOrder)
  const preOrderDate = firstPreOrderItem
    ? productDetails[firstPreOrderItem.id]?.releaseDate
    : undefined

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!state.items || state.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-md mx-auto">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Looks like you haven&apos;t added any items to your cart yet.</p>
            <Button asChild size="lg" className="w-full">
              <Link href="/products">
                Start Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (isLoadingDetails) {
    return <CartSkeleton />
  }

  // ── Main cart UI ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Free Shipping Notification Bar */}
      {subtotal >= freeShippingThreshold ? (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Gift className="h-4 w-4" />
              <span>🎉 Congratulations! You&apos;ve qualified for FREE shipping on your order!</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4" />
              <span>
                Add ${(freeShippingThreshold - subtotal).toFixed(2)} more to your cart to qualify for FREE shipping!
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Page heading */}
        <div className="flex items-center gap-4 mb-8">
          <ShoppingBag className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Shopping Cart</h1>
            <p className="text-gray-600">
              {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
            </p>
          </div>
        </div>

        {/* ── lg:grid-cols-3 two-column layout ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: Cart items + Delivery Calculator + Reviews (desktop) ─ */}
          <div className="lg:col-span-2 space-y-4">

            {state.items.map((item) => {
              const product     = productDetails[item.id]
              const isPreOrder  = product?.isPreOrder ?? false
              const rarity      = getProductRarity(item.id, isPreOrder)
              const rarityColor = getRarityColor(rarity)
              const stockQty    = product?.stock ?? 10
              const stockInfo   = getStockInfo(stockQty)
              const maxQuantity = stockInfo.count > 0 ? stockInfo.count : 99

              return (
                <Card key={item.id} className="transition-all duration-200 hover:shadow-md">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <div className="flex gap-3 sm:gap-4">

                      {/* Product image + Auth badge */}
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-lg overflow-hidden relative">
                          <ImageWithFallback
                            src={item.image || "/placeholder.svg"} fallbackSrc="/placeholder.png"
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                          {/* Authentic badge overlay */}
                          <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                            <Badge className="bg-green-500 text-white text-xs px-1 py-0.5 flex items-center gap-0.5 sm:gap-1">
                              <Image
                                src="/images/shield-verified.png"
                                alt="Authentic"
                                width={8}
                                height={8}
                                className="w-2 h-2 sm:w-2.5 sm:h-2.5"
                              />
                              <span className="text-xs leading-none">Auth</span>
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Product details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <div className="min-w-0 flex-1 pr-2">
                            <h3 className="font-semibold text-sm sm:text-base md:text-lg leading-tight line-clamp-2 mb-1 sm:mb-2">
                              {item.name}
                            </h3>

                            {/* Rarity + Stock badges */}
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <Badge className={`bg-gradient-to-r ${rarityColor} text-white text-xs font-medium px-1.5 py-0.5`}>
                                <span className="text-xs leading-none">{rarity}</span>
                              </Badge>
                              <Badge className={`${stockInfo.color} text-xs px-1.5 py-0.5`}>
                                <span className="text-xs leading-none">
                                  {stockInfo.text} ({stockInfo.count})
                                </span>
                              </Badge>
                            </div>
                          </div>

                          {/* Remove button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 sm:p-2 h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>

                        {/* Price + Quantity row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center">
                            <span className="text-lg sm:text-xl font-bold">${Number(item.price).toFixed(2)}</span>
                          </div>

                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 sm:w-12 text-center font-medium text-sm sm:text-base">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= maxQuantity}
                              className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Low-stock warning */}
                        {stockInfo.count <= 5 && stockInfo.count > 0 && (
                          <div className="mt-2 text-xs sm:text-sm text-orange-600 flex items-center gap-1">
                            <Package className="h-3 w-3 flex-shrink-0" />
                            <span className="leading-tight">Only {stockInfo.count} left in stock!</span>
                          </div>
                        )}

                        {/* Pre-order release date */}
                        {isPreOrder && product?.releaseDate && (
                          <div className="mt-2 text-xs sm:text-sm text-blue-600 flex items-center gap-1">
                            <Package className="h-3 w-3 flex-shrink-0" />
                            <span className="leading-tight">Expected release: {product.releaseDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* ── Smart Delivery Calculator card ────────────────────────── */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">
                        Smart Delivery Calculator
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 leading-tight">
                        Precise delivery estimates with holiday calculations
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <EnhancedDeliveryCalculator
                      productPrice={subtotal}
                      isPreOrder={hasPreOrder}
                      preOrderDate={preOrderDate ?? undefined}
                      onShippingSelect={handleShippingSelect}
                      className="bg-white hover:bg-blue-50 border-blue-300 w-full sm:w-auto justify-center sm:justify-start"
                    />
                  </div>
                </div>

                {selectedShipping && (
                  <div className="bg-white/70 rounded-lg p-3 sm:p-4 border border-blue-200 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm sm:text-base text-blue-900">
                          {selectedShipping.option.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-blue-700">
                          Delivery by{" "}
                          {selectedShipping.deliveryInfo.estimatedDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="font-bold text-sm sm:text-base text-blue-900">
                          {selectedShipping.deliveryInfo.adjustedPrice === 0
                            ? "FREE"
                            : `$${selectedShipping.deliveryInfo.adjustedPrice.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white/70 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-blue-700">
                      <span className="text-sm sm:text-base flex-shrink-0">🚚</span>
                      <span className="leading-tight">Free shipping on orders over ${freeShippingThreshold}</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700">
                      <span className="text-sm sm:text-base flex-shrink-0">📦</span>
                      <span className="leading-tight">Secure packaging with tracking</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700">
                      <span className="text-sm sm:text-base flex-shrink-0">📅</span>
                      <span className="leading-tight">Excludes weekends &amp; holidays</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Reviews — desktop only (sidebar position) */}
            <div className="hidden lg:block">
              <CustomerReviewsSection />
            </div>
          </div>

          {/* ── RIGHT: Sticky sidebar ──────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">

              {/* ── Promo Code card ────────────────────────────────────────── */}
              <Card>
                <CardHeader>
                  <CardTitle>Promo Code</CardTitle>
                </CardHeader>
                <CardContent>
                  {!appliedPromo ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && applyPromoCode()}
                      />
                      <Button onClick={applyPromoCode} variant="outline">
                        Apply
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-800">{appliedPromo.code} Applied</div>
                        <div className="text-sm text-green-600">{appliedPromo.discount * 100}% discount</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removePromoCode}
                        className="text-green-700 hover:text-green-900"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Order Summary card ─────────────────────────────────────── */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal ({itemCount} items)</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>

                    {appliedPromo && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({appliedPromo.code})</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>
                        {shippingCost === 0 ? (
                          <span className="text-green-600 font-medium">FREE</span>
                        ) : (
                          `$${shippingCost.toFixed(2)}`
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-base">Tax (estimated)</span>
                      <span className="text-gray-500 italic">Calculated at checkout</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${finalTotal.toFixed(2)}</span>
                  </div>

                  {/* Free shipping progress bar */}
                  {subtotal < freeShippingThreshold && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-800 mb-2">
                        Add ${(freeShippingThreshold - subtotal).toFixed(2)} more for FREE shipping!
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardContent className="pt-0">
                  <Button asChild size="lg" className="w-full">
                    <Link href="/checkout">
                      <Image
                        src="/images/lock-icon.png"
                        alt="Secure"
                        width={16}
                        height={16}
                        className="w-4 h-4 mr-2"
                      />
                      Secure Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <div className="text-center mt-3">
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/products">
                        Continue Shopping
                      </Link>
                    </Button>
                  </div>
                </CardContent>

                {/* Trust signals + payment icons */}
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-gray-600 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span>Secure checkout guaranteed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span>Verified products</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-purple-600" />
                      <span>Free returns within 30 days</span>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center gap-2">
                        <div className="text-xs">We accept:</div>
                        <Image
                          src="/images/credit-cards.png"
                          alt="Accepted payment methods: Visa, MasterCard, American Express, Discover"
                          width={160}
                          height={34}
                          className="w-40 h-auto"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Customer Reviews — mobile only (bottom of page) */}
        <div className="mt-8 lg:hidden w-full">
          <CustomerReviewsSection />
        </div>
      </div>

      <Footer />
    </div>
  )
}

