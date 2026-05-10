# Google Search Console 404 & Indexing Fix Report

## Audit of Known GSC URLs

| URL | GSC Issue | Current HTTP Status | Final URL | Exists in DB? | In sitemap? | In feed? | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/products/order-of-chaos---booster-box-1st-edition` | Soft 404 | 301 Redirect | `/products/order-of-chaos-booster-box-1st-edition` | Yes | Yes (cleaned) | Yes (cleaned) | 301 to cleaned slug |
| `/products/gizmoduck---suited-up` | Soft 404 | 301 Redirect | `/products/gizmoduck-suited-up` | Yes | Yes (cleaned) | Yes (cleaned) | 301 to cleaned slug |
| `/products/avacyn-restored---intro-pack---bound-by-strength` | Soft 404 | 301 Redirect | `/products/avacyn-restored-intro-pack-bound-by-strength` | Yes | Yes (cleaned) | Yes (cleaned) | 301 to cleaned slug |
| `/products/secret-lair-drop-extra-life-2020---traditional-foil-edition` | Soft 404 | 301 Redirect | `/products/secret-lair-drop-extra-life-2020-traditional-foil-edition` | Yes | Yes (cleaned) | Yes (cleaned) | 301 to cleaned slug |
| `/products/sanctuary-of-aria--florian-rotwood-harbinger-bottom-left` | Crawled - not indexed | 301 Redirect | `/products/sanctuary-of-aria-florian-rotwood-harbinger-bottom-left` | Yes | Yes (cleaned) | Yes (cleaned) | 301 to cleaned slug |
| `/products/sanctuary-of-aria--florian-rotwood-harbinger-top-left` | Crawled - not indexed | 301 Redirect | `/products/sanctuary-of-aria-florian-rotwood-harbinger-top-left` | Yes | Yes (cleaned) | Yes (cleaned) | 301 to cleaned slug |
| `/products/the-everflowing-well-extended-art` | Crawled - not indexed | 200 OK | `/products/the-everflowing-well-extended-art` | Yes | Yes | Yes | Keep indexable |
| `/product/*` (various old URLs) | Not Found (404) | 301 Redirect | `/products/*` | N/A | No | No | 301 to new `/products/` |

---

## Phase 3: Soft 404 Resolutions
All of the identified Soft 404s were triggered by an old slug generator that produced multiple hyphens (`---`). Because Next.js uses an exact `===` check against a cleaner generated slug (which compresses `---` to `-`), these products were throwing `404 Not Found` locally, but were likely throwing `Soft 404` previously because they matched partially or the UI was returning 200 without content.
- **Fix Applied**: A global middleware rule has been deployed. Any request to `/products/*` that contains multiple hyphens (`--`) will now permanently `301 Redirect` to the cleaned canonical slug (single hyphens).
- Since these products still exist and are active in the catalog, this properly restores their equity and resolves the Soft 404 by directing Google to the real 200 OK page.

---

## Phase 4: Crawled - Currently Not Indexed
1. **`sanctuary-of-aria--florian-rotwood-harbinger-bottom-left`**
   - **Decision**: Keep Indexable
   - **Reason**: Flesh and Blood / Lorcana split cards are distinct product variants with unique inventory, prices, and visual representation (Bottom Left vs Top Left). The old URL had a double hyphen (`--`). The new middleware will 301 redirect it to the clean canonical URL, which contains proper Product JSON-LD structured data.
2. **`sanctuary-of-aria--florian-rotwood-harbinger-top-left`**
   - **Decision**: Keep Indexable
   - **Reason**: Same as above. Distinct product SKU. Middleware fixes the hyphenation error.
3. **`the-everflowing-well-extended-art`**
   - **Decision**: Keep Indexable
   - **Reason**: Standard vs Extended Art cards are legitimate variants in TCGs. They have separate pricing and imagery. The canonical tag points to itself. Google simply hadn't indexed it yet due to crawl budget limits.

*(No products needed to be canonicalized away or NoIndexed, as they are all legitimate, distinct entries in the database).*
