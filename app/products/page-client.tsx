"use client"

import { useSearchParams } from "next/navigation"
import React, { useState, Suspense, use } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductGridSkeleton } from "@/components/ui/product-skeleton"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ShoppingCart,
  Star,
  Search,
  Grid,
  List,
  Eye,
  Heart,
  Check,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"
import Link from "next/link"
import { RarityBadge } from "@/app/components/rarity-badge"
import { Header } from "../components/header"
import { Footer } from "../components/footer"
import { useCart } from "@/lib/cart-context"
import { QuickViewModal, type ProductDetails } from "../components/quick-view-modal"
import { useWishlist } from "@/lib/wishlist-context"
import { useToast } from "@/hooks/use-toast"
import { useProductFilters } from "@/hooks/useProductFilters"
import { PRICE_RANGES, SORT_OPTIONS } from "@/lib/product-filters"
import { generateSlug } from "@/lib/utils"
import { getCategoryContent } from "@/lib/product-utils"
import type { Product } from "@/lib/product-filters"
import type { FilterAggregations } from "@/lib/product-filters"

interface ProductsPageClientProps {
  dataPromise: Promise<{
    products: Product[]
    totalCount: number
    totalPages: number
    page: number
    aggregations: FilterAggregations
    categoryMeta: any
  }>
  /** Category slug from the URL (e.g. "pokemon-tcg"). Null = all categories. */
  activeCategorySlug: string | null
  /** Decoded search query from the URL ?search= param. Null = no search active. */
  activeSearch: string | null
}

function ProductsContent({ dataPromise, activeCategorySlug, activeSearch }: ProductsPageClientProps) {
  const { products: initialProducts, totalCount: serverTotalCount, totalPages: serverTotalPages, page: serverPage, aggregations, categoryMeta } = use(dataPromise)
  const activeCategory = categoryMeta?.name ?? null

  const { dispatch, addItemWithAnimation, isAddingToCart, recentlyAddedItem } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const {
    products,
    totalCount,
    filters,
    setFilter,
    clearFilters,
    sortBy,
    setPriceRange,
    currentPage,
    totalPages,
    setPage,
    hasActiveFilters,
  } = useProductFilters(initialProducts, activeCategory ?? undefined, aggregations, serverTotalCount, serverTotalPages, serverPage)

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [quickViewProduct, setQuickViewProduct] = useState<ProductDetails | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const [buttonStates, setButtonStates] = useState<{ [key: number]: "idle" | "loading" | "success" }>({})
  const [showFilters, setShowFilters] = useState(false)

  // Use server-side aggregation counts for filter labels
  const { serverAggregations } = { serverAggregations: aggregations }

  const addToCart = async (product: any) => {
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
        inStock: product.stock > 0,
      })

      setButtonStates((prev) => ({ ...prev, [productId]: "success" }))
      toast({
        title: product.isPreOrder ? "Pre-Order Added!" : "Added to Cart!",
        description: `${product.name} has been ${product.isPreOrder ? "pre-ordered" : "added to your cart"}.`,
        duration: 3000,
      })
      setTimeout(() => {
        setButtonStates((prev) => ({ ...prev, [productId]: "idle" }))
      }, 2000)
    } catch (error) {
      setButtonStates((prev) => ({ ...prev, [productId]: "idle" }))
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  const handleQuickViewClick = (product: ProductDetails, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setQuickViewProduct(product)
    setIsQuickViewOpen(true)
  }

  const handleWishlistToggle = (product: any, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const inWishlist = isInWishlist(product.id)

    if (inWishlist) {
      removeFromWishlist(product.id)
    } else {
      addToWishlist({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        category: product.category,
        rating: product.rating ?? 0,
        reviews: product.reviews || 0,
        inStock: product.stock > 0,
        isNew: product.isNew,
        isHot: product.isHot,
        isPreOrder: product.isPreOrder,
      })
    }
  }

  const getButtonState = (productId: number) => {
    return buttonStates[productId] || "idle"
  }

  return (
    <>
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            {/* Dynamic SEO h1 — derived from stable server props, not client filter state */}
            {(() => {
              // Use server-resolved props (activeSearch, activeCategorySlug) NOT
              // filters.searchTerm — the latter is client-local and resets to undefined
              // during intermediate renders, which would flash back to "All Products".
              const content = getCategoryContent(activeCategorySlug, activeSearch ?? undefined)
              return (
                <>
                  <h1 className="text-2xl md:text-4xl font-bold mb-4 leading-tight">
                    {content.title}
                  </h1>
                  {activeSearch ? (
                    <p className="text-sm md:text-xl opacity-90 leading-relaxed">
                      Found {totalCount} products matching your search
                    </p>
                  ) : (
                    <p className="text-sm md:text-xl opacity-90 leading-relaxed">
                      {content.description}
                    </p>
                  )}
                </>
              )
            })()}

            {/* Category navigation breadcrumb pills */}
            {(activeCategory || activeCategorySlug) && (
              <div className="flex flex-wrap gap-2 mt-6">
                <a
                  href="/products"
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white/20 hover:bg-white/30 transition-colors text-white"
                  aria-label="View all trading card products"
                >
                  ← All Products
                </a>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white text-blue-700 font-medium"
                  aria-current="page"
                >
                  {activeCategory ?? activeCategorySlug}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-8 bg-gray-50 border-b">
        <div className="container mx-auto px-4">
          {/* Mobile: stacked, centred. Desktop (lg+): side-by-side, space-between */}
          <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full max-w-md mx-auto lg:max-w-none lg:mx-0 items-center sm:items-stretch">
              <div className="relative flex-1 w-full max-w-md lg:max-w-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search trading cards, booster packs..."
                  value={filters.searchTerm || ""}
                  onChange={(e) => setFilter("searchTerm", e.target.value)}
                  className="pl-10 w-full"
                  aria-label="Search trading card products"
                />
              </div>

              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="sm:w-auto w-full">
                <Filter className="h-4 w-4 mr-2" />
                Filters {hasActiveFilters && `(${Object.keys(filters).length})`}
              </Button>

              <Select value={filters.sortBy || "default"} onValueChange={(value) => sortBy(value === "default" ? undefined : (value as any))}>
                <SelectTrigger className="w-full sm:w-48" aria-label="Sort trading card products">
                  <SelectValue placeholder="Recommended" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{totalCount} trading card products</span>
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                  aria-label="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 p-6 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {/* Price Range Filter */}
                <div>
                  <h4 className="font-medium mb-3">Price Range</h4>
                  <div className="space-y-2">
                    {PRICE_RANGES.map((range) => (
                      <div key={range.label} className="flex items-center space-x-2">
                        <Checkbox
                          id={`price-${range.min}-${range.max}`}
                          checked={
                            filters.priceMin === range.min &&
                            (filters.priceMax === range.max ||
                              (range.max === Number.POSITIVE_INFINITY && !filters.priceMax))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPriceRange(range.min, range.max)
                            } else {
                              setPriceRange(undefined, undefined)
                            }
                          }}
                        />
                        <label htmlFor={`price-${range.min}-${range.max}`} className="text-sm">
                          {range.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Availability Filter */}
                <div>
                  <h4 className="font-medium mb-3">Availability</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="in-stock"
                        checked={filters.inStock || false}
                        onCheckedChange={(checked) => setFilter("inStock", checked || undefined)}
                      />
                      <label htmlFor="in-stock" className="text-sm">
                        In Stock ({serverAggregations.availability.inStock})
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="out-of-stock"
                        checked={filters.outOfStock || false}
                        onCheckedChange={(checked) => setFilter("outOfStock", checked || undefined)}
                      />
                      <label htmlFor="out-of-stock" className="text-sm">
                        Out of Stock ({serverAggregations.availability.outOfStock})
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pre-order"
                        checked={filters.isPreOrder || false}
                        onCheckedChange={(checked) => setFilter("isPreOrder", checked || undefined)}
                      />
                      <label htmlFor="pre-order" className="text-sm">
                        Pre-Order ({serverAggregations.availability.preOrder})
                      </label>
                    </div>
                  </div>
                </div>

                {/* Product Type Filter */}
                <div>
                  <h4 className="font-medium mb-3">Product Type</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="type-sealed"
                        checked={filters.productType === "sealed"}
                        onCheckedChange={(checked) => setFilter("productType", checked ? "sealed" : undefined)}
                      />
                      <label htmlFor="type-sealed" className="text-sm">Sealed Products ({serverAggregations.productType.sealed})</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="type-single"
                        checked={filters.productType === "single"}
                        onCheckedChange={(checked) => setFilter("productType", checked ? "single" : undefined)}
                      />
                      <label htmlFor="type-single" className="text-sm">Cards / Singles ({serverAggregations.productType.singles})</label>
                    </div>
                  </div>
                </div>

                {/* Rarity Filter — context-aware, only shows rarities present in the current category */}
                <div className="md:col-span-3 lg:col-span-2">
                  <h4 className="font-medium mb-3">Rarity</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {serverAggregations.rarity.length > 0 ? (
                      serverAggregations.rarity.map((r) => (
                        <div key={r.label} className="flex items-center space-x-2">
                          <Checkbox
                            id={`rarity-${r.label}`}
                            checked={filters.rarity === r.label}
                            onCheckedChange={(checked) => setFilter("rarity", checked ? r.label : undefined)}
                          />
                          <label htmlFor={`rarity-${r.label}`} className="text-sm">
                            {r.label} ({r.count})
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 col-span-2">No rarity data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-300 mb-6">
                <Search className="h-20 w-20 mx-auto" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">
                {activeCategorySlug && !activeCategory
                  ? "Category not found"
                  : "No products found"}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                {activeCategorySlug && !activeCategory
                  ? `We couldn't find any products in the "${activeCategorySlug}" category. It may not exist or has no active listings.`
                  : hasActiveFilters
                  ? "No products match your current filters. Try adjusting your criteria."
                  : "Try adjusting your search or filter criteria."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="bg-transparent">
                    Clear All Filters
                  </Button>
                )}
                <a href="/products">
                  <Button variant="default">Browse All Products</Button>
                </a>
              </div>
            </div>
          ) : (
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                    : "space-y-6"
                }
              >
                {products.map((product) => {
                  const buttonState = getButtonState(product.id)
                  return (
                    <Card
                      key={product.id}
                      className={`group hover:shadow-xl transition-all duration-300 relative ${
                        viewMode === "list" ? "flex flex-row" : "flex flex-col h-full"
                      }`}
                    >
                      <CardHeader className={`p-0 ${viewMode === "list" ? "w-48 flex-shrink-0" : "flex-shrink-0"}`}>
                        <div className="relative overflow-hidden rounded-t-lg">
                          <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                            <div
                              className={`bg-slate-50 border-b flex items-center justify-center p-6 overflow-hidden ${viewMode === "list" ? "w-48 h-48 rounded-l-lg rounded-t-none" : "w-full aspect-square rounded-t-lg"}`}
                            >
                              <ImageWithFallback
                                src={product.image || "/placeholder.png"}
                                fallbackSrc="/placeholder.png"
                                alt={`${product.name} - Premium ${product.category} Trading Cards and Booster Packs`}
                                width={1000}
                                height={1000}
                                sizes={viewMode === "list" ? "192px" : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"}
                                className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-110"
                              />
                            </div>
                          </Link>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />

                          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                            {product.isNew && (
                              <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md border-0 text-xs font-semibold px-2 py-0.5">
                                ✦ New
                              </Badge>
                            )}
                            {product.isHot && (
                              <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md border-0 text-xs font-semibold px-2 py-0.5">
                                🔥 Hot
                              </Badge>
                            )}
                            {product.isPreOrder && (
                              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border-0 text-xs font-semibold px-2 py-0.5">
                                Pre-Order
                              </Badge>
                            )}
                            {product.originalPrice && (
                              <Badge variant="secondary" className="shadow-md text-xs font-semibold">
                                Save ${(product.originalPrice - product.price).toFixed(2)}
                              </Badge>
                            )}
                          </div>

                          <div className="absolute top-3 right-3 z-10">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleWishlistToggle(product, e)}
                              className={`h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm transition-all duration-300 border-0 ${
                                isInWishlist(product.id)
                                  ? "text-red-600 hover:text-red-700"
                                  : "text-gray-600 hover:text-red-600"
                              }`}
                              aria-label={`${isInWishlist(product.id) ? "Remove from" : "Add to"} wishlist: ${product.name}`}
                            >
                              <Heart
                                className={`h-4 w-4 transition-all duration-300 ${
                                  isInWishlist(product.id)
                                    ? "fill-red-600 text-red-600 scale-110"
                                    : "fill-none text-current hover:scale-105"
                                }`}
                              />
                            </Button>
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <Button
                              variant="secondary"
                              className="bg-white/95 hover:bg-white shadow-lg backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                              onClick={(e) => handleQuickViewClick(product as any, e)}
                              aria-label={`Quick view: ${product.name}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Quick View
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <div className={`flex flex-col flex-grow ${viewMode === "list" ? "p-6" : ""}`}>
                        <CardContent className={`flex-grow flex flex-col ${viewMode === "list" ? "p-0" : "p-4"}`}>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="text-sm text-gray-600">{product.category}</div>
                            <RarityBadge rarity={product.rarity} />
                          </div>
                          <Link href={`/products/${product.slug || generateSlug(product.name)}`}>
                            <CardTitle
                              className={`mb-2 line-clamp-2 hover:text-blue-600 transition-colors leading-tight font-bold ${
                                viewMode === "list" ? "text-xl min-h-[3rem]" : "text-sm sm:text-base min-h-[2.5rem] sm:min-h-[3rem]"
                              } flex items-start`}
                            >
                              {product.name}
                            </CardTitle>
                          </Link>

                          <div className="mt-auto">
                            <div className="flex items-center gap-1 mb-1 min-h-[20px]">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < Math.floor(product.rating ?? 0)
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "fill-gray-200 text-gray-200"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-600 font-medium">{product.rating ?? "—"}</span>
                              {(product.reviews ?? 0) > 0 && (
                                <span className="text-sm text-gray-500">({product.reviews})</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg sm:text-xl font-bold text-blue-600">${product.price.toFixed(2)}</span>
                              {product.originalPrice && (
                                <span className="text-xs sm:text-sm text-gray-500 line-through">
                                  ${product.originalPrice.toFixed(2)}
                                </span>
                              )}
                            </div>

                            <div className="text-sm flex items-start">
                              {product.isPreOrder ? (
                                <span className="text-purple-600 font-medium flex items-center">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                  Pre-Order Available
                                </span>
                              ) : (product.stock ?? 0) > 0 ? (
                                <span className="text-green-600 font-medium flex items-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                  In Stock
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium flex items-center">
                                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                  Out of Stock
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className={`p-3 sm:p-4 pt-0`}>
                          <Button
                            className={`w-full h-11 font-medium transition-all duration-300 hover:shadow-md transform ${
                              buttonState === "loading"
                                ? "bg-blue-400 cursor-not-allowed scale-95"
                                : buttonState === "success"
                                  ? "bg-green-500 hover:bg-green-600 scale-105"
                                  : product.isPreOrder
                                    ? "bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 hover:scale-105 active:scale-95"
                                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105 active:scale-95"
                            }`}
                            disabled={((product.stock ?? 0) <= 0 && !product.isPreOrder) || buttonState !== "idle"}
                            onClick={() => addToCart(product)}
                            aria-label={`Add ${product.name} to cart`}
                          >
                            {buttonState === "loading" ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                Adding...
                              </>
                            ) : buttonState === "success" ? (
                              <>
                                <Check className="h-4 w-4 mr-2 animate-bounce" />
                                Added!
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                {product.isPreOrder
                                  ? "Pre-Order Now"
                                  : (product.stock ?? 0) > 0
                                    ? "Add to Cart"
                                    : "Notify When Available"}
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        onAddToCart={async (product) => {
          await addItemWithAnimation({
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            category: product.category,
            inStock: product.inStock,
          })
        }}
        onWishlistToggle={(product) => handleWishlistToggle(product, { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent)}
        isInWishlist={quickViewProduct ? isInWishlist(quickViewProduct.id) : false}
      />
    </>
  )
}

function ProductsFallback({ activeCategorySlug, activeSearch }: { activeCategorySlug: string | null, activeSearch: string | null }) {
  const content = getCategoryContent(activeCategorySlug, activeSearch ?? undefined)
  return (
    <>
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl md:text-4xl font-bold mb-4 leading-tight">{content.title}</h1>
            <Skeleton className="h-6 w-3/4 bg-white/20" />
            <div className="flex flex-wrap gap-2 mt-6">
              <Skeleton className="h-6 w-24 rounded-full bg-white/20" />
              <Skeleton className="h-6 w-32 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </section>
      <section className="py-8 bg-gray-50 border-b">
        <div className="container mx-auto px-4">
           <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start lg:justify-between">
             <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full max-w-md mx-auto lg:max-w-none lg:mx-0 items-center sm:items-stretch">
               <Skeleton className="h-10 w-full max-w-md" />
               <Skeleton className="h-10 w-32" />
               <Skeleton className="h-10 w-48" />
             </div>
           </div>
        </div>
      </section>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <ProductGridSkeleton count={12} />
        </div>
      </section>
    </>
  )
}

export default function ProductsPageClient(props: ProductsPageClientProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Suspense fallback={<ProductsFallback activeCategorySlug={props.activeCategorySlug} activeSearch={props.activeSearch} />}>
        <ProductsContent {...props} />
      </Suspense>
      <Footer />
    </div>
  )
}

