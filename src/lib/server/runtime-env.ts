/**
 * Read a Vercel environment variable the same way as the database URL:
 * the plain name first, then the CAFE_DB_ prefix Vercel adds for this project.
 * Pass `$env/dynamic/private` so the value is the one from the running deployment.
 */
export function readServerEnv(
	env: Record<string, string | undefined>,
	name: string
): string | undefined {
	return first(env[name]) ?? first(env[`CAFE_DB_${name}`]);
}

export function resolveVapid(env: Record<string, string | undefined> = process.env): {
	publicKey: string | undefined;
	privateKey: string | undefined;
	subject: string;
} {
	return {
		publicKey: readServerEnv(env, 'VAPID_PUBLIC_KEY'),
		privateKey: readServerEnv(env, 'VAPID_PRIVATE_KEY'),
		subject: readServerEnv(env, 'VAPID_SUBJECT') ?? 'mailto:place@localhost'
	};
}

export function resolveCronSecret(
	env: Record<string, string | undefined> = process.env
): string | undefined {
	return readServerEnv(env, 'CRON_SECRET');
}

function first(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}
