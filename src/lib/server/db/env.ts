/** Read a DB URL from app names, Supabase, or Vercel’s prefixed Postgres vars. */
export function resolveDatabaseUrl(
	env: Record<string, string | undefined> = process.env
): string | undefined {
	return (
		first(env.DATABASE_URL) ??
		first(env.SUPABASE_DATABASE_URL) ??
		first(env.POSTGRES_URL) ??
		first(env.POSTGRES_PRISMA_URL) ??
		first(env.CAFE_DB_DATABASE_URL) ??
		first(env.CAFE_DB_POSTGRES_URL)
	);
}

export function resolveDatabaseUrlUnpooled(
	env: Record<string, string | undefined> = process.env
): string | undefined {
	return (
		first(env.DATABASE_URL_UNPOOLED) ??
		first(env.SUPABASE_DATABASE_URL_UNPOOLED) ??
		first(env.POSTGRES_URL_NON_POOLING) ??
		first(env.DIRECT_URL) ??
		first(env.CAFE_DB_DATABASE_URL_UNPOOLED) ??
		first(env.CAFE_DB_POSTGRES_URL_NON_POOLING) ??
		resolveDatabaseUrl(env)
	);
}

export function requiresSsl(url: string): boolean {
	if (/127\.0\.0\.1|localhost/i.test(url)) return false;
	return (
		/sslmode=require/i.test(url) ||
		url.includes('supabase.co') ||
		url.includes('supabase.com') ||
		url.includes('neon.tech') ||
		url.includes('neon.build')
	);
}

function first(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}
