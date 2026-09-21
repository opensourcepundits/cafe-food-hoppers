import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { createVenue } from '$lib/server/venues';
import { isUniqueViolation, payloadFromForm } from '$lib/server/venue-input';
import { filesFromForm, persistVenueImages } from '$lib/server/storage';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	save: async ({ request }) => {
		const data = await request.formData();
		const parsed = payloadFromForm(data);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		try {
			const images = await persistVenueImages(parsed.value.images, filesFromForm(data));
			const venue = await createVenue({ ...parsed.value, images });
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
