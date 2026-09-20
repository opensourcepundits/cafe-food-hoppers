import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { requiresSsl, resolveDatabaseUrl } from './env';

let pending: Promise<void> | undefined;

export function requireDatabaseUrl(): string {
	const databaseUrl = resolveDatabaseUrl(env);
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL is not set. Add the Supabase pooled URI in Vercel → Settings → Environment Variables, then redeploy.'
		);
	}
	return databaseUrl;
}

export function postgresOptions(url: string, max: number): postgres.Options<Record<string, never>> {
	return {
		ssl: requiresSsl(url) ? 'require' : false,
		prepare: false,
		max,
		idle_timeout: 20,
		connect_timeout: 10
	};
}

/** Idempotent schema for serverless. No `drizzle-kit migrate` required. */
export function ensureSchema(): Promise<void> {
	pending ??= applySchema();
	return pending;
}

async function applySchema(): Promise<void> {
	const url = requireDatabaseUrl();
	const sql = postgres(url, postgresOptions(url, 1));
	try {
		await sql.unsafe(`
			CREATE TABLE IF NOT EXISTS venues (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				name text NOT NULL,
				slug text NOT NULL,
				district text NOT NULL,
				lat numeric(9, 6),
				lng numeric(9, 6),
				is_featured boolean DEFAULT false NOT NULL,
				featured_priority integer DEFAULT 0 NOT NULL,
				work_info jsonb DEFAULT '{}'::jsonb NOT NULL,
				opening_hours jsonb DEFAULT '{}'::jsonb NOT NULL,
				announcements jsonb DEFAULT '[]'::jsonb NOT NULL,
				specials jsonb DEFAULT '[]'::jsonb NOT NULL,
				menu jsonb DEFAULT '[]'::jsonb NOT NULL,
				contact jsonb DEFAULT '{}'::jsonb NOT NULL,
				created_at timestamptz DEFAULT now() NOT NULL,
				updated_at timestamptz DEFAULT now() NOT NULL,
				CONSTRAINT venues_slug_unique UNIQUE (slug)
			)
		`);
		await sql.unsafe(
			`CREATE INDEX IF NOT EXISTS idx_venues_featured ON venues (is_featured DESC, featured_priority DESC)`
		);
		await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_venues_district ON venues (district)`);
		await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_venues_work_info ON venues USING gin (work_info)`);
		await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_venues_menu ON venues USING gin (menu jsonb_path_ops)`);
		await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_venues_specials ON venues USING gin (specials)`);

		await sql.unsafe(`
			CREATE TABLE IF NOT EXISTS users (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				email text NOT NULL,
				phone text NOT NULL,
				password_hash text NOT NULL,
				created_at timestamptz DEFAULT now() NOT NULL,
				updated_at timestamptz DEFAULT now() NOT NULL,
				CONSTRAINT users_email_unique UNIQUE (email),
				CONSTRAINT users_phone_unique UNIQUE (phone)
			)
		`);
		await sql.unsafe(`
			CREATE TABLE IF NOT EXISTS sessions (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				user_id uuid NOT NULL,
				token_hash text NOT NULL,
				expires_at timestamptz NOT NULL,
				created_at timestamptz DEFAULT now() NOT NULL,
				CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash)
			)
		`);
		await sql.unsafe(`
			DO $$ BEGIN
				ALTER TABLE sessions
				ADD CONSTRAINT sessions_user_id_users_id_fk
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
			EXCEPTION
				WHEN duplicate_object THEN NULL;
			END $$
		`);
		await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id)`);
		await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at)`);
		await sql.unsafe(`
			CREATE OR REPLACE FUNCTION set_updated_at()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = NOW();
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql
		`);
		await sql.unsafe(`DROP TRIGGER IF EXISTS venues_updated_at ON venues`);
		await sql.unsafe(`
			CREATE TRIGGER venues_updated_at
			BEFORE UPDATE ON venues
			FOR EACH ROW
			EXECUTE FUNCTION set_updated_at()
		`);
		await sql.unsafe(`DROP TRIGGER IF EXISTS users_updated_at ON users`);
		await sql.unsafe(`
			CREATE TRIGGER users_updated_at
			BEFORE UPDATE ON users
			FOR EACH ROW
			EXECUTE FUNCTION set_updated_at()
		`);
	} finally {
		await sql.end({ timeout: 5 });
	}
}
