import { error, fail, redirect } from '@sveltejs/kit';
import { changePassword } from '$lib/server/auth';
import { listCommentsByUser } from '$lib/server/comments';
import { listFavourites } from '$lib/server/favourites';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login?next=/profile');
	try {
		const [favourites, comments] = await Promise.all([
			listFavourites(locals.user.id),
			listCommentsByUser(locals.user.id)
		]);
		return {
			name: locals.user.firstName?.trim() || locals.user.email.split('@')[0],
			favourites,
			comments
		};
	} catch (cause) {
		console.error(cause);
		error(503, 'Could not load your profile.');
	}
};

export const actions: Actions = {
	password: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login?next=/profile');
		const data = await request.formData();
		const current = String(data.get('current') ?? '');
		const next = String(data.get('next') ?? '');
		const confirm = String(data.get('confirm') ?? '');
		if (next !== confirm) return fail(400, { error: 'New passwords do not match.' });
		const result = await changePassword(locals.user.id, current, next);
		if (!result.ok) return fail(400, { error: result.error });
		return { saved: true };
	}
};
