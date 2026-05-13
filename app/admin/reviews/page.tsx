import { getSql } from "@/lib/db-client"
import { ReviewsDataTable } from "./page-client"
import { Metadata } from "next"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Admin Reviews | Moderation Board",
}

export default async function AdminReviewsPage({
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
  let totalCountRes;
  if (searchQuery) {
    totalCountRes = await sql`
      SELECT COUNT(*) as count 
      FROM product_reviews pr
      LEFT JOIN products p ON p.id = pr.product_id
      LEFT JOIN customers c ON c.id = pr.customer_id
      LEFT JOIN users u ON u.user_id = c.user_id
      WHERE pr.title ILIKE ${searchPattern} 
         OR pr.review_text ILIKE ${searchPattern}
         OR p.name ILIKE ${searchPattern}
    `
  } else {
    totalCountRes = await sql`SELECT COUNT(*) as count FROM product_reviews`
  }
  
  const totalCount = parseInt(totalCountRes[0].count, 10)

  // Fetch Reviews
  let reviews;
  if (searchQuery) {
    reviews = await sql`
      SELECT pr.*, 
             p.name as product_name, p.slug as product_slug,
             COALESCE(u.first_name || ' ' || LEFT(u.last_name, 1) || '.', c.first_name || ' ' || LEFT(c.last_name, 1) || '.', c.first_name, 'Anonymous') AS reviewer_name
      FROM product_reviews pr
      LEFT JOIN products p ON p.id = pr.product_id
      LEFT JOIN customers c ON c.id = pr.customer_id
      LEFT JOIN users u ON u.user_id = c.user_id
      WHERE pr.title ILIKE ${searchPattern} 
         OR pr.review_text ILIKE ${searchPattern}
         OR p.name ILIKE ${searchPattern}
      ORDER BY pr.is_approved ASC, pr.created_at DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `
  } else {
    reviews = await sql`
      SELECT pr.*, 
             p.name as product_name, p.slug as product_slug,
             COALESCE(u.first_name || ' ' || LEFT(u.last_name, 1) || '.', c.first_name || ' ' || LEFT(c.last_name, 1) || '.', c.first_name, 'Anonymous') AS reviewer_name
      FROM product_reviews pr
      LEFT JOIN products p ON p.id = pr.product_id
      LEFT JOIN customers c ON c.id = pr.customer_id
      LEFT JOIN users u ON u.user_id = c.user_id
      ORDER BY pr.is_approved ASC, pr.created_at DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Reviews Moderation</h1>
        <p className="text-muted-foreground mt-2">Manage customer reviews and perform bulk imports.</p>
      </div>
      
      <ReviewsDataTable 
        initialReviews={reviews as any[]}
        totalCount={totalCount}
        currentPage={currentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        searchQuery={searchQuery}
      />
    </div>
  )
}

