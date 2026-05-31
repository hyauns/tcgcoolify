-- scripts/11-create-site-settings.sql

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    hero_title VARCHAR(255) DEFAULT 'Premium Trading Cards & Collectibles Store',
    hero_subtitle TEXT DEFAULT 'Discover Magic: The Gathering, Pokemon, and Yu-Gi-Oh! cards. Shop trading card games, sealed products, singles, and collectibles with clear availability, pre-order timing, and support details before checkout.',
    hero_image_url VARCHAR(500),
    logo_url VARCHAR(500),
    favicon_url VARCHAR(500),
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT,
    google_site_verification VARCHAR(255),
    google_ads_conversion_id VARCHAR(32),
    google_ads_conversion_label VARCHAR(128),
    social_facebook VARCHAR(255),
    social_instagram VARCHAR(255),
    social_pinterest VARCHAR(255),
    social_twitter VARCHAR(255),
    social_youtube VARCHAR(255),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one row can exist by adding a check constraint (id must be 1)
    CONSTRAINT site_settings_singleton_check CHECK (id = 1)
);

-- Insert the default row if it doesn't exist
INSERT INTO site_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
