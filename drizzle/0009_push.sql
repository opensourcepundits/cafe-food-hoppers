-- Browser push endpoints for accounts that saved a place.
-- Row level security blocks the Supabase API. The app server connects as the owner and bypasses it.

CREATE TABLE IF NOT EXISTS push_subscriptions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	endpoint text NOT NULL UNIQUE,
	p256dh text NOT NULL,
	auth text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
	REVOKE ALL ON TABLE push_subscriptions FROM anon, authenticated;
EXCEPTION
	WHEN undefined_object THEN NULL;
END $$;

-- One "starts soon" and one "is starting" notice per event start time.
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

ALTER TABLE push_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_deliveries FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
	REVOKE ALL ON TABLE push_deliveries FROM anon, authenticated;
EXCEPTION
	WHEN undefined_object THEN NULL;
END $$;
