import { fail, redirect } from '@sveltejs/kit';
import { createSession, loginUser } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.admin) {
		redirect(303, safeNext(url.searchParams.get('next')));
	}
	return {};
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

function safeNext(value: string | null): string {
	if (value && value.startsWith('/admin') && !value.startsWith('//') && !value.startsWith('/admin/login')) {
		return value;
	}
	return '/admin';
}
