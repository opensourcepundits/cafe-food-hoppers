import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { resolveDatabaseUrl } from './env';
import * as schema from './schema';

function isNeon(url: string): boolean {
	return url.includes('neon.tech') || url.includes('neon.build');
}

function createDb() {
	const databaseUrl = resolveDatabaseUrl(env);
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL is not set. Vercel’s Neon integration stores it as CAFE_DB_DATABASE_URL — that name is also accepted. Redeploy after the storage is connected.'
		);
	}

	const neon = isNeon(databaseUrl);
	return drizzle(
		postgres(databaseUrl, {
			ssl: neon ? 'require' : false,
			prepare: false,
			max: process.env.VERCEL ? 1 : 10,
			idle_timeout: 20,
			connect_timeout: 10
		}),
		{ schema }
	);
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
