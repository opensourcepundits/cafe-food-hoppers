-- Franchise roles. These used to be added at app start by user-columns.ts, which was removed.
-- Row level security blocks the Supabase API. The app server connects as the owner and bypasses it.

CREATE TABLE IF NOT EXISTS franchises (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchises FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
	REVOKE ALL ON TABLE franchises FROM anon, authenticated;
EXCEPTION
	WHEN undefined_object THEN NULL;
END $$;

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

-- Old role names from before the roles rework.
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
