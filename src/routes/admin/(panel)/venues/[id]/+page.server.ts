import { error, fail, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { deleteVenue, getVenueById, updateVenue } from '$lib/server/venues';
import { isUniqueViolation, payloadFromForm } from '$lib/server/venue-input';
import { filesFromForm, persistVenueImages, removeImagePaths } from '$lib/server/storage';
import { isOwner, requireVenueEditor } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const venue = await getVenueById(params.id);
	if (!venue) error(404, 'Place not found.');
	requireVenueEditor(locals.user, venue.id);
	return { venue, saved: url.searchParams.get('saved') === '1', canDelete: isOwner(locals.user) };
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		requireVenueEditor(locals.user, params.id);
		const data = await request.formData();
		const parsed = payloadFromForm(data);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		try {
			const current = await getVenueById(params.id);
			if (!current) error(404, 'Place not found.');
			const images = await persistVenueImages(
				parsed.value.images,
				filesFromForm(data),
				current.images,
				parsed.value.slug || current.slug
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
	delete: async ({ params, locals }) => {
		requireVenueEditor(locals.user, params.id);
		if (!isOwner(locals.user)) error(403, 'Only site admins can delete a place.');
		const venue = await getVenueById(params.id);
		if (venue) await removeImagePaths(venue.images.map((image) => image.path));
		await deleteVenue(params.id);
		redirect(303, '/admin?deleted=1');
	}
};
