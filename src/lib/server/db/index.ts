import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { postgresOptions, requireDatabaseUrl } from './ensure-schema';

function createDb() {
	const databaseUrl = requireDatabaseUrl();
	return drizzle(postgres(databaseUrl, postgresOptions(databaseUrl, process.env.VERCEL ? 1 : 10)), {
		schema
	});
}

type Database = ReturnType<typeof createDb>;

let cached: Database | undefined;

function getDb(): Database {
	cached ??= createDb();
	return cached;
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
