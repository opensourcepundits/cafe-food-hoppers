import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env.local')) {
	process.loadEnvFile('.env.local');
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url },
	verbose: true,
	strict: false
});
