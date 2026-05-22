"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Image from "next/image"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Search, Edit } from "lucide-react"

// Types
type Product = any

interface ProductsClientProps {
  products: Product[]
  totalCount: number
  currentPage: number
  searchQuery: string
}

// We will import the sheet component dynamically or just render it inline
import { AdminProductEditSheet } from "./admin-product-edit-sheet"

export function ProductsDataTable({
  products,
  totalCount,
  currentPage,
  searchQuery,
}: ProductsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(searchQuery)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const ITEMS_PER_PAGE = 50
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    if (searchInput) {
      params.set("q", searchInput)
    } else {
      params.delete("q")
    }
    params.set("page", "1") // Reset to page 1 on search
    router.push(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount))
  }

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setIsSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products Inventory</h1>
      </div>

      <Card>
        <CardHeader className="py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search products by name..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-y">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Badges</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                          <ImageWithFallback
                            src={product.image_url || "/placeholder.svg"} fallbackSrc="/placeholder.png"
                            alt={product.name}
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium max-w-xs truncate" title={product.name}>
                          {product.name}
                        </div>
                        {product.upc && (
                          <div className="text-xs text-gray-400">UPC: {product.upc}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600">{product.category}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {formatCurrency(product.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={Number(product.stock_quantity) <= 0 ? "text-red-500 font-bold" : "text-green-600"}>
                          {product.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {product.is_active ? (
                            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Inactive</Badge>
                          )}
                          {product.is_featured && (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Featured</Badge>
                          )}
                          {product.is_pre_order && (
                            <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">Pre-order</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(product)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm font-medium mx-2">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminProductEditSheet
        product={editingProduct}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </div>
  )
}

