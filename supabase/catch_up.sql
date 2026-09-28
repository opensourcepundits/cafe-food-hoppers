-- Brings the Supabase database up to what the code expects since the Sep 24 cleanup,
-- when the app stopped updating its own schema. Run once in Supabase → SQL Editor.
-- Every statement is safe to run again.
-- Same as drizzle/0008 (tables), 0009_push, and 0011_franchises.

-- Tables the removed startup code used to create
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;

CREATE TABLE IF NOT EXISTS user_venues (
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	PRIMARY KEY (user_id, venue_id)
);
CREATE INDEX IF NOT EXISTS idx_user_venues_venue ON user_venues (venue_id);

CREATE TABLE IF NOT EXISTS favourites (
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	created_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, venue_id)
);
CREATE INDEX IF NOT EXISTS idx_favourites_user ON favourites (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	body text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_venue ON comments (venue_id, created_at DESC);

-- Web Push (0009)
CREATE TABLE IF NOT EXISTS push_subscriptions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	endpoint text NOT NULL UNIQUE,
	p256dh text NOT NULL,
	auth text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS push_deliveries (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	event_key text NOT NULL,
	phase text NOT NULL,
	starts_at timestamptz NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (venue_id, event_key, phase, starts_at)
);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_venue ON push_deliveries (venue_id);

-- Franchise roles (0011)
CREATE TABLE IF NOT EXISTS franchises (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE venues ADD COLUMN IF NOT EXISTS franchise_id uuid;
ALTER TABLE users ADD COLUMN IF NOT EXISTS franchise_id uuid;

DO $$ BEGIN
	ALTER TABLE venues
		ADD CONSTRAINT venues_franchise_id_fkey
		FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE users
		ADD CONSTRAINT users_franchise_id_fkey
		FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_editor_venue;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users SET role = 'place_manager' WHERE role = 'editor';
UPDATE users SET role = 'user' WHERE role = 'admin';

INSERT INTO franchises (id, name)
SELECT u.id, coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1))
FROM users u
WHERE u.role = 'manager'
ON CONFLICT (id) DO NOTHING;

UPDATE users SET franchise_id = id, role = 'franchise_manager' WHERE role = 'manager';

ALTER TABLE users ADD CONSTRAINT users_role_check
	CHECK (role IN ('user', 'place_manager', 'franchise_manager', 'superuser'));

-- Keep the Supabase API out of app tables. The app connects as the owner and is unaffected.
DO $$
DECLARE
	t text;
BEGIN
	FOREACH t IN ARRAY ARRAY['user_venues', 'favourites', 'comments', 'push_subscriptions', 'push_deliveries', 'franchises']
	LOOP
		EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
		BEGIN
			EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', t);
		EXCEPTION
			WHEN undefined_object THEN NULL;
		END;
	END LOOP;
END $$;
