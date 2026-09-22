import { fail, redirect } from '@sveltejs/kit';
import { listRegisteredUsers, setAccountAccess } from '$lib/server/auth';
import { requireSuperuser } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireSuperuser(locals.user);
	const accounts = await listRegisteredUsers();
	return { accounts, saved: url.searchParams.get('saved') === '1' };
};

export const actions: Actions = {
	access: async ({ request, locals }) => {
		requireSuperuser(locals.user);
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const result = await setAccountAccess(userId, {
			canCreate: data.get('canCreate') === '1',
			canEdit: data.get('canEdit') === '1'
		});
		if (!result.ok) return fail(400, { error: result.error, userId });
		redirect(303, '/admin/users?saved=1');
	}
};
