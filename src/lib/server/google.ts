import { createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { readServerEnv } from '$lib/server/runtime-env';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_OAUTH_COOKIE = 'google_oauth';

export type GooglePending = {
	state: string;
	verifier: string;
	next: string;
};

export type GoogleIdentity = {
	sub: string;
	email: string;
	emailVerified: boolean;
	firstName: string | null;
};

/** Vercel env, including the CAFE_DB_ prefix this project’s integration adds. */
export function googleCredentials(): { clientId: string; clientSecret: string } | null {
	const clientId = readServerEnv(env, 'GOOGLE_CLIENT_ID');
	const clientSecret = readServerEnv(env, 'GOOGLE_CLIENT_SECRET');
	if (!clientId || !clientSecret) return null;
	return { clientId, clientSecret };
}

export function googleRedirectUri(origin: string): string {
	return `${origin}/auth/google/callback`;
}

export function googleAuthorizeUrl(
	origin: string,
	next: string
): { pending: GooglePending; url: string } | null {
	const credentials = googleCredentials();
	if (!credentials) return null;
	const state = randomBytes(16).toString('base64url');
	const verifier = randomBytes(32).toString('base64url');
	const challenge = createHash('sha256').update(verifier).digest('base64url');
	const url = new URL(AUTH_URL);
	url.searchParams.set('client_id', credentials.clientId);
	url.searchParams.set('redirect_uri', googleRedirectUri(origin));
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', 'openid email profile');
	url.searchParams.set('state', state);
	url.searchParams.set('code_challenge', challenge);
	url.searchParams.set('code_challenge_method', 'S256');
	url.searchParams.set('prompt', 'select_account');
	return { pending: { state, verifier, next: safeNext(next) }, url: url.toString() };
}

export function readGooglePending(raw: string | undefined): GooglePending | null {
	if (!raw) return null;
	try {
		const value = JSON.parse(raw) as Partial<GooglePending>;
		if (!value.state || !value.verifier || typeof value.next !== 'string') return null;
		return { state: value.state, verifier: value.verifier, next: safeNext(value.next) };
	} catch {
		return null;
	}
}

export async function fetchGoogleIdentity(
	origin: string,
	code: string,
	verifier: string
): Promise<GoogleIdentity | null> {
	const credentials = googleCredentials();
	if (!credentials) return null;

	const body = new URLSearchParams({
		code,
		client_id: credentials.clientId,
		client_secret: credentials.clientSecret,
		redirect_uri: googleRedirectUri(origin),
		grant_type: 'authorization_code',
		code_verifier: verifier
	});
	const tokenResponse = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body,
		signal: AbortSignal.timeout(10_000)
	});
	if (!tokenResponse.ok) return null;
	const token = (await tokenResponse.json()) as { access_token?: unknown };
	if (typeof token.access_token !== 'string' || !token.access_token) return null;

	const profileResponse = await fetch(USERINFO_URL, {
		headers: { authorization: `Bearer ${token.access_token}` },
		signal: AbortSignal.timeout(10_000)
	});
	if (!profileResponse.ok) return null;
	const profile = (await profileResponse.json()) as {
		sub?: unknown;
		email?: unknown;
		email_verified?: unknown;
		given_name?: unknown;
	};
	if (typeof profile.sub !== 'string' || typeof profile.email !== 'string') return null;
	return {
		sub: profile.sub,
		email: profile.email,
		emailVerified: profile.email_verified === true,
		firstName: typeof profile.given_name === 'string' ? profile.given_name : null
	};
}

export function safeNext(value: string | null): string {
	if (
		value &&
		value.startsWith('/') &&
		!value.startsWith('//') &&
		!value.startsWith('/login') &&
		!value.startsWith('/auth/')
	) {
		return value;
	}
	return '/';
}
