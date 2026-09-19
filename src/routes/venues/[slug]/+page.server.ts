import { error, isHttpError } from '@sveltejs/kit';
import { getVenueBySlug } from '$lib/server/venues';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const venue = await getVenueBySlug(params.slug);
		if (!venue) error(404, 'That venue is not in the index.');
		return { venue };
	} catch (cause) {
		if (isHttpError(cause)) throw cause;
		console.error(cause);
		error(503, 'Database unavailable.');
	}
};
