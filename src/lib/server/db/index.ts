import { env } from '$env/dynamic/private';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function isNeon(url: string): boolean {
	return url.includes('neon.tech') || url.includes('neon.build');
}

function createDb() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL is not set. Add the Neon pooled URL in Vercel → Settings → Environment Variables (Production and Preview), then redeploy.'
		);
	}

	if (isNeon(databaseUrl)) {
		return drizzleNeon(neon(databaseUrl), { schema });
	}

	return drizzlePostgres(
		postgres(databaseUrl, {
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
