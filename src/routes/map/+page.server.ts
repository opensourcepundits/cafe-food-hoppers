import { error } from '@sveltejs/kit';
import { DISTRICTS } from '$lib/venue';
import { listMapPlaces, parseFilters } from '$lib/server/venues';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const filters = parseFilters(url);

	try {
		const result = await listMapPlaces(filters);
		return { ...result, filters, districts: DISTRICTS };
	} catch (cause) {
		console.error(cause);
		error(503, 'Database unavailable.');
	}
};
