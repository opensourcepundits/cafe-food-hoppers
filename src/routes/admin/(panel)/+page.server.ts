import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role === 'superuser') redirect(303, '/admin/users');
	redirect(303, '/my-places');
};
