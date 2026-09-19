import { fail, redirect } from '@sveltejs/kit';
import { adminPassword, attemptLogin } from '$lib/server/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.admin) {
		redirect(303, safeNext(url.searchParams.get('next')));
	}
	return { configured: Boolean(adminPassword()) };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		if (!adminPassword()) {
			return fail(503, { error: 'Set CAFE_ADMIN_PASSWORD first.' });
		}
		const data = await request.formData();
		const password = String(data.get('password') ?? '');
		if (!attemptLogin(password, cookies)) {
			return fail(401, { error: 'Wrong password.' });
		}
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};

function safeNext(value: string | null): string {
	if (value && value.startsWith('/admin') && !value.startsWith('//')) return value;
	return '/admin';
}
