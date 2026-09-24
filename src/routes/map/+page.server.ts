import { error } from '@sveltejs/kit';
import { listMapPlaces } from '$lib/server/venues';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		return await listMapPlaces();
	} catch (cause) {
		console.error(cause);
		error(503, 'Database unavailable.');
	}
};
