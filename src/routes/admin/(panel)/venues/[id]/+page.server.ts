import { error, fail, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { deleteVenue, getVenueById, updateVenue } from '$lib/server/venues';
import { isUniqueViolation, payloadFromForm } from '$lib/server/venue-input';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const venue = await getVenueById(params.id);
	if (!venue) error(404, 'Place not found.');
	return { venue, saved: url.searchParams.get('saved') === '1' };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const parsed = payloadFromForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		try {
			const venue = await updateVenue(params.id, parsed.value);
			if (!venue) error(404, 'Place not found.');
			redirect(303, `/admin/venues/${params.id}?saved=1`);
		} catch (cause) {
			if (isRedirect(cause) || isHttpError(cause)) throw cause;
			if (isUniqueViolation(cause)) return fail(400, { error: 'That slug is already taken.' });
			console.error(cause);
			return fail(500, { error: 'Could not save this place.' });
		}
	},
	delete: async ({ params }) => {
		await deleteVenue(params.id);
		redirect(303, '/admin');
	}
};
