-- Shop accounts edit every placement assigned here.
-- Placement accounts stay role = editor and keep a single users.venue_id.

CREATE TABLE IF NOT EXISTS user_venues (
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_user_venues_venue ON user_venues (venue_id);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'editor', 'manager', 'superuser'));
