import { getSql } from "@/lib/db-client"
import { ProductsDataTable } from "./page-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Products | Inventory Management",
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const sql = getSql()

  // Parse pagination
  const page = typeof searchParams.page === "string" ? parseInt(searchParams.page, 10) : 1
  const currentPage = isNaN(page) || page < 1 ? 1 : page
  const ITEMS_PER_PAGE = 50
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

  // Parse search query
  const searchQuery = typeof searchParams.q === "string" ? searchParams.q : ""
  const searchPattern = searchQuery ? `%${searchQuery}%` : "%"

  // Fetch Total Count
  // If search query is present, count where name ILIKE. Otherwise, count all.
  let totalCountRes;
  if (searchQuery) {
    totalCountRes = await sql`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE name ILIKE ${searchPattern}
    `
  } else {
    totalCountRes = await sql`SELECT COUNT(*) as count FROM products`
  }
  
  const totalCount = parseInt(totalCountRes[0].count, 10)

  // Fetch Products
  let products;
  if (searchQuery) {
    products = await sql`
      SELECT id, name, category, price, original_price, cost, stock_quantity, 
             is_active, is_featured, is_pre_order, image_url, upc, description, release_date
      FROM products 
      WHERE name ILIKE ${searchPattern}
      ORDER BY id DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `
  } else {
    products = await sql`
      SELECT id, name, category, price, original_price, cost, stock_quantity, 
             is_active, is_featured, is_pre_order, image_url, upc, description, release_date
      FROM products 
      ORDER BY id DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `
  }

  return (
    <ProductsDataTable
      products={products}
      totalCount={totalCount}
      currentPage={currentPage}
      searchQuery={searchQuery}
    />
  )
}

