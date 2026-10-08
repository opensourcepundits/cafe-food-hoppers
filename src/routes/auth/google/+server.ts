import { redirect, type Cookies } from '@sveltejs/kit';
import { GOOGLE_OAUTH_COOKIE, googleAuthorizeUrl, safeNext } from '$lib/server/google';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const next = safeNext(url.searchParams.get('next'));
	const started = googleAuthorizeUrl(url.origin, next);
	if (!started) redirect(303, loginError('google_config', next));

	cookies.set(GOOGLE_OAUTH_COOKIE, JSON.stringify(started.pending), cookieOptions());
	redirect(303, started.url);
};

function cookieOptions(): Parameters<Cookies['set']>[2] {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 10
	};
}

function loginError(code: string, next: string): string {
	const params = new URLSearchParams({ error: code });
	if (next !== '/') params.set('next', next);
	return `/login?${params}`;
}
