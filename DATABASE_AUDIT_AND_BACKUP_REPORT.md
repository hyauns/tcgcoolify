# Database Audit and Backup Report
**Project:** TCG Lore
**Database System:** Neon PostgreSQL

## 1. Executive Summary
A comprehensive read-only audit of the Neon PostgreSQL database was successfully performed. The database is securely connected via a connection-pooling URL from the local environment. A rich, relational e-commerce schema was found, primarily centered around a massive catalog of ~79,000 products. Backup instructions have been prepared, though the `pg_dump` binary was not available locally to execute them natively. No data or schemas were altered.

## 2. Connection Information
- **Host Domain:** `ep-old-night-amnklcih-pooler.c-5.us-east-1.aws.neon.tech`
- **Database Name:** `neondb`
- **Schema Name:** `public`
- **SSL Mode:** `require`
- **Connection Type:** Pooled Connection
- **User:** `neondb_owner`

## 3. Schemas Found
- `information_schema`
- `pg_catalog`
- `pg_toast`
- `public`

## 4. Tables, Row Counts, and Sizes
The database contains 28 user-defined tables in the `public` schema.

| Table Name | Estimated Rows | Table Size | Total Size (incl. Indexes) |
|---|---|---|---|
| `products` | 79,021 | 69 MB | 82 MB |
| `orders` | 7 | 24 kB | 144 kB |
| `payment_transactions` | 7 | 8 kB | 144 kB |
| `users` | 3 | 8 kB | 112 kB |
| `shopping_carts` | 40 | 8 kB | 104 kB |
| `payment_methods` | 7 | 8 kB | 96 kB |
| `product_reviews` | 3 | 8 kB | 80 kB |
| `product_categories` | 8 | 8 kB | 80 kB |
| `order_items` | 9 | 8 kB | 64 kB |
| `customers` | 11 | 8 kB | 56 kB |
| `shipping_addresses` | 7 | 8 kB | 48 kB |
| `billing_addresses` | 7 | 8 kB | 48 kB |
| `feed_configurations` | 7 | 8 kB | 40 kB |
| `store_settings` | 4 | 8 kB | 32 kB |
| `site_settings` | 1 | 8 kB | 32 kB |
*(Empty auxiliary tables like `user_sessions`, `purchase_orders`, `security_incidents`, etc. skipped for brevity, their sizes range from 8kB to 40kB due to indexes).*

## 5. Primary Keys, Foreign Keys, and Indexes
The database exhibits an extremely robust relational integrity layout.
- **Primary Keys:** Every single table (28/28) correctly defines a Primary Key (`id` or `user_id`), often leveraging UUIDs or integer sequences.
- **Foreign Keys:** Over 30 explicitly defined foreign keys enforce strict integrity (e.g., `orders.customer_id -> customers.id`, `payment_transactions.payment_method_id -> payment_methods.id`, `order_items.product_id -> products.id`).
- **Indexes:** 48 custom B-Tree indexes exist. Aside from the PKEY constraints, heavy indexing exists on frequently queried columns (`products.slug`, `products.category`, `orders.customer_id`, `orders.status`).

## 6. Business Meaning of Tables
- **Product Catalog Structure:** `products` holds the core catalog including images (`image_url`), pricing (`price`), and inventory (`stock_quantity`). Preorders are natively supported (`is_pre_order`, `release_date`). `product_categories` manages taxonomy.
- **Order Structure:** Orders are divided into `orders` (top-level summary, shipping data, fulfillment status) and `order_items` (line-item details linking to `products`).
- **Admin/Auth Structure:** Handled by `users` (credentials, role tracking, lockout limits), `customers` (ecommerce profiles linked to users), and `user_sessions`. 
- **Feed/GMC Structure:** `feed_configurations` manages Google Merchant Center feeds, tracking category slugs, exclusions, and active statuses.
- **Integration Tables:** Include `payment_transactions` and `payment_methods` for secure gateway management, and `payment_audit_logs` for robust security compliance.

## 7. Redacted Sample Data Summary
- **Users Table:** Contains `[REDACTED]` passwords and verification tokens. Emails are securely collected (`a***@example.com`).
- **Payment Methods:** Holds tokenized card hashes, storing only `last4` safely along with `card_brand`.
- **Products:** Contains fully formed trading card entries. e.g. `title`, `slug`, `price: 120.00`, `image_url`.

## 8. Data Quality Observations and Risks
- **Data Quality:** Excellent. Standard naming conventions, normalized data types (e.g., numeric for prices, timestamp with time zone). 
- **Risks:** 
  - The `products` table is becoming large (79,000 rows). While properly indexed, queries doing text search (`ILIKE`) without limit optimizations or pagination may strain memory.
  - No orphaned rows or missing Primary Keys were identified. All tables conform to standard ORM best practices.

## 9. Backup Operations
*Note: Due to `pg_dump` not being available in the host environment terminal, physical backups could not be run locally. You MUST execute these commands on a machine with `pg_dump` installed.*

**Commands to run:**
```bash
# Create directory
mkdir -p ./db_backups/2026-05-04_12-00-00

# Full Custom Format (Recommended for restore)
pg_dump "postgresql://neondb_owner:[MASKED]@ep-old-night-amnklcih-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="./db_backups/2026-05-04_12-00-00/full_backup.dump"

# Schema Only
pg_dump "postgresql://neondb_owner:[MASKED]@ep-old-night-amnklcih-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  --schema-only \
  --no-owner \
  --no-acl \
  --file="./db_backups/2026-05-04_12-00-00/schema_only.sql"

# Compression & Checksum
gzip -k ./db_backups/2026-05-04_12-00-00/*.sql
sha256sum ./db_backups/2026-05-04_12-00-00/* > ./db_backups/2026-05-04_12-00-00/SHA256SUMS.txt
```

## 10. Restore Instructions
**WARNING: Do not restore over the production database. Restore to a newly provisioned Neon instance first to verify integrity.**

```bash
# Assuming $RESTORE_DATABASE_URL points to the new blank database
pg_restore \
  --dbname="$RESTORE_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "./db_backups/2026-05-04_12-00-00/full_backup.dump"
```
