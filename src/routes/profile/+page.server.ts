import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { changePassword } from '$lib/server/auth';
import { listCommentsByUser } from '$lib/server/comments';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { listFavourites } from '$lib/server/favourites';
import { setWhatsAppOptIn } from '$lib/server/whatsapp';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login?next=/profile');
	try {
		const [favourites, comments, whatsappOptIn] = await Promise.all([
			listFavourites(locals.user.id),
			listCommentsByUser(locals.user.id),
			db
				.select({ whatsappOptIn: users.whatsappOptIn })
				.from(users)
				.where(eq(users.id, locals.user.id))
				.limit(1)
				.then((rows) => rows[0]?.whatsappOptIn ?? false)
				.catch((cause: unknown) => {
					console.error('WhatsApp opt-in could not be loaded', cause);
					return false;
				})
		]);
		return {
			name: locals.user.firstName?.trim() || locals.user.email.split('@')[0],
			phone: locals.user.phone,
			whatsappOptIn,
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
	},
	whatsapp: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login?next=/profile');
		if (!locals.user.phone) return fail(400, { whatsappError: 'Add a phone number before opting in.' });
		const data = await request.formData();
		const optIn = data.get('optIn') === 'on';
		try {
			await setWhatsAppOptIn(locals.user.id, optIn);
		} catch (cause) {
			console.error(cause);
			return fail(503, { whatsappError: 'WhatsApp alerts are not available yet.' });
		}
		return { whatsappSaved: true };
	}
};
