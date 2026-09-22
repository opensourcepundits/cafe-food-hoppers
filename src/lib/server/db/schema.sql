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
    created_by UUID,
    speed_verified BOOLEAN NOT NULL DEFAULT FALSE,
    noise_verified BOOLEAN NOT NULL DEFAULT FALSE,
    wifi_tested_at TIMESTAMPTZ,
    wifi_download_mbps NUMERIC(6, 1),
    wifi_upload_mbps NUMERIC(6, 1),

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

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'editor', 'superuser')),
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    emails TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_editor_venue CHECK (role <> 'editor' OR venue_id IS NOT NULL)
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);
CREATE INDEX idx_users_venue ON users (venue_id);
CREATE INDEX idx_users_emails ON users USING gin (emails);
CREATE INDEX idx_venues_created_by ON venues (created_by);

ALTER TABLE venues
	ADD CONSTRAINT venues_created_by_users_id_fk
	FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
