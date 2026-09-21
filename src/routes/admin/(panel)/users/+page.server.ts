import { fail, redirect } from '@sveltejs/kit';
import { createStaffUser, listStaff } from '$lib/server/auth';
import { listVenuesAdmin } from '$lib/server/venues';
import { requireOwner } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireOwner(locals.user);
	const [staff, venues] = await Promise.all([listStaff(), listVenuesAdmin()]);
	return { staff, venues, created: url.searchParams.get('created') === '1' };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireOwner(locals.user);
		const data = await request.formData();
		const emails = String(data.get('emails') ?? '');
		const password = String(data.get('password') ?? '');
		const venueId = String(data.get('venueId') ?? '');
		const result = await createStaffUser({ emails, password, venueId });
		if (!result.ok) {
			return fail(400, { error: result.error, emails, venueId });
		}
		redirect(303, '/admin/users?created=1');
	}
};
