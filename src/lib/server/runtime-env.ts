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
	const pair = vapidPair(env, '') ?? vapidPair(env, 'CAFE_DB_');
	return {
		publicKey: pair?.publicKey,
		privateKey: pair?.privateKey,
		subject:
			usableSubject(pair?.subject) ??
			usableSubject(readServerEnv(env, 'VAPID_SUBJECT')) ??
			usableSubject(readServerEnv(env, 'PUBLIC_SITE_ORIGIN')) ??
			'https://place.dot42.dev'
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

/** A usable VAPID public key is a 65-byte uncompressed P-256 point. A placeholder name is not. */
function vapidPair(
	env: Record<string, string | undefined>,
	prefix: string
): { publicKey: string; privateKey: string; subject?: string } | undefined {
	const publicKey = first(env[`${prefix}VAPID_PUBLIC_KEY`]);
	const privateKey = first(env[`${prefix}VAPID_PRIVATE_KEY`]);
	if (!publicKey || !privateKey || !isVapidPublicKey(publicKey)) return undefined;
	return { publicKey, privateKey, subject: first(env[`${prefix}VAPID_SUBJECT`]) };
}

/** Apple's push service rejects a localhost subject with BadJwtToken, so the send fails after the alert is saved. */
function usableSubject(value: string | undefined): string | undefined {
	const trimmed = first(value);
	if (!trimmed) return undefined;
	try {
		const url = new URL(trimmed);
		if (url.protocol === 'mailto:') {
			const domain = url.pathname.split('@')[1]?.toLowerCase() ?? '';
			if (!domain || domain === 'localhost' || domain.endsWith('.localhost')) return undefined;
			return trimmed;
		}
		if (url.protocol !== 'https:') return undefined;
		if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) return undefined;
		return trimmed;
	} catch {
		return undefined;
	}
}

function isVapidPublicKey(value: string): boolean {
	const padding = '='.repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
	const bytes = Buffer.from(base64, 'base64');
	return bytes.length === 65 && bytes[0] === 0x04;
}
