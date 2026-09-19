import { fail, isRedirect, redirect } from '@sveltejs/kit';
import { createVenue } from '$lib/server/venues';
import { isUniqueViolation, payloadFromForm } from '$lib/server/venue-input';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const parsed = payloadFromForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		try {
			const venue = await createVenue(parsed.value);
			redirect(303, `/admin/venues/${venue.id}?saved=1`);
		} catch (cause) {
			if (isRedirect(cause)) throw cause;
			console.error(cause);
			if (isUniqueViolation(cause)) return fail(400, { error: 'That slug is already taken.' });
			return fail(500, { error: 'Could not create this place.' });
		}
	}
};
