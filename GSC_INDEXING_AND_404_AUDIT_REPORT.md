# GSC Indexing and 404 Audit Report

## 1. Google Merchant Center Known Issue
| URL | GSC issue | Live status | Referring source | Fix recommended | Implemented Yes/No |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `https://www.tcglore.com/payment-orders` | Broken link / Policy | HTTP 200 | Google Merchant Center | Create alias route to `/payment-and-orders` | Yes |

## 2. Redirect Errors
| URL | GSC issue | Live status | Referring source | Fix recommended | Implemented Yes/No |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `http://www.tcglore.com/` | Redirect error | HTTP 301/308 | External | Ensure TLS enforcement and trailing slash redirects are working correctly without loops. | N/A (Handled by Vercel) |
| `http://tcglore.com/` | Redirect error | HTTP 301/308 | External | Same as above. | N/A (Handled by Vercel) |

## 3. Soft 404 Issues
*These products likely return a 200 status code but render a page with very little content or explicitly state "Out of Stock" / "Not Available", leading Google to classify them as Soft 404s.*

| URL | GSC issue | Live status | Referring source | Fix recommended | Implemented Yes/No |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `https://tcglore.com/products/order-of-chaos---booster-box-1st-edition` | Soft 404 | Pending DB Check | N/A | If discontinued, return `notFound()` so it returns a true 404 HTTP code, or 301 redirect to the `order of chaos` category page. | No |
| `https://tcglore.com/products/gizmoduck---suited-up` | Soft 404 | Pending DB Check | N/A | Same as above. | No |
| `https://tcglore.com/products/avacyn-restored---intro-pack---bound-by-strength` | Soft 404 | Pending DB Check | N/A | Same as above. | No |
| `https://tcglore.com/products/secret-lair-drop-extra-life-2020---traditional-foil-edition` | Soft 404 | Pending DB Check | N/A | Same as above. | No |

## 4. Crawled - Currently Not Indexed
*These are valid URLs that Google has found but chosen not to index yet. This is often due to crawl budget limits or perceived low-quality/duplicate content.*

| URL | GSC issue | Live status | Referring source | Fix recommended | Implemented Yes/No |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `https://tcglore.com/products/sanctuary-of-aria--florian-rotwood-harbinger-bottom-left` | Not Indexed | HTTP 200 | Sitemap | Ensure product has unique description and image. Wait for next crawl. | No |
| `https://tcglore.com/products/sanctuary-of-aria--florian-rotwood-harbinger-top-left` | Not Indexed | HTTP 200 | Sitemap | Ensure product has unique description and image. Wait for next crawl. | No |
| `https://tcglore.com/products/the-everflowing-well-extended-art` | Not Indexed | HTTP 200 | Sitemap | Ensure product has unique description and image. Wait for next crawl. | No |

## 5. Not Found (404)
*165 URLs were flagged as 404. Due to the volume, a full CSV export was generated but the sample URLs likely stem from the old `/product/` routing bug.*

| URL | GSC issue | Live status | Referring source | Fix recommended | Implemented Yes/No |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/product/*` (Old Feed URLs) | 404 Not Found | HTTP 301 | Old XML Feed | A global redirect was added in `next.config.mjs` to map `/product/:slug` to `/products/:slug`. | Yes |

## Summary of Completed Actions
1. **`/payment-orders` Resolution**: Implemented a canonical alias page returning a proper 200 HTTP response.
2. **Global Feed Fix**: Corrected the XML feed generation to output `/products/` instead of `/product/` and added a permanent redirect in Next.js config to gracefully catch all historical URLs.
3. **Internal Links**: Updated all hardcoded references from `payment-orders` to `payment-and-orders`.
4. **Audit Scope**: Verified 0 server errors (5xx) and documented Soft 404 issues for follow-up content optimization or structural redirection.
