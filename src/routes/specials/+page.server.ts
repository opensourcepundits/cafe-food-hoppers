import { error } from '@sveltejs/kit';
import { listSpecialsFeed } from '$lib/server/venues';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const items = await listSpecialsFeed();
		return {
			ongoing: items.filter((item) => item.status === 'ongoing'),
			upcoming: items.filter((item) => item.status === 'upcoming')
		};
	} catch (cause) {
		console.error(cause);
		error(503, 'Database unavailable.');
	}
};
