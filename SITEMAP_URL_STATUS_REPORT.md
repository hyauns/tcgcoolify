# Sitemap URL Status Report
*Validation performed against Next.js local server simulating production routes.*

| URL | Source sitemap | HTTP status | Final URL | Result |
| :--- | :--- | :--- | :--- | :--- |
| `http://localhost:3005/payment-orders` | `core.xml` | 200 | Same | OK - Alias works |
| `http://localhost:3005/payment-and-orders` | `core.xml` | 200 | Same | OK |
| `http://localhost:3005/payment` | `core.xml` | 200 | Same | OK |
| `http://localhost:3005/products?category=magic-the-gathering` | `categories.xml` | 200 | Same | OK |
| `http://localhost:3005/products?category=pokemon` | `categories.xml` | 200 | Same | OK |
| `http://localhost:3005/products?category=yu-gi-oh` | `categories.xml` | 200 | Same | OK |
| `http://localhost:3005/products/the-everflowing-well-extended-art` | `products-1.xml` | 200 | Same | OK |
| `http://localhost:3005/products/sanctuary-of-aria--florian-rotwood-harbinger-top-left` | `products-1.xml` | 200 | Same | OK |
| `http://localhost:3005/product/old-slug-example` | Not in sitemap | 301 | `/products/old-slug-example` | OK - Redirect functions as expected |

**Result Summary**: All sitemap URLs sampled strictly return `200 OK`. Legacy paths (`/product/`) properly issue `301 Permanent Redirects` and are fully omitted from the `<urlset>`.
