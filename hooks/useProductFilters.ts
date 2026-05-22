"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { type FilterOptions, type FilterAggregations, defaultAggregations } from "@/lib/product-filters"
import type { Product } from "@/lib/product-filters"

export function useProductFilters(
  products?: Product[],
  initialCategory?: string,
  serverAggregations?: FilterAggregations,
  serverTotalCount?: number,
  serverTotalPages?: number,
  serverPage?: number
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const previousUrlRef = useRef<string>("")
  const isInitializedRef = useRef(false)

  const [filters, setFilters] = useState<FilterOptions>(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")

    // Categories: prefer explicit URL param; fall back to server-passed activeCategory
    const urlCategories = params.get("categories")
      ? params.get("categories")!.split(",")
      : undefined
    const seededCategories = urlCategories ?? (initialCategory ? [initialCategory] : undefined)

    return {
      searchTerm: params.get("search") || undefined,
      priceMin: params.get("priceMin") ? Number(params.get("priceMin")) : undefined,
      priceMax: params.get("priceMax") ? Number(params.get("priceMax")) : undefined,
      inStock: params.get("inStock") === "true" ? true : undefined,
      outOfStock: params.get("outOfStock") === "true" ? true : undefined,
      isPreOrder: params.get("isPreOrder") === "true" ? true : undefined,
      productType: params.get("productType") || undefined,
      rarity: params.get("rarity") || undefined,
      categories: seededCategories,
      sortBy: (params.get("sortBy") as FilterOptions["sortBy"]) || undefined,
    }
  })

  const [currentPage, setCurrentPage] = useState(serverPage || 1)

  // Sync currentPage with serverPage if the server overrides it (e.g., page param out of bounds or back navigation)
  useEffect(() => {
    if (serverPage !== undefined) {
      setCurrentPage(serverPage)
    }
  }, [serverPage])

  useEffect(() => {
    // Skip initial render to prevent conflicts with URL-based initialization
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      return
    }

    const params = new URLSearchParams()

    // ── IMPORTANT: preserve server-owned params that this hook doesn't manage ──
    const currentParams = new URLSearchParams(window.location.search)
    const categoryParam = currentParams.get("category")
    if (categoryParam) params.set("category", categoryParam)

    if (filters.searchTerm) params.set("search", filters.searchTerm)
    if (filters.priceMin !== undefined) params.set("priceMin", filters.priceMin.toString())
    if (filters.priceMax !== undefined) params.set("priceMax", filters.priceMax.toString())
    if (filters.inStock) params.set("inStock", "true")
    if (filters.outOfStock) params.set("outOfStock", "true")
    if (filters.isPreOrder) params.set("isPreOrder", "true")
    if (filters.productType) params.set("productType", filters.productType)
    if (filters.rarity) params.set("rarity", filters.rarity)
    
    if (filters.sortBy) params.set("sortBy", filters.sortBy)
    if (currentPage > 1) params.set("page", currentPage.toString())

    const currentPath = window.location.pathname
    const newUrl = params.toString() ? `${currentPath}?${params.toString()}` : currentPath

    // Only update URL if it has actually changed
    if (newUrl !== previousUrlRef.current) {
      previousUrlRef.current = newUrl
      router.replace(newUrl, { scroll: false })
    }
  }, [filters, currentPage, router])

  const setFilter = useCallback((key: keyof FilterOptions, value: any) => {
    setFilters((prev) => {
      const newFilters = { ...prev }

      if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
        delete newFilters[key]
      } else {
        newFilters[key] = value
      }

      return newFilters
    })

    // Reset to first page when filters change
    if (key !== "sortBy") {
      setCurrentPage(1)
    }
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setCurrentPage(1)
  }, [])

  const sortBy = useCallback(
    (option: FilterOptions["sortBy"]) => {
      setFilter("sortBy", option)
    },
    [setFilter],
  )

  const setPage = useCallback(
    (page: number) => {
      const maxPage = serverTotalPages || 1;
      setCurrentPage(Math.max(1, Math.min(page, maxPage)))
    },
    [serverTotalPages],
  )

  const setPriceRange = useCallback((min?: number, max?: number) => {
    setFilters((prev) => ({
      ...prev,
      priceMin: min,
      priceMax: max === Number.POSITIVE_INFINITY ? undefined : max,
    }))
    setCurrentPage(1)
  }, [])

  const toggleCategory = useCallback((category: string) => {
    setFilters((prev) => {
      const currentCategories = prev.categories || []
      const newCategories = currentCategories.includes(category)
        ? currentCategories.filter((c) => c !== category)
        : [...currentCategories, category]

      return {
        ...prev,
        categories: newCategories.length > 0 ? newCategories : undefined,
      }
    })
    setCurrentPage(1)
  }, [])

  return {
    // Data
    products: products || [],
    totalCount: serverTotalCount || 0,
    serverAggregations: serverAggregations || defaultAggregations(),

    // Filter state
    filters,
    setFilter,
    clearFilters,
    sortBy,
    setPriceRange,
    toggleCategory,

    // Pagination
    currentPage,
    totalPages: serverTotalPages || 1,
    setPage,

    // Computed values
    hasActiveFilters: Object.keys(filters).length > 0,
    isLoading: false,
  }
}
