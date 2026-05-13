"use client"

import { useState, useEffect, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Plus,
  Minus,
  Shield,
  Truck,
  RotateCcw,
  CheckCircle,
  Package,
  Clock,
  TrendingUp,
  Award,
  Eye,
  ThumbsUp,
  Calendar,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"
import { useRouter } from "next/navigation"
import { Header } from "../../components/header"
import { Footer } from "../../components/footer"
import { EnhancedDeliveryCalculator } from "../../components/enhanced-delivery-calculator"
import { RarityBadge } from "../../components/rarity-badge"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useToast } from "@/hooks/use-toast"
import type { Product } from "@/lib/products"
export interface DbReview {
  id: string
  product_id: number
  customer_id: number | null
  rating: number
  title: string | null
  review_text: string
  is_verified_purchase: boolean
  created_at: string
  reviewer_name: string | null
}
import { WriteReviewModal } from "../../components/write-review-modal"
import { FormattedDescription } from "../../components/formatted-description"

interface ProductPageClientProps {
  product: Product
  relatedProducts: Product[]
}

export default function ProductPageClient({ product, relatedProducts }: ProductPageClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { addItemWithAnimation, isAddingToCart } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()

  const [quantity, setQuantity] = useState(1)
  const [mobileQuantity, setMobileQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [activeTab, setActiveTab] = useState("description")
  const [selectedShipping, setSelectedShipping] = useState<any>(null)
  const [showMobileBar, setShowMobileBar] = useState(false)
  // Per-review helpful vote counts — keyed by review id (string or number)
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({})
  const [helpfulClicked, setHelpfulClicked] = useState<Record<string, boolean>>({})
  // Accordion open state for mobile tabs (all open by default)
  const [openAccordion, setOpenAccordion] = useState<Record<string, boolean>>({
    description: true,
    specifications: true,
    reviews: true,
    authenticity: true,
  })
  const toggleAccordion = (key: string) =>
    setOpenAccordion((prev) => ({ ...prev, [key]: !prev[key] }))

  // Safe fallbacks for optional DB fields
  const productRating = product.rating || 0
  const productDescription = product.description || "Experience the thrill of opening premium trading card packs with this exceptional product. Each pack contains carefully curated cards that offer exciting gameplay possibilities and collectible value."
  const productImage = product.image || "/placeholder.svg?height=400&width=400"

  // ── Real DB reviews state ─────────────────────────────────────────────────
  const [dbReviews, setDbReviews] = useState<DbReview[]>([])
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

  // Fetch approved real reviews on mount.
  useEffect(() => {
    fetch(`/api/reviews?product_id=${product.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.reviews) setDbReviews(data.reviews) })
      .catch(() => { console.error("Failed to fetch reviews") })
  }, [product.id])

  const totalReviewCount = product.reviews || 0
  const combinedRating = product.rating || 0

  const reviewSummary = useMemo(() => {
    const defaultDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    if (dbReviews.length === 0) {
      return { totalReviews: 0, averageRating: 0, ratingDistribution: defaultDist, verifiedPercentage: 0 }
    }
    const dist = { ...defaultDist }
    let verifiedCount = 0
    dbReviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating as keyof typeof dist]++
      if (r.is_verified_purchase) verifiedCount++
    })
    return {
      totalReviews: totalReviewCount,
      averageRating: combinedRating,
      ratingDistribution: dist,
      verifiedPercentage: Math.round((verifiedCount / dbReviews.length) * 100),
    }
  }, [dbReviews, totalReviewCount, combinedRating])

  const displayReviews = dbReviews.map((r) => ({
    id: r.id,
    userName: r.reviewer_name ?? "Anonymous",
    rating: r.rating,
    title: r.title ?? "Customer Review",
    comment: r.review_text,
    date: r.created_at,
    verified: r.is_verified_purchase,
    helpful: 0,
    images: undefined as string[] | undefined,
  }))

  // Mobile sticky bar scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const productSection = document.getElementById("product-main-section")
      if (productSection) {
        const rect = productSection.getBoundingClientRect()
        const shouldShow = rect.bottom < 0
        setShowMobileBar(shouldShow)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleAddToCart = async (quantityToAdd = quantity) => {
    if (!product) return

    try {
      await addItemWithAnimation(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          image: productImage,
          category: product.category,
          inStock: product.inStock,
        },
        quantityToAdd,
      )

      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart.`,
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const handleMobileAddToCart = async () => {
    await handleAddToCart(mobileQuantity)
  }

  const handleWishlistToggle = () => {
    if (!product) return

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id)
      toast({
        title: "Removed from Wishlist",
        description: `${product.name} has been removed from your wishlist.`,
        duration: 2000,
      })
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        originalPrice: product.originalPrice,
        image: productImage,
        category: product.category,
        rating: productRating,
        reviews: product.reviews ?? 0,
        inStock: product.inStock,
        isNew: product.isNew,
        isHot: product.isHot,
        isPreOrder: product.isPreOrder,
      })
      toast({
        title: "Added to Wishlist",
        description: `${product.name} has been added to your wishlist.`,
        duration: 2000,
      })
    }
  }

  const handleShippingSelect = (option: any, deliveryInfo: any) => {
    setSelectedShipping({ option, deliveryInfo })
  }

  const truncateTitle = (title: string, maxLength = 30) => {
    return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title
  }

  const images = [productImage]
  const isWishlisted = isInWishlist(product.id)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-gray-50 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-600 hover:text-blue-600">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/products" className="text-gray-600 hover:text-blue-600">
              Products
            </Link>
            <span className="text-gray-400">/</span>
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="text-gray-600 hover:text-blue-600"
            >
              {product.category}
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Product Main Section */}
        <div id="product-main-section" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-slate-50 border rounded-xl p-8 flex items-center justify-center relative group overflow-hidden">
              <div className="relative w-full h-full flex items-center justify-center">
                <ImageWithFallback
                  src={images[selectedImage] || "/placeholder.svg"} fallbackSrc="/placeholder.png"
                  alt={product.name}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Badges — visual overlay only, NOT in JSON-LD or alt text */}
              <div className="absolute top-4 left-4 space-y-1.5">
                {/* NEW badge: desktop only */}
                {product.isNew && (
                  <Badge className="hidden md:block bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg border-0 text-xs font-semibold px-2.5 py-1">
                    ✦ NEW
                  </Badge>
                )}
                {/* HOT badge: desktop only */}
                {product.isHot && (
                  <Badge className="hidden md:block bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg border-0 text-xs font-semibold px-2.5 py-1">
                    🔥 HOT
                  </Badge>
                )}
                {product.isPreOrder && (
                  <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border-0 text-xs font-semibold px-2.5 py-1 block">
                    PRE-ORDER
                  </Badge>
                )}
                {/* Save badge: desktop only (top-left stack) */}
                {product.originalPrice && (
                  <Badge className="hidden md:block bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg border-0 text-xs font-semibold px-2.5 py-1">
                    SAVE ${(product.originalPrice - product.price).toFixed(2)}
                  </Badge>
                )}
              </div>

              {/* Mobile-only Sale badge — bottom-left corner */}
              {product.originalPrice && (
                <div className="absolute bottom-4 left-4 md:hidden">
                  <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg border-0 text-xs font-semibold px-2.5 py-1">
                    SALE
                  </Badge>
                </div>
              )}

              {/* Quick Actions */}
              <div className="absolute top-4 right-4 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="secondary"
                  className="bg-white/90 hover:bg-white"
                  onClick={handleWishlistToggle}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                  <span className="sr-only">{isWishlisted ? "Remove from wishlist" : "Add to wishlist"}</span>
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="bg-white/90 hover:bg-white"
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: product.name,
                          text: `Check out ${product.name} on TCG Lore!`,
                          url: window.location.href,
                        })
                      } catch (error) {
                        console.error("Error sharing", error)
                      }
                    } else {
                      navigator.clipboard.writeText(window.location.href)
                      toast({
                        title: "Link Copied",
                        description: "Product link copied to clipboard.",
                        duration: 2000,
                      })
                    }
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="sr-only">Share product</span>
                </Button>
              </div>
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 bg-slate-50 rounded-lg overflow-hidden border-2 p-1.5 flex items-center justify-center transition-colors ${
                      selectedImage === index ? "border-blue-500" : "border-transparent hover:border-gray-300"
                    }`}
                  >
                    <ImageWithFallback
                      src={image || "/placeholder.svg"} fallbackSrc="/placeholder.png"
                      alt={`${product.name} ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-xl md:text-3xl font-bold text-gray-900">{product.name}</h1>
                <RarityBadge rarity={product.rarity} className="text-sm px-3 py-1" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(productRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-2">
                    {combinedRating} ({totalReviewCount.toLocaleString()} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Trust Badges Row */}
            {/* flex-nowrap + justify-between forces all 3 items onto a single line on mobile */}
            <div className="flex flex-nowrap items-center justify-between py-3 px-2 md:px-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex flex-1 items-center justify-center gap-1 md:gap-2">
                <Shield className="w-3 h-3 md:w-5 md:h-5 text-green-600 shrink-0" />
                <span className="text-[10px] md:text-sm font-medium text-green-800 leading-tight">Verified Product</span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1 md:gap-2 border-x border-green-200 md:border-x-0">
                <Shield className="w-3 h-3 md:w-5 md:h-5 text-green-600 shrink-0" />
                <span className="text-[10px] md:text-sm font-medium text-green-800 leading-tight">Secure Purchase</span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1 md:gap-2">
                <Truck className="w-3 h-3 md:w-5 md:h-5 text-green-600 shrink-0" />
                <span className="text-[10px] md:text-sm font-medium text-green-800 leading-tight">Fast Shipping</span>
              </div>
            </div>


            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-blue-600">${product.price.toFixed(2)} USD</span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-500 line-through">${product.originalPrice.toFixed(2)}</span>
                )}
                {product.originalPrice && (
                  <Badge className="bg-red-100 text-red-800">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </Badge>
                )}
              </div>
              {product.originalPrice && (
                <p className="text-sm text-green-600 font-medium">
                  You save ${(product.originalPrice - product.price).toFixed(2)}
                </p>
              )}
            </div>

            {/* Stock Status — hidden for pre-order products (info box below handles it) */}
            {!product.isPreOrder && (
              <div className="flex items-center gap-2">
                {product.inStock ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 font-medium">In Stock</span>
                    <span className="text-sm text-gray-500">• Ready to ship</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 font-medium">Out of Stock</span>
                    <span className="text-sm text-gray-500">• Notify when available</span>
                  </>
                )}
              </div>
            )}

            {/* Pre-order Info */}
            {product.isPreOrder && product.releaseDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Pre-Order Information</span>
                </div>
                <p className="text-sm text-blue-700">
                  Pre-order — Expected release date: <strong>{product.releaseDate}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Your order will ship as soon as the item becomes available.
                </p>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Quantity:</label>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="h-10 w-10 rounded-r-none"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[3rem] text-center font-medium border-x">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= 10}
                    className="h-10 w-10 rounded-l-none"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <span className="text-sm text-gray-500">Max: 10 per order</span>
              </div>

              <div className="flex gap-3">
                <Button
                  size="lg"
                  onClick={() => handleAddToCart()}
                  disabled={(!product.inStock && !product.isPreOrder) || isAddingToCart}
                  className={`flex-1 h-12 text-lg font-semibold ${
                    product.isPreOrder
                      ? "bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isAddingToCart
                    ? "Adding..."
                    : product.isPreOrder
                      ? "Pre-Order Now"
                      : product.inStock
                        ? "Add to Cart"
                        : "Out of Stock"}
                </Button>
                <Button size="lg" variant="outline" onClick={handleWishlistToggle} className="h-12 px-6 bg-transparent">
                  <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Delivery Calculator */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Check Delivery</h3>
                      {/* Description: hidden on mobile, visible on md+ */}
                      <p className="hidden md:block text-sm text-blue-700">Get precise delivery estimates</p>
                    </div>
                  </div>
                  <EnhancedDeliveryCalculator
                    productPrice={product.price * quantity}
                    isPreOrder={product.isPreOrder}
                    preOrderDate={product.preOrderDate}
                    onShippingSelect={handleShippingSelect}
                  />
                </div>

                {selectedShipping && (
                  <div className="mt-4 p-3 bg-white/70 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">{selectedShipping.option.name}</h4>
                        <p className="text-sm text-blue-700">
                          Delivery by{" "}
                          {selectedShipping.deliveryInfo.estimatedDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="font-semibold text-blue-900">
                        {selectedShipping.deliveryInfo.adjustedPrice === 0
                          ? "FREE"
                          : `$${selectedShipping.deliveryInfo.adjustedPrice.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Trust Indicators Section */}
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Supplier-Sourced Products</h3>
              <p className="text-gray-600 text-sm">
                Products are sourced through U.S.-based supplier and distributor networks and inspected before shipment.
              </p>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Fast & Secure Shipping</h3>
              <p className="text-gray-600 text-sm">
                Free shipping on orders over $75. All packages are tracked and insured.
              </p>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Easy Returns</h3>
              <p className="text-gray-600 text-sm">
                30-day return policy. If you&apos;re not satisfied, we&apos;ll make it right.
              </p>
            </Card>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Card className="mb-12">
          {/* ── Desktop: standard Tabs ────────────────────────────────────── */}
          <div className="hidden md:block">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({totalReviewCount.toLocaleString()})</TabsTrigger>
                <TabsTrigger value="authenticity">Product Info</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="p-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Product Description</h3>
                  <FormattedDescription text={productDescription} className="text-gray-700" />

                  {(!product.description && product.features && product.features.length > 0) && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Key Features:</h4>
                      <ul className="space-y-2">
                        {product.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabsContent>


              <TabsContent value="reviews" className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Customer Reviews</h3>
                    <Button variant="outline" onClick={() => setIsReviewModalOpen(true)}>Write a Review</Button>
                  </div>

                  {/* Review Summary */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">{combinedRating}</div>
                        <div className="flex items-center justify-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < Math.floor(combinedRating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-600">Based on {totalReviewCount.toLocaleString()} reviews</p>
                        <p className="text-sm text-green-600 mt-1">
                          {reviewSummary.verifiedPercentage}% verified purchases
                        </p>
                      </div>
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const count =
                            reviewSummary.ratingDistribution[stars as keyof typeof reviewSummary.ratingDistribution]
                          const percentage = reviewSummary.totalReviews > 0 ? Math.round((count / reviewSummary.totalReviews) * 100) : 0
                          return (
                            <div key={stars} className="flex items-center gap-2">
                              <span className="text-sm w-8">{stars}★</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600 w-12">{percentage}%</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Individual Reviews — real DB reviews first, generator fills remainder */}
                  <div className="space-y-6">
                    {displayReviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{review.userName}</span>
                              {review.verified && (
                                <Badge className="bg-green-100 text-green-800 text-xs">Verified Purchase</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600">
                                {new Date(review.date).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <h4 className="font-semibold mb-2">{review.title}</h4>
                        <p className="text-gray-700 mb-3">{review.comment}</p>

                        {review.images && (
                          <div className="flex gap-2 mb-3">
                            {(review.images as string[]).map((image: string, index: number) => (
                              <div key={index} className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                                <ImageWithFallback
                                  src={image || "/placeholder.svg"} fallbackSrc="/placeholder.png"
                                  alt={`Review image ${index + 1}`}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Helpful button — interactive local state, Reply button removed */}
                        {(() => {
                          const key = String(review.id)
                          const base = review.helpful ?? 0
                          const extra = helpfulCounts[key] ?? 0
                          const clicked = helpfulClicked[key] ?? false
                          return (
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <button
                                onClick={() => {
                                  if (!clicked) {
                                    setHelpfulCounts((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }))
                                    setHelpfulClicked((prev) => ({ ...prev, [key]: true }))
                                  }
                                }}
                                className={`flex items-center gap-1 transition-colors ${
                                  clicked ? "text-blue-600 font-medium" : "hover:text-blue-600"
                                }`}
                                aria-label={`Mark review as helpful (${base + extra} people found this helpful)`}
                              >
                                <ThumbsUp className={`w-4 h-4 ${clicked ? "fill-blue-600" : ""}`} />
                                Helpful ({base + extra})
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    ))}

                    {totalReviewCount > displayReviews.length && (
                      <div className="text-center pt-4">
                        <Button variant="outline" disabled>Load More Reviews ({totalReviewCount - displayReviews.length} remaining)</Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="authenticity" className="p-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-800 mb-2">Product Sourcing</h3>
                    <p className="text-gray-600">Products are inspected before shipment to confirm packaging condition and order accuracy</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Award className="w-6 h-6 text-blue-600" />
                        <h4 className="font-semibold">Supplier-Sourced</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Products are sourced through U.S.-based supplier and distributor networks.
                      </p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <h4 className="font-semibold">Condition Check</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Products are inspected before shipment to confirm packaging condition and order accuracy.
                      </p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Package className="w-6 h-6 text-purple-600" />
                        <h4 className="font-semibold">Secure Packaging</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Products are sealed and packaged securely to prevent tampering during transit.
                      </p>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <RotateCcw className="w-6 h-6 text-orange-600" />
                        <h4 className="font-semibold">Return Policy</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        30-day return policy if you receive a product that doesn&apos;t meet our authenticity standards.
                      </p>
                    </Card>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">How We Verify Authenticity</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          1
                        </div>
                        <div>
                          <h5 className="font-medium text-blue-900">Supplier Review</h5>
                          <p className="text-sm text-blue-700">
                            Products are sourced through U.S.-based supplier and distributor networks.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          2
                        </div>
                        <div>
                          <h5 className="font-medium text-blue-900">Physical Inspection</h5>
                          <p className="text-sm text-blue-700">
                            Each item is inspected for authentic packaging, seals, and product characteristics.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          3
                        </div>
                        <div>
                          <h5 className="font-medium text-blue-900">Secure Storage</h5>
                          <p className="text-sm text-blue-700">
                            Products are stored in climate-controlled facilities to maintain quality.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Mobile: Accordion (all sections open by default) ──────────── */}
          <div className="md:hidden divide-y divide-gray-200">
            {[
              {
                key: "description",
                label: "Description",
                content: (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Product Description</h3>
                    <FormattedDescription text={productDescription} className="text-gray-700" />
                    {(!product.description && product.features && product.features.length > 0) && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-3">Key Features:</h4>
                        <ul className="space-y-2">
                          {product.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "reviews",
                label: `Reviews (${totalReviewCount.toLocaleString()})`,
                content: (
                  <div className="space-y-4">
                    {/* Quick rating summary on mobile */}
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold text-blue-600">{reviewSummary.averageRating}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < Math.floor(reviewSummary.averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">{totalReviewCount.toLocaleString()} reviews</p>
                      </div>
                    </div>
                    {displayReviews.slice(0, 5).map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{review.userName}</span>
                          {review.verified && <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>}
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-700">{review.comment}</p>
                      </div>
                    ))}
                    {totalReviewCount > 5 && (
                      <Button variant="outline" className="w-full text-sm">Load More Reviews</Button>
                    )}
                  </div>
                ),
              },
              {
                key: "authenticity",
                label: "Authenticity",
                content: (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-8 h-8 text-green-600" />
                      <div>
                        <h3 className="font-bold text-green-800">Product Sourcing</h3>
                        <p className="text-sm text-gray-600">Products are inspected before shipment</p>
                      </div>
                    </div>
                    {[
                      { icon: <Award className="w-5 h-5 text-blue-600" />, title: "Supplier-Sourced", text: "Sourced through U.S.-based supplier and distributor networks." },
                      { icon: <CheckCircle className="w-5 h-5 text-green-600" />, title: "Condition Check", text: "Products are inspected to confirm packaging condition and order accuracy." },
                      { icon: <Package className="w-5 h-5 text-purple-600" />, title: "Secure Packaging", text: "Sealed and packaged securely to prevent tampering during transit." },
                      { icon: <RotateCcw className="w-5 h-5 text-orange-600" />, title: "30-Day Returns", text: "Full return policy if product doesn&apos;t meet our authenticity standards." },
                    ].map(({ icon, title, text }) => (
                      <div key={title} className="flex items-start gap-3">
                        {icon}
                        <div>
                          <h4 className="font-semibold text-sm">{title}</h4>
                          <p className="text-sm text-gray-600">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map(({ key, label, content }) => (
              <div key={key}>
                <button
                  onClick={() => toggleAccordion(key)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                  aria-expanded={openAccordion[key]}
                >
                  <span>{label}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                      openAccordion[key] ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openAccordion[key] && (
                  <div className="px-6 pb-6">{content}</div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Related Products</h2>
              <Link href={`/products?category=${encodeURIComponent(product.category)}`}>
                <Button variant="outline">View All</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => {
                const relatedReviewCount = relatedProduct.reviews || 0

                const relatedProductSlug = relatedProduct.slug || relatedProduct.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

                return (
                  <Card key={relatedProduct.id} className="group hover:shadow-lg transition-shadow">
                    <div className="aspect-square w-full bg-slate-50 border-b flex items-center justify-center p-6 rounded-t-lg overflow-hidden relative">
                      <ImageWithFallback
                        src={relatedProduct.image || "/placeholder.png"}
                        fallbackSrc="/placeholder.png"
                        alt={relatedProduct.name}
                        width={1000}
                        height={1000}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      <Link href={`/products/${relatedProductSlug}`}>
                        <div className="mb-1 flex items-center">
                           <RarityBadge rarity={relatedProduct.rarity} />
                        </div>
                        <h3 className="font-semibold text-sm mb-2 line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors">
                          {relatedProduct.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-1 mb-2 min-h-[16px]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(relatedProduct.rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        {relatedReviewCount > 0 && (
                          <span className="text-xs text-gray-600 ml-1">({relatedReviewCount.toLocaleString()})</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">${relatedProduct.price.toFixed(2)}</span>
                          {relatedProduct.originalPrice && (
                            <span className="text-xs text-gray-500 line-through">
                              ${relatedProduct.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <Link href={`/products/${relatedProductSlug}`}>
                          <Button size="sm" variant="outline" className="text-xs bg-transparent">
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Add to Cart Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg transition-transform duration-300 ease-in-out md:hidden ${
          showMobileBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ImageWithFallback
                src={productImage} fallbackSrc="/placeholder.png"
                alt={product.name}
                width={48}
                height={48}
                className="w-12 h-12 object-cover rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{truncateTitle(product.name)}</h3>
              <div className="flex items-center gap-1 flex-nowrap">
                <span className="font-bold text-blue-600">${product.price.toFixed(2)}</span>
                {/* Original price: hidden in sticky bar — saves space on mobile */}
                {product.originalPrice && (
                  <span className="hidden text-sm text-gray-500 line-through">${product.originalPrice.toFixed(2)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileQuantity(Math.max(1, mobileQuantity - 1))}
                  disabled={mobileQuantity <= 1}
                  className="h-8 w-8 rounded-r-none p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="px-2 py-1 text-sm font-medium border-x min-w-[2rem] text-center">
                  {mobileQuantity}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileQuantity(mobileQuantity + 1)}
                  disabled={mobileQuantity >= 10}
                  className="h-8 w-8 rounded-l-none p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <Button
                onClick={handleMobileAddToCart}
                disabled={!product.inStock || isAddingToCart}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isAddingToCart ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Write a Review modal */}
      <WriteReviewModal
        productId={product.id}
        productName={product.name}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmitted={() => {
          // Re-fetch approved reviews after a successful submission
          fetch(`/api/reviews?product_id=${product.id}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (data?.reviews) setDbReviews(data.reviews) })
            .catch(() => {})
        }}
      />

      <Footer />
    </div>
  )
}
