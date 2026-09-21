import { redirect } from '@sveltejs/kit';
import { listVenuesAdmin } from '$lib/server/venues';
import { clearAdminSession } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const venues = await listVenuesAdmin(locals.user);
	const filtered = q
		? venues.filter((venue) => {
				const hay = `${venue.name} ${venue.district} ${venue.slug}`.toLowerCase();
				return hay.includes(q.toLowerCase());
			})
		: venues;
	return { venues: filtered, q, total: venues.length, deleted: url.searchParams.get('deleted') === '1' };
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		await clearAdminSession(cookies);
		redirect(303, '/admin/login');
	}
};
