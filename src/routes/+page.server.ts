import { error } from '@sveltejs/kit';
import { DISTRICTS } from '$lib/venue';
import { listVenues, parseFilters } from '$lib/server/venues';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const filters = parseFilters(url);

	try {
		const venues = await listVenues(filters);
		return { venues, filters, districts: DISTRICTS };
	} catch (cause) {
		console.error(cause);
		error(
			503,
			'Database unavailable. Start Postgres with npm run db:start, then npm run db:push && npm run db:seed.'
		);
	}
};
