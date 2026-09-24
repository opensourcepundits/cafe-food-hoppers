import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { postgresOptions, requireDatabaseUrl } from './ensure-schema';

const serverless = Boolean(process.env.VERCEL);
/** A frozen isolate keeps a dead TCP socket. Recycle it before the next query. */
const STALE_AFTER_MS = 5_000;

function createClient() {
	const databaseUrl = requireDatabaseUrl();
	return postgres(databaseUrl, {
		...postgresOptions(databaseUrl, serverless ? 1 : 10),
		max_lifetime: serverless ? 60 : null,
		keep_alive: serverless ? 1 : null,
		connection: { lock_timeout: 3000, statement_timeout: 15000 }
	});
}

type Client = ReturnType<typeof createClient>;
type Database = ReturnType<typeof drizzle<Client>>;

function open(): { db: Database; client: Client } {
	const client = createClient();
	return { db: drizzle(client, { schema }), client };
}

let cached: { db: Database; client: Client; usedAt: number } | undefined;

function getDb(): Database {
	const now = Date.now();
	if (cached && serverless && now - cached.usedAt > STALE_AFTER_MS) {
		const stale = cached.client;
		cached = undefined;
		void stale.end({ timeout: 0 });
	}
	if (!cached) {
		cached = { ...open(), usedAt: now };
	}
	cached.usedAt = now;
	return cached.db;
}

/** Lazy so `vite build` can import this module without DATABASE_URL. */
export const db = new Proxy({} as Database, {
	get(_target, prop) {
		if (prop === 'then') return undefined;
		const instance = getDb();
		const value = Reflect.get(instance, prop, instance);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});
