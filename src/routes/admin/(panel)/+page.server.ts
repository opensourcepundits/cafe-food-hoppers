import { redirect } from '@sveltejs/kit';
import { listVenuesAdmin } from '$lib/server/venues';
import { clearAdminSession } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const venues = await listVenuesAdmin();
	const filtered = q
		? venues.filter((venue) => {
				const hay = `${venue.name} ${venue.district} ${venue.slug}`.toLowerCase();
				return hay.includes(q.toLowerCase());
			})
		: venues;
	return { venues: filtered, q, total: venues.length };
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		await clearAdminSession(cookies);
		redirect(303, '/admin/login');
	}
};
