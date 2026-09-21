-- Staff accounts: site admins vs place editors.
-- Run this once in the Supabase SQL editor. The app does not apply it automatically.

ALTER TABLE users
	ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin',
	ADD COLUMN IF NOT EXISTS venue_id uuid,
	ADD COLUMN IF NOT EXISTS emails text[] NOT NULL DEFAULT '{}';

ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

DO $$ BEGIN
	ALTER TABLE users
		ADD CONSTRAINT users_venue_id_venues_id_fk
		FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'editor'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_editor_venue;
ALTER TABLE users ADD CONSTRAINT users_editor_venue CHECK (role <> 'editor' OR venue_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_users_venue ON users (venue_id);
CREATE INDEX IF NOT EXISTS idx_users_emails ON users USING gin (emails);

UPDATE users SET role = 'admin' WHERE venue_id IS NULL;
