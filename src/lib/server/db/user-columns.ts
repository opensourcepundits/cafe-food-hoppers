/** Idempotent users-table upgrades. Safe to run on every process start. */
export const USER_COLUMNS_SQL = `
DO $$ BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'users'
			AND column_name = 'role'
			AND udt_name = 'role'
	) THEN
		ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
		ALTER TABLE users ALTER COLUMN role TYPE text USING lower(role::text);
		ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
	END IF;
END $$;

DO $$ BEGIN
	DROP TYPE IF EXISTS role;
EXCEPTION
	WHEN dependent_objects_still_exist THEN NULL;
END $$;

ALTER TABLE users
	ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
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

DO $$ BEGIN
	ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
	ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'editor', 'manager', 'superuser'));
EXCEPTION
	WHEN check_violation OR invalid_text_representation THEN
		RAISE WARNING 'users_role_check skipped: %', SQLERRM;
END $$;

DO $$ BEGIN
	ALTER TABLE users DROP CONSTRAINT IF EXISTS users_editor_venue;
	ALTER TABLE users ADD CONSTRAINT users_editor_venue CHECK (role <> 'editor' OR venue_id IS NOT NULL);
EXCEPTION
	WHEN check_violation OR invalid_text_representation THEN
		RAISE WARNING 'users_editor_venue skipped: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_venue ON users (venue_id);
CREATE INDEX IF NOT EXISTS idx_users_emails ON users USING gin (emails);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_unique ON sessions (token_hash);

ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT false;

DO $$ BEGIN
	ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
EXCEPTION
	WHEN OTHERS THEN
		RAISE WARNING 'users.role default skipped: %', SQLERRM;
END $$;

ALTER TABLE venues ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS speed_verified boolean NOT NULL DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS noise_verified boolean NOT NULL DEFAULT false;

DO $$ BEGIN
	ALTER TABLE venues
		ADD CONSTRAINT venues_created_by_users_id_fk
		FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_venues_created_by ON venues (created_by);

ALTER TABLE venues ADD COLUMN IF NOT EXISTS wifi_tested_at timestamptz;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS wifi_download_mbps numeric(6, 1);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS wifi_upload_mbps numeric(6, 1);

CREATE TABLE IF NOT EXISTS user_venues (
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, venue_id)
);
CREATE INDEX IF NOT EXISTS idx_user_venues_venue ON user_venues (venue_id);

DO $$ BEGIN
	ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
	ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'editor', 'manager', 'superuser'));
EXCEPTION
	WHEN check_violation OR invalid_text_representation THEN
		RAISE WARNING 'users_role_check skipped: %', SQLERRM;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;

CREATE TABLE IF NOT EXISTS favourites (
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, venue_id)
);
CREATE INDEX IF NOT EXISTS idx_favourites_user ON favourites (user_id, created_at DESC);
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
	REVOKE ALL ON TABLE favourites FROM anon, authenticated;
EXCEPTION
	WHEN undefined_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS comments (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	body text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_venue ON comments (venue_id, created_at DESC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
	REVOKE ALL ON TABLE comments FROM anon, authenticated;
EXCEPTION
	WHEN undefined_object THEN NULL;
END $$;
`;
