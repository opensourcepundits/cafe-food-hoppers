-- Run this on the live database before deploying the access and badge changes.
-- New registrations stay role = user with both flags false.
-- Existing role = admin rows keep full access until you demote them (see the UPDATE at the bottom).

ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT false;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'editor', 'superuser'));
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

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

-- Optional. Turns existing self-registered admins into normal users with no create/edit access.
-- UPDATE users
-- SET role = 'user', can_create = false, can_edit = false
-- WHERE role = 'admin';
