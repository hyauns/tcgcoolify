-- scripts/16-add-google-ads-tracking.sql
-- Adds Google Ads conversion tracking fields to the site_settings singleton.
-- Safe to run repeatedly (IF NOT EXISTS) on an already-deployed database.

ALTER TABLE site_settings
    ADD COLUMN IF NOT EXISTS google_ads_conversion_id VARCHAR(32),
    ADD COLUMN IF NOT EXISTS google_ads_conversion_label VARCHAR(128);
