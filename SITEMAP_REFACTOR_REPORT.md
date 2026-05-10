# Sitemap Refactor Report

## 1. Files Changed
- **Deleted**: `app/sitemap.ts` (Removed the previous massive single-file generation).
- **Created**: `app/sitemap.xml/route.ts` (Generates the `<sitemapindex>`).
- **Created**: `app/sitemaps/core.xml/route.ts` (Static URLs, policies, etc.).
- **Created**: `app/sitemaps/categories.xml/route.ts` (Category/collection URLs).
- **Created**: `app/sitemaps/[file]/route.ts` (Dynamic handler for `products-*.xml` files with pagination).
- **Modified**: `lib/repositories/sitemap.ts` (Cleaned up the `getSitemapProductsBatch` logic to work perfectly with the new dynamic route handler).

## 2. New Sitemap Structure
The root `/sitemap.xml` has been refactored from a `<urlset>` into a `<sitemapindex>` that splits the crawl load across smaller child sitemaps:
- `/sitemaps/core.xml`
- `/sitemaps/categories.xml`
- `/sitemaps/products-1.xml`
- `/sitemaps/products-2.xml`
- ...

## 3. Product Sitemap Page Size
The chunk size has been set to **20,000 URLs** per product sitemap page, adhering to the limit and keeping server-side JSON/XML overhead extremely low per request.

## 4. Total Product Count
Calculated dynamically at request time via `getTotalActiveProductsCount()` (currently around ~79,000 products based on your data).

## 5. Number of Product Sitemap Files
Dynamically derived by `Math.ceil(totalProducts / 20000)`. For ~79,000 products, this generates **4 product child sitemaps** (`products-1.xml` through `products-4.xml`).

## 6. Cache / Revalidate Settings
- **Route handlers cache**: Configured with `export const revalidate = 86400` (24 hours).
- **HTTP Cache-Control**: `public, s-maxage=86400, stale-while-revalidate=604800` ensures edge caching prevents database thrashing from concurrent Googlebot requests.

## 7. robots.txt Sitemap URL
`app/robots.ts` correctly points to the sitemap index: `Sitemap: https://www.tcglore.com/sitemap.xml`. No changes were needed here.

## 8. Confirmation: No `/product/` URLs Remain
The dynamic routing logic explicitly generates `<loc>${siteUrl}/products/${slug}</loc>`, guaranteeing that Google is only fed the new, correct canonical `/products/` URL paths.

## 9. Confirmation: `/payment-orders` is Handled
Yes, `/payment-orders` has been included in `app/sitemaps/core.xml/route.ts` with a 200 HTTP response, mapping directly to your alias route logic from the previous fix.

## 10. Production Validation (Curl Proof)
During local validation (mimicking production compilation):
```bash
$ curl -I http://localhost:3005/sitemap.xml
HTTP/1.1 200 OK
Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800
Content-Type: application/xml; charset=utf-8

$ curl -s http://localhost:3005/sitemaps/products-1.xml | grep -c "<url>"
20000
```
*(All generated child sitemaps properly output the required `<urlset>` and return 200 OK)*.

## 11. Remaining Warnings
- The production database uses Neon. Due to the chunking implementation via `OFFSET` and `LIMIT`, fetching page 4 (offset 60000) might take slightly longer than page 1. Since the data is cached for 24 hours at the edge, this is not an active threat, but something to monitor if the catalog grows beyond 200,000+ products (in which case, keyset pagination `WHERE id > last_id` should be implemented).

## 12. Recommendation: Search Console Resubmission
**Yes.** Because the format of `https://www.tcglore.com/sitemap.xml` changed fundamentally from a `<urlset>` containing 50k URLs to a `<sitemapindex>` pointing to child files, you should manually resubmit `https://www.tcglore.com/sitemap.xml` in Google Search Console immediately after deployment. This will force Google to drop the old cached 404s/bloated files and adopt the newly structured index. You do not need to submit the child sitemaps manually.
