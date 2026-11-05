import { redirect } from '@sveltejs/kit';
import { listVenuesAdmin } from '$lib/server/venues';
import { clearAdminSession } from '$lib/server/auth';
import { canCreateVenue, canEditVenue } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

function intro(role: string, scopeName: string | null, canCreate: boolean, canEdit: boolean): string {
	if (role === 'superuser') {
		return 'Every place on the site. Edit a listing, post an alert, or report a closure.';
	}
	if (role === 'franchise_manager') {
		return 'Places assigned to this account. Edit a listing, post an alert, or report a closure.';
	}
	if (role === 'place_manager') {
		return scopeName
			? 'Edit the listing, post an alert, or report a temporary closure.'
			: 'No place is assigned to this account yet. A superuser assigns one from Users.';
	}
	if (canCreate && canEdit) return 'Places this account added. Edit a listing or add a new one.';
	if (canCreate) return 'Places this account added.';
	if (canEdit) return 'Places this account can edit.';
	return 'This account cannot create or edit places yet.';
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = locals.user;
	const role = user?.role ?? 'user';
	const q = url.searchParams.get('q')?.trim() ?? '';
	const listed = await listVenuesAdmin(user);
	const filtered = q
		? listed.filter((venue) => {
				const hay = `${venue.name} ${venue.district} ${venue.slug}`.toLowerCase();
				return hay.includes(q.toLowerCase());
			})
		: listed;

	const scopeName = role === 'place_manager' ? (listed[0]?.name ?? null) : null;

	return {
		venues: filtered.map((venue) => ({
			...venue,
			editable: canEditVenue(user, venue)
		})),
		q,
		total: listed.length,
		deleted: url.searchParams.get('deleted') === '1',
		role,
		scopeName,
		intro: intro(role, scopeName, canCreateVenue(user), Boolean(user?.canEdit))
	};
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		await clearAdminSession(cookies);
		redirect(303, '/login');
	}
};
