import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';
import { resolveDatabaseUrlUnpooled } from './src/lib/server/db/env';

if (existsSync('.env.local')) {
	process.loadEnvFile('.env.local');
}

const url = resolveDatabaseUrlUnpooled();
if (!url) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: { url },
	verbose: true,
	strict: false
});
