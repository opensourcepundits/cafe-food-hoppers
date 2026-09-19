/** Read a DB URL from plain names or Vercel Neon’s `CAFE_DB_` prefix. */
export function resolveDatabaseUrl(
	env: Record<string, string | undefined> = process.env
): string | undefined {
	return (
		first(env.DATABASE_URL) ??
		first(env.CAFE_DB_DATABASE_URL) ??
		first(env.POSTGRES_URL) ??
		first(env.CAFE_DB_POSTGRES_URL)
	);
}

export function resolveDatabaseUrlUnpooled(
	env: Record<string, string | undefined> = process.env
): string | undefined {
	return (
		first(env.DATABASE_URL_UNPOOLED) ??
		first(env.CAFE_DB_DATABASE_URL_UNPOOLED) ??
		first(env.POSTGRES_URL_NON_POOLING) ??
		first(env.CAFE_DB_POSTGRES_URL_NON_POOLING) ??
		resolveDatabaseUrl(env)
	);
}

function first(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}
