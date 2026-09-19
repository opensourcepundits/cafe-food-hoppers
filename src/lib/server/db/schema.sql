-- Hybrid relational + JSONB venue directory.
-- Query-heavy filters stay relational; fluid attributes live in JSONB.

CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    district TEXT NOT NULL, -- e.g., 'Grand Baie', 'Ebène', 'Tamarin', 'Port Louis', 'Moka'
    lat NUMERIC(9, 6),
    lng NUMERIC(9, 6),

    -- Monetization: Sponsored spots
    is_featured BOOLEAN DEFAULT FALSE,
    featured_priority INT DEFAULT 0, -- Higher number = higher placement

    -- Fluid Data in JSONB
    work_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    announcements JSONB DEFAULT '[]'::jsonb,
    specials JSONB NOT NULL DEFAULT '[]'::jsonb,
    menu JSONB DEFAULT '[]'::jsonb,
    contact JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_venues_featured ON venues (is_featured DESC, featured_priority DESC);
CREATE INDEX idx_venues_district ON venues (district);
CREATE INDEX idx_venues_work_info ON venues USING gin (work_info);
CREATE INDEX idx_venues_menu ON venues USING gin (menu jsonb_path_ops);
CREATE INDEX idx_venues_specials ON venues USING gin (specials);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_updated_at
BEFORE UPDATE ON venues
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
