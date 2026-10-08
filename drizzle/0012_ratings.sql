-- One star rating per person per place. A later rating replaces the earlier one.
-- Row level security blocks the Supabase API. The app server connects as the owner and bypasses it.

CREATE TABLE IF NOT EXISTS ratings (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (venue_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_venue ON ratings (venue_id);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
	REVOKE ALL ON TABLE ratings FROM anon, authenticated;
EXCEPTION
	WHEN undefined_object THEN NULL;
END $$;
