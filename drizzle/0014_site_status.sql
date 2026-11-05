-- One public status tag. The message and severity color are edited from the admin panel.
-- Row level security blocks the Supabase API. The app server connects as the owner and bypasses it.

CREATE TABLE IF NOT EXISTS site_status (
	id text PRIMARY KEY,
	active boolean NOT NULL DEFAULT false,
	text text NOT NULL,
	severity text NOT NULL CHECK (severity IN ('notice', 'caution', 'warning', 'critical')),
	updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_status FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
	REVOKE ALL ON TABLE site_status FROM anon, authenticated;
EXCEPTION
	WHEN undefined_object THEN NULL;
END $$;
