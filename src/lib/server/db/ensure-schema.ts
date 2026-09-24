import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { upsertSuperusers } from '../superusers';
import { requiresSsl, resolveDatabaseUrl } from './env';
import { USER_COLUMNS_SQL } from './user-columns';

const SCHEMA_VERSION = 2;
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
	if (pending) return pending;
	pending = applySchema()
		.then((ready) => {
			if (!ready) pending = undefined;
		})
		.catch((error) => {
			pending = undefined;
			throw error;
		});
	return pending;
}

async function schemaVersion(sql: postgres.Sql): Promise<number> {
	try {
		const rows = await sql<{ version: number }[]>`SELECT version FROM schema_meta WHERE id = 1`;
		return Number(rows[0]?.version) || 0;
	} catch {
		return 0;
	}
}

async function applySchema(): Promise<boolean> {
	const url = requireDatabaseUrl();
	const sql = postgres(url, postgresOptions(url, 1));
	try {
		const version = await schemaVersion(sql);
		if (version >= SCHEMA_VERSION) {
			await seedSuperusers(sql);
			return true;
		}
		if (version >= 1) {
			await sql.unsafe(`
				ALTER TABLE comments NO FORCE ROW LEVEL SECURITY;
				ALTER TABLE favourites NO FORCE ROW LEVEL SECURITY;
				UPDATE schema_meta SET version = ${SCHEMA_VERSION} WHERE id = 1;
			`);
			await seedSuperusers(sql);
			return true;
		}

		const migrated = await sql.begin(async (tx) => {
			await tx.unsafe(`SET LOCAL lock_timeout = '4s'`);
			await tx.unsafe(`SET LOCAL statement_timeout = '20s'`);
			const [lock] = await tx<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(714203) AS locked`;
			if (!lock?.locked) return false;
			if ((await schemaVersion(tx as unknown as postgres.Sql)) >= SCHEMA_VERSION) return true;

			await tx.unsafe(`
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
			);
			CREATE INDEX IF NOT EXISTS idx_venues_featured ON venues (is_featured DESC, featured_priority DESC);
			CREATE INDEX IF NOT EXISTS idx_venues_district ON venues (district);
			CREATE INDEX IF NOT EXISTS idx_venues_work_info ON venues USING gin (work_info);
			CREATE INDEX IF NOT EXISTS idx_venues_menu ON venues USING gin (menu jsonb_path_ops);
			CREATE INDEX IF NOT EXISTS idx_venues_specials ON venues USING gin (specials);

			CREATE TABLE IF NOT EXISTS users (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				email text NOT NULL,
				phone text NOT NULL,
				password_hash text NOT NULL,
				created_at timestamptz DEFAULT now() NOT NULL,
				updated_at timestamptz DEFAULT now() NOT NULL,
				CONSTRAINT users_email_unique UNIQUE (email),
				CONSTRAINT users_phone_unique UNIQUE (phone)
			);
			CREATE TABLE IF NOT EXISTS sessions (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				user_id uuid NOT NULL,
				token_hash text NOT NULL,
				expires_at timestamptz NOT NULL,
				created_at timestamptz DEFAULT now() NOT NULL,
				CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash)
			);
			DO $$ BEGIN
				ALTER TABLE sessions
				ADD CONSTRAINT sessions_user_id_users_id_fk
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
			EXCEPTION
				WHEN duplicate_object THEN NULL;
			END $$;
			CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
			CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
			CREATE OR REPLACE FUNCTION set_updated_at()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = NOW();
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
			DROP TRIGGER IF EXISTS venues_updated_at ON venues;
			CREATE TRIGGER venues_updated_at
			BEFORE UPDATE ON venues
			FOR EACH ROW
			EXECUTE FUNCTION set_updated_at();
			DROP TRIGGER IF EXISTS users_updated_at ON users;
			CREATE TRIGGER users_updated_at
			BEFORE UPDATE ON users
			FOR EACH ROW
			EXECUTE FUNCTION set_updated_at();
		`);
			await tx.unsafe(USER_COLUMNS_SQL);
			await tx.unsafe(`
				CREATE TABLE IF NOT EXISTS schema_meta (
					id integer PRIMARY KEY,
					version integer NOT NULL
				);
				INSERT INTO schema_meta (id, version) VALUES (1, ${SCHEMA_VERSION})
				ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version;
			`);
			return true;
		});

		if (migrated) await seedSuperusers(sql);
		return migrated;
	} finally {
		await sql.end({ timeout: 5 });
	}
}

async function seedSuperusers(sql: postgres.Sql): Promise<void> {
	try {
		const seeded = await upsertSuperusers(sql, env);
		if (seeded) console.log(`Ensured ${seeded} superuser account${seeded === 1 ? '' : 's'}.`);
	} catch (error) {
		console.error('Superuser seed failed.', error);
	}
}
