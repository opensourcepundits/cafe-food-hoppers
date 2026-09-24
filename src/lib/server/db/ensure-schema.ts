import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { requiresSsl, resolveDatabaseUrl } from './env';

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
