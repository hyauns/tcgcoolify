# Sitemap and Feed URL Consistency Report

## 1. Sitemap Validation
- **Structure**: The root `/sitemap.xml` correctly acts as a `<sitemapindex>` pointing to child sitemaps (e.g., `core.xml`, `categories.xml`, `products-1.xml`).
- **Product URLs**: All child sitemaps representing products exclusively use the updated `/products/[slug]` schema. No legacy `/product/` URLs are present.
- **Alias Resolution**: The `core.xml` correctly indexes the `/payment-and-orders` and the new HTTP 200 `/payment-orders` alias, while excluding broken endpoints.
- **Soft 404 Pre-emption**: The global middleware now catches and 301 redirects any incoming request with legacy triple hyphens (`---`) directly to the newly cleaned and indexed canonical slug (`-`).

## 2. Feed Validation
- **URL Schema**: The Merchant Center feed route (`/api/feeds/[uuid]/route.ts`) now strictly imports and utilizes the frontend's canonical `generateSlug` utility. This ensures 100% parity between Google Merchant `<g:link>` URLs, Sitemap `<loc>` URLs, and the active frontend UI.
- **Legacy URL Removal**: The feed no longer generates `<g:link>` nodes pointing to `/product/[slug]`. Everything uses `/products/[slug]`.
- **Availability Mapping**: GMC `<g:availability>` strictly binds to `stock_quantity` and `is_pre_order`. Pre-order items now correctly attach the mandatory `<g:availability_date>` node to prevent GMC rejections.

## 3. Conclusions
- The XML structural health for both Google Search Console and Google Merchant Center is fully restored.
- No invalid endpoints will be fed to Google going forward.
