import { fail, redirect } from '@sveltejs/kit';
import { createSession, registerUser } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.admin) redirect(303, '/admin');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '');
		const phone = String(data.get('phone') ?? '');
		const password = String(data.get('password') ?? '');
		const confirm = String(data.get('confirm') ?? '');
		if (password !== confirm) {
			return fail(400, { error: 'Passwords do not match.', email, phone });
		}
		const result = await registerUser({ email, phone, password });
		if (!result.ok) return fail(400, { error: result.error, email, phone });
		await createSession(result.user.id, cookies);
		redirect(303, '/admin');
	}
};
