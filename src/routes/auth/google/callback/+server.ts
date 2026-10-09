import { redirect } from '@sveltejs/kit';
import { createSession, loginWithGoogle } from '$lib/server/auth';
import { fetchGoogleIdentity, GOOGLE_OAUTH_COOKIE, readGooglePending } from '$lib/server/google';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const pending = readGooglePending(cookies.get(GOOGLE_OAUTH_COOKIE));
	cookies.delete(GOOGLE_OAUTH_COOKIE, { path: '/' });

	const next = pending?.next ?? '/';
	if (!pending || url.searchParams.get('state') !== pending.state) {
		redirect(303, loginError('google_failed', next));
	}
	const oauthError = url.searchParams.get('error');
	if (oauthError === 'access_denied') redirect(303, loginError('google_denied', next));
	if (oauthError) redirect(303, loginError('google_failed', next));

	const code = url.searchParams.get('code');
	if (!code) redirect(303, loginError('google_failed', next));

	let identity;
	try {
		identity = await fetchGoogleIdentity(url.origin, code, pending.verifier);
	} catch (error) {
		console.error(error);
		identity = null;
	}
	if (!identity) redirect(303, loginError('google_failed', next));

	const result = await loginWithGoogle(identity);
	if (!result.ok) {
		const code = result.code === 'unverified' ? 'google_unverified' : result.code === 'taken' ? 'google_taken' : 'google_failed';
		redirect(303, loginError(code, next));
	}

	await createSession(result.user.id, cookies);
	redirect(303, next);
};

function loginError(code: string, next: string): string {
	const params = new URLSearchParams({ error: code });
	if (next !== '/') params.set('next', next);
	return `/login?${params}`;
}
