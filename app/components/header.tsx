"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  LogIn,
  UserPlus,
  Settings,
  LogOut,
  Package,
  X,
  Phone,
  Mail,
  Truck,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useAuth } from "@/lib/auth-context"
import { saveSearchQuery, getRecentSearches, getLiveSuggestions, type SearchResponse } from "@/lib/search"
import { useCategories } from "@/lib/category-context"
import { RarityBadge } from "@/app/components/rarity-badge"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"




export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchResponse>({ suggestions: [], products: [] })
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const router = useRouter()

  const { getCartCount, recentlyAddedItem } = useCart()
  const { getWishlistCount } = useWishlist()
  const { user, isAuthenticated, logout } = useAuth()
  const { categories } = useCategories()
  const [cartBounce, setCartBounce] = useState(false)

  const cartCount = getCartCount()
  const wishlistCount = getWishlistCount()

  useEffect(() => {
    setRecentSearches(getRecentSearches())
    // Pre-populate input from URL on mount (e.g. landing on /products?search=pokemon)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const urlSearch = urlParams.get("search") ?? urlParams.get("q") ?? ""
      if (urlSearch) setSearchQuery(urlSearch)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchQuery.trim().length <= 1) {
      setSuggestions({ suggestions: [], products: [] })
      setShowSuggestions(false)
      return
    }
    // 300ms debounce — prevents a DB call on every keystroke
    const timer = setTimeout(() => {
      getLiveSuggestions(searchQuery, 6).then((data) => {
        setSuggestions(data)
        setShowSuggestions(data.suggestions.length > 0 || data.products.length > 0)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearch = (query: string) => {
    if (!query.trim()) return

    saveSearchQuery(query)
    setRecentSearches(getRecentSearches())
    setSearchQuery("")
    setShowSuggestions(false)
    router.push(`/products?search=${encodeURIComponent(query)}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(searchQuery)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion)
  }

  useEffect(() => {
    if (recentlyAddedItem) {
      setCartBounce(true)
      const timer = setTimeout(() => {
        setCartBounce(false)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [recentlyAddedItem])

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const renderMegaDropdown = (isMobile = false) => {
    if (!showSuggestions || (!suggestions.suggestions.length && !suggestions.products.length && !recentSearches.length)) {
      return null
    }

    return (
      <div 
        className={`absolute top-full bg-white border border-gray-200 shadow-2xl mt-2 z-50 flex flex-col overflow-hidden
          ${isMobile 
            ? "left-0 right-0 w-full rounded-b-lg flex-col max-h-[80vh]" 
            : "left-1/2 -translate-x-1/2 w-[90vw] md:w-[650px] lg:w-[850px] rounded-xl flex-col sm:flex-row max-h-[85vh]"
          }
        `}
      >
        {/* Left Column: Suggestions & Recent */}
        <div className={`w-full ${isMobile ? 'border-b' : 'sm:w-[35%] sm:border-r'} border-gray-100 bg-gray-50/80 flex flex-col overflow-y-auto max-h-48 sm:max-h-full shrink-0`}>
          {suggestions.suggestions.length > 0 && (
            <div className="p-3 sm:p-4">
              <div className="text-[10px] sm:text-xs font-bold text-gray-400 mb-2 sm:mb-3 uppercase tracking-wider">Suggestions</div>
              {suggestions.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 sm:py-2.5 hover:bg-white hover:shadow-sm rounded-md text-sm transition-all flex items-center group mb-1"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <span className="font-medium text-gray-700 group-hover:text-blue-700">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {recentSearches.length > 0 && searchQuery.trim().length <= 1 && (
            <div className="p-3 sm:p-4 border-t border-gray-100">
              <div className="text-[10px] sm:text-xs font-bold text-gray-400 mb-2 sm:mb-3 uppercase tracking-wider">Recent Searches</div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 sm:py-2.5 hover:bg-white hover:shadow-sm rounded-md text-sm transition-all flex items-center group mb-1"
                  onClick={() => handleSuggestionClick(search)}
                >
                  <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-3 text-gray-400 group-hover:text-blue-500" />
                  <span className="text-gray-600">{search}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Top Products */}
        {suggestions.products.length > 0 && (
          <div className="w-full sm:flex-1 bg-white p-4 sm:p-6 overflow-y-auto">
            <div className="text-[10px] sm:text-xs font-bold text-gray-400 mb-3 sm:mb-4 uppercase tracking-wider">Top Products</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {suggestions.products.map(product => (
                <Link 
                  key={product.id} 
                  href={`/products/${product.slug}`} 
                  className="flex items-start space-x-3 p-2 sm:p-3 hover:bg-blue-50/50 rounded-xl transition-all border border-transparent hover:border-blue-100 group"
                  onClick={() => setShowSuggestions(false)}
                >
                  <div className="relative h-[4.5rem] sm:h-20 w-12 sm:w-16 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden group-hover:shadow-md transition-shadow">
                    <ImageWithFallback 
                      src={product.image} 
                      alt={product.name} 
                      fill 
                      sizes="(min-width: 640px) 64px, 48px"
                      className="object-contain p-1" 
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900 truncate group-hover:text-blue-700 transition-colors" title={product.name}>
                      {product.name}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-gray-500 truncate mt-0.5">{product.category}</p>
                    
                    <div className="flex items-center space-x-2 mt-1.5 sm:mt-2 flex-wrap gap-y-1">
                      <span className="font-bold text-sm sm:text-[15px] text-blue-600 bg-blue-50 px-2 py-0.5 sm:py-1 rounded-md leading-none">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.rarity && (
                        <div className="flex items-center hidden sm:flex">
                          <div className="origin-left scale-[0.70] -ml-1 h-4 flex items-center">
                            <RarityBadge rarity={product.rarity} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top Bar */}
      <div className="bg-blue-600 text-white text-sm py-2">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span>Free shipping on orders over $75</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">Remote Support: +1 (303) 668-3245</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex flex-col items-start gap-1">
              <Image 
                src="/logo.png" 
                alt="TCG Lore Logo" 
                width={120} 
                height={40} 
                className="h-10 w-auto object-contain"
                priority
              />
              <p className="text-[10px] text-gray-500 hidden sm:block uppercase tracking-wider font-semibold">
                Operated by A Toy Haulerz LLC
              </p>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search for cards, sets, or products..."
                className="pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length > 1) {
                    setShowSuggestions(true)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200)
                }}
              />

              {renderMegaDropdown(false)}
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Wishlist */}
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {wishlistCount}
                  </Badge>
                )}
                <span className="sr-only">Wishlist ({wishlistCount})</span>
              </Button>
            </Link>

            {/* Cart with Animation */}
            <Link href="/cart">
              <Button
                variant="ghost"
                size="icon"
                className={`relative transition-all duration-300 ${
                  cartBounce ? "animate-bounce scale-110" : ""
                } ${recentlyAddedItem ? "bg-green-50 hover:bg-green-100" : ""}`}
              >
                <ShoppingCart
                  className={`h-5 w-5 transition-colors duration-300 ${recentlyAddedItem ? "text-green-600" : ""}`}
                />
                {cartCount > 0 && (
                  <Badge
                    className={`absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs transition-all duration-300 ${
                      recentlyAddedItem ? "bg-green-500 scale-125" : ""
                    }`}
                  >
                    {cartCount}
                  </Badge>
                )}
                <span className="sr-only">Cart ({cartCount})</span>

                {recentlyAddedItem && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAuthenticated ? (
                  <>
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">
                        <Settings className="mr-2 h-4 w-4" />
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account?tab=orders">
                        <Package className="mr-2 h-4 w-4" />
                        Order History
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/auth/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/auth/register">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Account
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Enhanced Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-white text-lg font-bold">Menu</SheetTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeMobileMenu}
                        className="text-white hover:bg-white/20"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </SheetHeader>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    {/* Authentication Section */}
                    <div className="p-6 border-b bg-gray-50">
                      {isAuthenticated ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{user?.first_name} {user?.last_name}</p>
                              <p className="text-sm text-gray-600">{user?.email}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Link href="/account" onClick={closeMobileMenu}>
                              <Button variant="outline" size="sm" className="w-full bg-transparent">
                                <Settings className="h-4 w-4 mr-2" />
                                Account
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                logout()
                                closeMobileMenu()
                              }}
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Sign Out
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-gray-700 font-medium mb-3">Welcome to TCG Lore</p>
                          <div className="space-y-2">
                            <Link href="/auth/login" onClick={closeMobileMenu}>
                              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                <LogIn className="h-4 w-4 mr-2" />
                                Sign In
                              </Button>
                            </Link>
                            <Link href="/auth/register" onClick={closeMobileMenu}>
                              <Button variant="outline" className="w-full bg-transparent">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Create Account
                              </Button>
                            </Link>
                          </div>

                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="p-6 border-b">
                      <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Link href="/cart" onClick={closeMobileMenu}>
                          <Button variant="outline" size="sm" className="w-full relative bg-transparent">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Cart
                            {cartCount > 0 && (
                              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                {cartCount}
                              </Badge>
                            )}
                          </Button>
                        </Link>
                        <Link href="/wishlist" onClick={closeMobileMenu}>
                          <Button variant="outline" size="sm" className="w-full relative bg-transparent">
                            <Heart className="h-4 w-4 mr-2" />
                            Wishlist
                            {wishlistCount > 0 && (
                              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                {wishlistCount}
                              </Badge>
                            )}
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Shop Categories</h3>
                      <div className="space-y-2">
                        <Link
                          href="/products"
                          onClick={closeMobileMenu}
                          className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                        >
                          All Products
                        </Link>
                        {categories.map((category) => (
                          <Link
                            key={category.slug}
                            href={`/products?category=${encodeURIComponent(category.slug)}`}
                            onClick={closeMobileMenu}
                            className="block py-3 px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <a href="tel:+13036683245" className="text-sm text-gray-600">+1 (303) 668-3245</a>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <a href="mailto:cs@tcglore.com" className="text-sm text-gray-600">cs@tcglore.com</a>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Truck className="h-4 w-4" />
                        <span>Free shipping on orders $75+</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search - Always visible on mobile */}
        <div className="md:hidden border-t bg-gray-50">
          <div className="container mx-auto px-4 py-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search for cards, sets, or products..."
                className="pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length > 1) {
                    setShowSuggestions(true)
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200)
                }}
              />
              {renderMegaDropdown(true)}
            </form>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="hidden md:block border-t bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center space-x-8 py-3">
            <Link href="/products" className="text-sm font-medium hover:text-blue-600 transition-colors">
              All Products
            </Link>
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className="text-sm hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                {category.name}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className="text-sm hover:text-blue-600 transition-colors">More</DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.slice(6).map((category) => (
                  <DropdownMenuItem key={category.slug} asChild>
                    <Link href={`/products?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </header>
  )
}

