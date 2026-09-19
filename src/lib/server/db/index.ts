import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

function isNeon(url: string): boolean {
	return url.includes('neon.tech') || url.includes('neon.build');
}

export const db = isNeon(databaseUrl)
	? drizzleNeon(neon(databaseUrl), { schema })
	: drizzlePostgres(
			postgres(databaseUrl, {
				max: process.env.VERCEL ? 1 : 10,
				idle_timeout: 20,
				connect_timeout: 10
			}),
			{ schema }
		);
