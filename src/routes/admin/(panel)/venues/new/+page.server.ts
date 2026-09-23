import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { createVenue } from '$lib/server/venues';
import { isUniqueViolation, payloadFromForm } from '$lib/server/venue-input';
import { filesFromForm, persistVenueImages } from '$lib/server/storage';
import { requireCanCreate } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireCanCreate(locals.user);
	return {};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) redirect(303, '/login');
		requireCanCreate(user);
		const data = await request.formData();
		const parsed = payloadFromForm(data);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		try {
			const images = await persistVenueImages(parsed.value.images, filesFromForm(data), [], parsed.value.slug);
			const venue = await createVenue({ ...parsed.value, images }, user.id);
			redirect(303, `/admin/venues/${venue.id}?saved=1`);
		} catch (cause) {
			if (isRedirect(cause)) throw cause;
			console.error(cause);
			if (isUniqueViolation(cause)) return fail(400, { error: 'That slug is already taken.' });
			const message = cause instanceof Error ? cause.message : 'Could not create this place.';
			return fail(500, { error: message });
		}
	}
};
