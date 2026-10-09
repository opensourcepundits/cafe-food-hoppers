import { fail, redirect } from '@sveltejs/kit';
import { createSession, loginUser } from '$lib/server/auth';
import { safeNext } from '$lib/server/google';
import type { Actions, PageServerLoad } from './$types';

const googleErrors: Record<string, string> = {
	google_config: 'Google sign-in is not set up on this server yet.',
	google_denied: 'Google sign-in was cancelled.',
	google_failed: 'Google sign-in did not complete. Try again.',
	google_unverified: 'That Google account has no verified email.',
	google_taken: 'That email is already linked to a different Google account.'
};

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.admin) {
		redirect(303, safeNext(url.searchParams.get('next')));
	}
	const code = url.searchParams.get('error');
	return { error: code ? (googleErrors[code] ?? null) : null };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const identifier = String(data.get('identifier') ?? '');
		const password = String(data.get('password') ?? '');
		const result = await loginUser(identifier, password);
		if (!result.ok) return fail(401, { error: result.error, identifier });
		await createSession(result.user.id, cookies);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
