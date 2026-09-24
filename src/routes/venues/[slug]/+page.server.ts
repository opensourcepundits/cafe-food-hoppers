import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import { addComment, listComments } from '$lib/server/comments';
import { isFavourite, toggleFavourite } from '$lib/server/favourites';
import { getVenueBySlug } from '$lib/server/venues';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const venue = await getVenueBySlug(params.slug);
		if (!venue) error(404, 'That venue is not in the index.');
		const [comments, favourite] = await Promise.all([
			listComments(venue.id),
			locals.user ? isFavourite(locals.user.id, venue.id) : Promise.resolve(false)
		]);
		return { venue, comments, favourite };
	} catch (cause) {
		if (isHttpError(cause)) throw cause;
		console.error(cause);
		error(503, 'Database unavailable.');
	}
};

export const actions: Actions = {
	favourite: async ({ locals, params }) => {
		const next = `/venues/${params.slug}`;
		if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(next)}`);
		const venue = await getVenueBySlug(params.slug);
		if (!venue) error(404, 'That venue is not in the index.');
		await toggleFavourite(locals.user.id, venue.id);
		redirect(303, next);
	},
	comment: async ({ request, locals, params }) => {
		const next = `/venues/${params.slug}#comments`;
		if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(next)}`);
		const data = await request.formData();
		const body = String(data.get('body') ?? '').trim();
		if (!body || body.length > 1000) {
			return fail(400, { error: 'Write a comment of up to 1000 characters.', body });
		}
		const venue = await getVenueBySlug(params.slug);
		if (!venue) error(404, 'That venue is not in the index.');
		await addComment(venue.id, locals.user.id, body);
		redirect(303, next);
	}
};
