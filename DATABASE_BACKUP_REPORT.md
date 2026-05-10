# Database Backup and Verification Report

**Project:** TCG Lore
**Backup Date:** 2026-05-04 12:15:24 (Local)
**Database System:** Neon PostgreSQL
**Database Name:** neondb
**Schema:** public
**Source Connection:** `postgresql://neondb_owner:[MASKED]@ep-old-night-amnklcih.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require`
**pg_dump Version:** 17.4 (matching Neon server version 17.8)

## 1. Backup Summary

A complete set of local backups was successfully generated and compressed. The connection to the database was validated to ensure structural integrity and correct read configurations before executing `pg_dump`. 

- **Backup Directory:** `.\db_backups\2026-05-04_12-15-24`
- **Custom-Format Backup:** Successfully created.
- **Plain SQL Backup:** Successfully created.
- **Schema-Only & Data-Only Backups:** Successfully created.

## 2. Backup Files and Sizes

| File Name | Size (MB) | Status |
|-----------|-----------|--------|
| `full_backup.dump` | 7.25 | Completed |
| `full_backup.sql` | 36.09 | Completed |
| `full_backup.sql.zip` | 7.16 | Completed |
| `data_only.sql` | 36.05 | Completed |
| `data_only.sql.zip` | 7.16 | Completed |
| `schema_only.sql` | 0.05 | Completed |
| `schema_only.sql.zip` | 0.01 | Completed |
| `SHA256SUMS.txt` | < 0.01 | Completed |

## 3. SHA256 Checksums

Below are the cryptographic checksums ensuring file integrity:
```
2F2C448A73FBECC437E4317DDC69918A37E70D612398614804D95245883642B4  data_only.sql
A9E8C9D451A1C1EE51505D1DDC323FF8BA64FECB43DB53D1020593B4C5F92319  data_only.sql.zip
6A13EAE6561EF77B2FB9EB5F0DB2A087D9B5EDDB58802857284557EBE46C29AE  full_backup.dump
ECF70BA9B3D8A23E22B7A21913B7FDD9C414EAD73DE2C2A515891AA39DBF9AE8  full_backup.sql
CCD50F1669E55169C0FC73EA00338145EED9C151813E07E1B16392BE00E9E7F4  full_backup.sql.zip
9502E4EA6A36CACBC127214A5A0817DD3C4570A65901784FDCBF70A610A8453F  schema_only.sql
0BB235B09F428ED0664A696A04E2F5F0472AD2D72B7C1BE61FF9AF959B430EBB  schema_only.sql.zip
```

## 4. Verification Results

A strict verification sequence was run against the `full_backup.dump` and `.sql` artifacts locally, without modifying or restoring over production.

- `pg_restore --list` success: **Yes**
- Important tables found in dump: **Yes (6 of 6 critical identified tables)**
- `products` table included: **Yes**
- `orders`, `customers`, `users`, `feed_configurations` included: **Yes**
- Data footprint confirmed: The SQL backup contains proper `COPY public.products` and schema definitions.

## 5. Restore Instructions

**WARNING: Backup files are stored locally only. Do NOT commit the `db_backups/` directory to git (it has been added to `.gitignore`). Never restore over the production database unless explicitly approved.**

To perform a restore to a new test database (`restored_tcglore_db`), execute the following:

**Custom-Format Restore (Recommended):**
```bash
createdb restored_tcglore_db

pg_restore \
  --dbname="$RESTORE_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "./db_backups/2026-05-04_12-15-24/full_backup.dump"
```

**Plain SQL Restore (Alternative):**
```bash
psql "$RESTORE_DATABASE_URL" < "./db_backups/2026-05-04_12-15-24/full_backup.sql"
```
