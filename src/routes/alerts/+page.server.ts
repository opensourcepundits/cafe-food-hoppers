import { error } from '@sveltejs/kit';
import { listFavourites } from '$lib/server/favourites';
import { listAlertsFeed } from '$lib/server/venues';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const saved = locals.user ? await listFavourites(locals.user.id) : [];
		const items = await listAlertsFeed(new Set(saved.map((place) => place.id)));
		return { items };
	} catch (cause) {
		console.error(cause);
		error(503, 'Database unavailable.');
	}
};
