-- Place comments, and a first name shown in the navbar after sign-in.
-- Row level security blocks the Supabase API. The app server connects as the owner and bypasses it.

ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text;

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
