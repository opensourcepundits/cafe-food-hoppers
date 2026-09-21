import { error, fail, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { deleteVenue, getVenueById, updateVenue } from '$lib/server/venues';
import { isUniqueViolation, payloadFromForm } from '$lib/server/venue-input';
import { filesFromForm, persistVenueImages, removeImagePaths } from '$lib/server/storage';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const venue = await getVenueById(params.id);
	if (!venue) error(404, 'Place not found.');
	return { venue, saved: url.searchParams.get('saved') === '1' };
};

export const actions: Actions = {
	save: async ({ request, params }) => {
		const data = await request.formData();
		const parsed = payloadFromForm(data);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		try {
			const current = await getVenueById(params.id);
			if (!current) error(404, 'Place not found.');
			const images = await persistVenueImages(
				parsed.value.images,
				filesFromForm(data),
				current.images
			);
			const venue = await updateVenue(params.id, { ...parsed.value, images });
			if (!venue) error(404, 'Place not found.');
			redirect(303, `/admin/venues/${params.id}?saved=1`);
		} catch (cause) {
			if (isRedirect(cause) || isHttpError(cause)) throw cause;
			if (isUniqueViolation(cause)) return fail(400, { error: 'That slug is already taken.' });
			console.error(cause);
			const message = cause instanceof Error ? cause.message : 'Could not save this place.';
			return fail(500, { error: message });
		}
	},
	delete: async ({ params }) => {
		const venue = await getVenueById(params.id);
		if (venue) await removeImagePaths(venue.images.map((image) => image.path));
		await deleteVenue(params.id);
		redirect(303, '/admin?deleted=1');
	}
};
