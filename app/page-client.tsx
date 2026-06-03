"use client"

import React, { useState, useEffect, useRef, Suspense, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductGridSkeleton } from "@/components/ui/product-skeleton"
import {
  ShoppingCart,
  Star,
  Heart,
  Eye,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Clock,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  Package,
  Truck,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  Box,
  AlertTriangle,
  Tags,
  BookOpen,
  User,
  Menu,
} from "lucide-react"
import { RarityBadge } from "@/app/components/rarity-badge"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"
import Link from "next/link"
import { Header } from "./components/header"
import { Footer } from "./components/footer"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { QuickViewModal } from "./components/quick-view-modal"
import { Hero } from "./components/hero"
import { useToast } from "@/hooks/use-toast"
import { generateSlug } from "@/lib/utils"
import { generateCategorySlug } from "@/lib/product-utils"
import type { Product } from "@/lib/products"
import type { SiteSettings } from "@/lib/site-settings"

// ============================================================
// Types
// ============================================================

interface HomePageClientProps {
  heroSettings: SiteSettings
  dataPromise: Promise<[Product[], Product[], Product[]]>
}

// ============================================================
// Client Component — all interactive behaviour lives here
// ============================================================

function HomeContent({ dataPromise }: { dataPromise: Promise<[Product[], Product[], Product[]]> }) {
  const [featuredProducts, bestSellingProducts, preOrderProducts] = use(dataPromise)

  const { addItemWithAnimation } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { toast } = useToast()

  // Quick view
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

  // Per-product button animation state
  const [buttonStates, setButtonStates] = useState<{ [key: number]: "idle" | "loading" | "success" }>({})

  // Category slider
  const sliderRef = useRef<HTMLDivElement>(null)
  const scrollCategories = (dir: "left" | "right") => {
    if (!sliderRef.current) return
    sliderRef.current.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" })
  }



  const getButtonState = (productId: number) => buttonStates[productId] || "idle"

  const addToCart = async (product: any, isPreOrder = false) => {
    const productId = product.id
    setButtonStates((prev) => ({ ...prev, [productId]: "loading" }))
    try {
      await addItemWithAnimation({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        category: product.category,
        inStock: product.inStock || product.isPreOrder,
      })
      setButtonStates((prev) => ({ ...prev, [productId]: "success" }))
      toast({
        title: isPreOrder ? "Pre-Order Added!" : "Added to Cart!",
        description: `${product.name} has been ${isPreOrder ? "pre-ordered" : "added to your cart"}.`,
        duration: 3000,
      })
      setTimeout(() => {
        setButtonStates((prev) => ({ ...prev, [productId]: "idle" }))
      }, 2000)
    } catch {
      setButtonStates((prev) => ({ ...prev, [productId]: "idle" }))
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const quickViewAddToCart = async (product: any) => {
    await addItemWithAnimation({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      category: product.category,
      inStock: product.inStock || product.isPreOrder,
    })
  }

  const handleWishlistToggle = (product: any) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id)
      toast({ title: "Removed from Wishlist", description: `${product.name} has been removed from your wishlist.`, duration: 2000 })
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        category: product.category,
        rating: product.rating,
        reviews: product.reviews || 0,
        inStock: product.inStock,
        isNew: product.isNew,
        isHot: product.isHot,
        isPreOrder: product.isPreOrder,
        preOrderDate: product.preOrderDate,
        releaseDate: product.releaseDate,
        salesCount: product.salesCount,
      })
      toast({ title: "Added to Wishlist", description: `${product.name} has been added to your wishlist.`, duration: 2000 })
    }
  }

  const openQuickView = (product: any) => {
    setSelectedProduct(product)
    setIsQuickViewOpen(true)
  }



  return (
    <>
      {/* Pre-Order Section — hidden when no pre-order products in DB */}
      {preOrderProducts.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Clock className="w-4 h-4" />
                Pre-Order Trading Cards
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 bg-gradient-to-r from-purple-900 via-purple-700 to-blue-900 bg-clip-text text-transparent supports-[background-clip:text]:text-transparent">
                Pre-Order Latest TCG Releases
              </h2>
              <p className="text-gray-600 text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
                Be the first to get your hands on the newest trading card game releases. Secure your booster packs and
                collectibles with exclusive pre-order bonuses.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 mb-12">
              {preOrderProducts.map((product) => {
                const buttonState = getButtonState(product.id)
                return (
                  <Card
                    key={product.id}
                    className="group hover:shadow-2xl transition-all duration-500 border-0 shadow-lg bg-white/90 backdrop-blur-sm relative overflow-hidden h-full flex flex-col"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <CardHeader className="p-0 relative flex-shrink-0">
                      <div className="relative overflow-hidden rounded-t-lg">
                        <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                          <div className="aspect-[3/4] w-full bg-slate-50 border-b flex items-center justify-center p-3 sm:p-4 rounded-t-lg overflow-hidden">
                            <ImageWithFallback
                              src={product.image || "/placeholder.png"}
                              fallbackSrc="/placeholder.png"
                              alt={`${product.name} - Premium ${product.category} Trading Cards`}
                              width={1000}
                              height={1000}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              className="w-full h-full object-contain object-center transition-transform duration-700 group-hover:scale-110"
                            />
                          </div>
                        </Link>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg border-0 px-3 py-1.5 text-xs font-semibold animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            PRE-ORDER
                          </Badge>
                        </div>
                        {product.originalPrice && (
                          <div className="absolute top-3 left-3 mt-10">
                            <Badge className="bg-red-500 text-white shadow-md px-2 py-1 text-xs font-medium">
                              Save ${(product.originalPrice - product.price).toFixed(2)}
                            </Badge>
                          </div>
                        )}
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.preventDefault(); handleWishlistToggle(product) }}
                            className={`h-9 w-9 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-300 border-0 backdrop-blur-sm ${isInWishlist(product.id) ? "text-red-600 hover:text-red-700" : "text-gray-600 hover:text-red-600"}`}
                            aria-label={`${isInWishlist(product.id) ? "Remove from" : "Add to"} wishlist: ${product.name}`}
                          >
                            <Heart className={`h-4 w-4 transition-all duration-300 ${isInWishlist(product.id) ? "fill-red-600 text-red-600 scale-110" : "fill-none text-current hover:scale-105"}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.preventDefault(); openQuickView(product) }}
                            className="h-9 w-9 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-300 border-0 text-gray-600 hover:text-blue-600 backdrop-blur-sm"
                            aria-label={`Quick view: ${product.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 relative z-10 flex-grow flex flex-col">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <div className="text-[10px] sm:text-xs text-purple-600 font-semibold uppercase tracking-wide">{product.category}</div>
                        <RarityBadge rarity={product.rarity} />
                      </div>
                      <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                        <CardTitle className="text-sm sm:text-base mb-1 line-clamp-2 hover:text-purple-600 transition-colors leading-tight font-bold min-h-[2.5rem] sm:min-h-[3rem] flex items-start">
                          {product.name}
                        </CardTitle>
                      </Link>
                      <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2 leading-relaxed">{product.description}</p>
                      {/* mt-auto pushes release date + price + button to card bottom */}
                      <div className="mt-auto">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: "rgb(22, 163, 74)" }} />
                          <span className="text-xs sm:text-sm font-medium truncate" style={{ color: "rgb(22, 163, 74)" }}>{product.releaseDate}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg sm:text-xl font-bold text-purple-600">${product.price.toFixed(2)}</span>
                          {product.originalPrice && (
                            <span className="text-xs sm:text-sm text-gray-500 line-through">${product.originalPrice.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    <div className="p-3 sm:p-4 pt-0">
                      <Button
                        className={`w-full h-10 text-white transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-xs sm:text-sm px-2 relative overflow-hidden transform ${buttonState === "loading" ? "bg-gradient-to-r from-purple-400 to-blue-400 cursor-not-allowed scale-95"
                          : buttonState === "success" ? "bg-gradient-to-r from-green-500 to-green-600 scale-105"
                            : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 active:scale-95"
                          }`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (buttonState === "idle") addToCart(product, true) }}
                        disabled={buttonState !== "idle"}
                        aria-label={`Pre-order ${product.name} trading cards`}
                      >
                        {buttonState === "loading" ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Adding...</>)
                          : buttonState === "success" ? (<><Check className="h-4 w-4 mr-2 animate-bounce" />Pre-Ordered!</>)
                            : (<><Clock className="h-4 w-4 mr-2" />Pre-Order Now</>)}
                        {buttonState === "idle" && <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>

            <div className="text-center">
              <Link href="/products?isPreOrder=true">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 lg:px-10 py-3 lg:py-4 text-base lg:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  View All Pre-Order Trading Cards
                  <ArrowRight className="ml-2 h-4 lg:h-5 w-4 lg:w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Featured Trading Card Products</h2>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                Discover our handpicked selection of premium Magic: The Gathering, Pokemon, and Yu-Gi-Oh! trading cards
              </p>
            </div>
            <Link href="/products">
              <Button variant="outline" className="hidden sm:flex bg-transparent border-2 hover:bg-gray-100 px-6 py-3">
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {featuredProducts.map((product) => {
              const buttonState = getButtonState(product.id)
              return (
                <Card key={product.id} className="group hover:shadow-2xl transition-all duration-500 border-0 shadow-lg h-full flex flex-col bg-white">
                  <CardHeader className="p-0 flex-shrink-0">
                    <div className="relative overflow-hidden rounded-t-lg">
                      <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                        <div className="aspect-[3/4] w-full bg-slate-50 border-b flex items-center justify-center p-3 sm:p-4 rounded-t-lg overflow-hidden">
                          <ImageWithFallback
                            src={product.image || "/placeholder.png"}
                            fallbackSrc="/placeholder.png"
                            alt={`${product.name} - Premium ${product.category} Trading Cards and Booster Packs`}
                            width={1000}
                            height={1000}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="w-full h-full object-contain object-center transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                          />
                        </div>
                      </Link>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {product.isPreOrder && (
                          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg border-0 px-3 py-1.5 text-xs font-semibold animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            PRE-ORDER
                          </Badge>
                        )}
                        {product.originalPrice && (
                          <Badge className="bg-red-500 shadow-md px-2 py-1 text-xs font-medium">
                            Save ${(product.originalPrice - product.price).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.preventDefault(); handleWishlistToggle(product) }}
                          className={`h-9 w-9 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-300 border-0 backdrop-blur-sm ${isInWishlist(product.id) ? "text-red-600 hover:text-red-700" : "text-gray-600 hover:text-red-600"}`}
                          aria-label={`${isInWishlist(product.id) ? "Remove from" : "Add to"} wishlist: ${product.name}`}
                        >
                          <Heart className={`h-4 w-4 transition-all duration-300 ${isInWishlist(product.id) ? "fill-red-600 text-red-600 scale-110" : "fill-none text-current hover:scale-105"}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.preventDefault(); openQuickView(product) }}
                          className="h-9 w-9 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-300 border-0 text-gray-600 hover:text-blue-600 backdrop-blur-sm"
                          aria-label={`Quick view: ${product.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 flex-grow flex flex-col">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="text-[10px] sm:text-xs text-gray-600 font-semibold uppercase tracking-wide">{product.category}</div>
                      <RarityBadge rarity={product.rarity} />
                    </div>
                    <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                      <CardTitle className="text-sm sm:text-base mb-1 line-clamp-2 hover:text-blue-600 transition-colors leading-tight font-bold min-h-[2.5rem] sm:min-h-[3rem] flex items-start">
                        {product.name}
                      </CardTitle>
                    </Link>
                    {/* mt-auto pushes rating + price + button to card bottom */}
                    <div className="mt-auto">
                      <div className="flex items-center gap-1 mb-1 min-h-[20px]">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                          ))}
                        </div>
                        {(product.reviews ?? 0) > 0 && (
                          <span className="text-sm text-gray-600 font-medium ml-1">({product.reviews})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg sm:text-xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                          <span className="text-xs sm:text-sm text-gray-500 line-through">${product.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-3 sm:p-4 pt-0">
                    <Button
                      className={`w-full h-10 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-xs sm:text-sm px-2 transform ${buttonState === "loading" ? (product.isPreOrder ? "bg-gradient-to-r from-purple-400 to-blue-400" : "bg-blue-400") + " cursor-not-allowed scale-95"
                        : buttonState === "success" ? "bg-green-500 hover:bg-green-600 scale-105"
                          : product.isPreOrder ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 active:scale-95"
                            : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105 active:scale-95"
                        }`}
                      onClick={() => addToCart(product, product.isPreOrder)}
                      disabled={(!product.inStock && !product.isPreOrder) || buttonState !== "idle"}
                      aria-label={`${product.isPreOrder ? "Pre-order" : "Add"} ${product.name} to cart`}
                    >
                      {buttonState === "loading" ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Adding...</>)
                        : buttonState === "success" ? (<><Check className="h-4 w-4 mr-2 animate-bounce" />{product.isPreOrder ? "Pre-Ordered!" : "Added!"}</>)
                          : product.isPreOrder ? (<><Clock className="h-4 w-4 mr-2" />Pre-Order Now</>)
                            : (<><ShoppingCart className="h-4 w-4 mr-2" />{product.inStock ? "Add to Cart" : "Out of Stock"}</>)}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="text-center mt-12 sm:hidden">
            <Link href="/products">
              <Button variant="outline" className="px-8 py-3 border-2 bg-transparent">
                View All Trading Card Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center">
                <TrendingUp className="mr-3 h-7 w-7 text-green-600" />
                Best Selling Trading Cards
              </h2>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                Top-rated Magic: The Gathering, Pokemon, and Yu-Gi-Oh! products loved by our TCG community
              </p>
            </div>
            <Link href="/products?sort=bestselling">
              <Button variant="outline" className="hidden sm:flex bg-transparent border-2 hover:bg-gray-100 px-6 py-3">
                View All Best Sellers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {bestSellingProducts.map((product, index) => {
              const buttonState = getButtonState(product.id)
              return (
                <Card key={product.id} className="group hover:shadow-2xl transition-all duration-500 border-0 shadow-lg relative overflow-hidden h-full flex flex-col bg-white">
                  <CardHeader className="p-0 flex-shrink-0">
                    <div className="relative overflow-hidden rounded-t-lg">
                      <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                        <div className="aspect-[3/4] w-full bg-slate-50 border-b flex items-center justify-center p-3 sm:p-4 rounded-t-lg overflow-hidden">
                          <ImageWithFallback
                            src={product.image || "/placeholder.png"}
                            fallbackSrc="/placeholder.png"
                            alt={`${product.name} - Best Selling ${product.category} Trading Cards and Collectibles`}
                            width={1000}
                            height={1000}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="w-full h-full object-contain object-center transition-transform duration-700 group-hover:scale-110"
                          />
                        </div>
                      </Link>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {product.isPreOrder && (
                          <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg border-0 px-3 py-1.5 text-xs font-semibold animate-pulse">
                            <Clock className="w-3 h-3 mr-1" />
                            PRE-ORDER
                          </Badge>
                        )}
                        {product.originalPrice && (
                          <Badge className="bg-red-500 px-2 py-1 text-xs font-medium shadow-md">
                            Save ${(product.originalPrice - product.price).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.preventDefault(); handleWishlistToggle(product) }}
                          className={`h-9 w-9 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-300 border-0 backdrop-blur-sm ${isInWishlist(product.id) ? "text-red-600 hover:text-red-700" : "text-gray-600 hover:text-red-600"}`}
                          aria-label={`${isInWishlist(product.id) ? "Remove from" : "Add to"} wishlist: ${product.name}`}
                        >
                          <Heart className={`h-4 w-4 transition-all duration-300 ${isInWishlist(product.id) ? "fill-red-600 text-red-600 scale-110" : "fill-none text-current hover:scale-105"}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.preventDefault(); openQuickView(product) }}
                          className="h-9 w-9 rounded-full bg-white/95 hover:bg-white shadow-lg transition-all duration-300 border-0 text-gray-600 hover:text-blue-600 backdrop-blur-sm"
                          aria-label={`Quick view: ${product.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 flex-grow flex flex-col">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="text-[10px] sm:text-xs text-gray-600 font-semibold uppercase tracking-wide">{product.category}</div>
                      <RarityBadge rarity={product.rarity} />
                    </div>
                    <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                      <CardTitle className="text-sm sm:text-base mb-1 line-clamp-2 hover:text-blue-600 transition-colors leading-tight font-bold min-h-[2.5rem] sm:min-h-[3rem] flex items-start">
                        {product.name}
                      </CardTitle>
                    </Link>
                    {/* mt-auto pushes rating + price + button to card bottom */}
                    <div className="mt-auto">
                      <div className="flex items-center gap-2 mb-1 min-h-[20px]">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                          ))}
                        </div>
                        {(product.reviews ?? 0) > 0 && (
                          <span className="text-sm text-gray-600 font-medium">({product.reviews})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg sm:text-xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
                        {product.originalPrice && (
                          <span className="text-xs sm:text-sm text-gray-500 line-through">${product.originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-3 sm:p-4 pt-0">
                    <Button
                      className={`w-full h-10 transition-all duration-300 shadow-lg hover:shadow-xl text-xs sm:text-sm px-2 font-semibold transform ${buttonState === "loading" ? (product.isPreOrder ? "bg-gradient-to-r from-purple-400 to-blue-400" : "bg-blue-400") + " cursor-not-allowed scale-95"
                        : buttonState === "success" ? "bg-green-500 hover:bg-green-600 scale-105"
                          : product.isPreOrder ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 active:scale-95"
                            : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105 active:scale-95"
                        }`}
                      onClick={() => addToCart(product, product.isPreOrder)}
                      disabled={(!product.inStock && !product.isPreOrder) || buttonState !== "idle"}
                      aria-label={`${product.isPreOrder ? "Pre-order" : "Add"} ${product.name} to cart`}
                    >
                      {buttonState === "loading" ? (<><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Adding...</>)
                        : buttonState === "success" ? (<><Check className="h-4 w-4 mr-2 animate-bounce" />{product.isPreOrder ? "Pre-Ordered!" : "Added!"}</>)
                          : product.isPreOrder ? (<><Clock className="h-4 w-4 mr-2" />Pre-Order Now</>)
                            : (<><ShoppingCart className="h-4 w-4 mr-2" />{product.inStock ? "Add to Cart" : "Out of Stock"}</>)}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="text-center mt-12 sm:hidden">
            <Link href="/products?sort=bestselling">
              <Button variant="outline" className="px-8 py-3 border-2 bg-transparent">
                View All Best Selling Trading Cards
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section — horizontal scroll-snap slider */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Shop Trading Cards by Category</h2>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              Explore our extensive collection of authentic trading card games from top brands
            </p>
          </div>

          {/* Category slider — uses component-level sliderRef + scrollCategories */}
          {(() => {
            const categoryList = [
              { name: "Magic: The Gathering", image: "/images/Magic.png", description: "Premium Magic cards and booster packs" },
              { name: "Pokemon TCG", image: "/images/Pokemon.png", description: "Authentic Pokemon trading cards" },
              { name: "Yu-Gi-Oh!", image: "/images/Yugioh.png", description: "Yu-Gi-Oh! cards and collectibles" },
              { name: "Disney Lorcana", image: "/images/Disney Lorcana.png", description: "Disney Lorcana trading card game" },
              { name: "One Piece", image: "/images/One Piece.png", description: "One Piece collectible cards" },
              { name: "Digimon Card Game", image: "/images/Digimon Card.png", description: "Digimon Card Game products" },
              { name: "Star Wars: Unlimited", image: "/images/Star Wars Unlimited.png", description: "Star Wars: Unlimited TCG" },
              { name: "Flesh and Blood", image: "/images/Flesh and Blood.png", description: "Flesh and Blood TCG products" },
            ]
            return (
              <div className="relative">
                {/* Left arrow — desktop only */}
                <button
                  onClick={() => scrollCategories("left")}
                  aria-label="Scroll categories left"
                  className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>

                {/* Scroll track — scrollbar hidden via inline style */}
                <div
                  ref={sliderRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
                  style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {categoryList.map((category) => (
                    <Link
                      key={category.name}
                      href={`/products?category=${generateCategorySlug(category.name)}`}
                      className="group flex-shrink-0"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      {/* Fixed uniform box: w-40 on mobile, w-44 on md+ */}
                      <div className="w-40 md:w-44">
                        <Card className="hover:shadow-xl transition-all duration-500 border-0 shadow-md bg-white h-full">
                          <CardContent className="p-4 text-center">
                            {/* Square image container — same across all cards */}
                            <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 p-2">
                              <ImageWithFallback
                                src={category.image}
                                fallbackSrc="/placeholder.png"
                                alt={`${category.name} - ${category.description}`}
                                width={1000}
                                height={1000}
                                sizes="(max-width: 768px) 160px, 176px"
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                            {/* whitespace-nowrap on mobile keeps text on one line */}
                            <h3 className="font-bold text-[11px] md:text-sm group-hover:text-blue-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                              {category.name}
                            </h3>
                          </CardContent>
                        </Card>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Right arrow — desktop only */}
                <button
                  onClick={() => scrollCategories("right")}
                  aria-label="Scroll categories right"
                  className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )
          })()}
        </div>
      </section>

      {/* Why Shop With Us Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Why Shop With TCG Lore</h2>
            <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
              We focus on clear product information, pre-order transparency, and support details so collectors and players can shop with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            <Card className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-lg mb-3">Clear Product Pages</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Product pages show title, price, availability, product type, and pre-order timing where applicable.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-lg mb-3">Pre-Order Transparency</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Pre-order items display release timing when available, and our policy explains how pre-order purchases are handled.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-lg mb-3">Customer Support</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Our support information is available across the site so customers can contact us about orders, products, and policies.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-lg mb-3">Secure Checkout</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Checkout is handled through supported payment providers, and order details are shown before purchase.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-lg mb-3">Policy Clarity</h3>
                <p className="text-sm text-gray-600 leading-relaxed">Shipping, returns, privacy, terms, payment, and pre-order policies are available for customers to review.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <QuickViewModal
        product={selectedProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={quickViewAddToCart}
        onWishlistToggle={handleWishlistToggle}
        isInWishlist={selectedProduct ? isInWishlist(selectedProduct.id) : false}
      />
    </>
  )
}

function HomeFallback() {
  return (
    <>
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-10" />
          <ProductGridSkeleton count={12} className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" />
        </div>
      </section>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-10" />
          <ProductGridSkeleton count={12} className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" />
        </div>
      </section>
    </>
  )
}

export default function HomePageClient({ heroSettings, dataPromise }: HomePageClientProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero
        heroTitle={heroSettings.heroTitle}
        heroSubtitle={heroSettings.heroSubtitle}
        heroImageUrl={heroSettings.heroImageUrl}
      />
      <Suspense fallback={<HomeFallback />}>
        <HomeContent dataPromise={dataPromise} />
      </Suspense>
      <Footer />
    </div>
  )
}

