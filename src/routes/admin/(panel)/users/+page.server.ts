import { fail, redirect } from '@sveltejs/kit';
import { listRegisteredUsers, setAccountAccess, type AccountKind } from '$lib/server/auth';
import { requireSuperuser } from '$lib/server/access';
import { db } from '$lib/server/db';
import { venues } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireSuperuser(locals.user);
	const [accounts, places] = await Promise.all([
		listRegisteredUsers(),
		db
			.select({ id: venues.id, name: venues.name, district: venues.district, slug: venues.slug })
			.from(venues)
			.orderBy(venues.name)
	]);
	return { accounts, places, saved: url.searchParams.get('saved') === '1' };
};

export const actions: Actions = {
	access: async ({ request, locals }) => {
		requireSuperuser(locals.user);
		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const kindRaw = String(data.get('kind') ?? 'standard');
		const kind: AccountKind = kindRaw === 'shop' || kindRaw === 'placement' ? kindRaw : 'standard';
		const venueId = String(data.get('venueId') ?? '').trim() || null;
		const result = await setAccountAccess(userId, {
			canCreate: data.get('canCreate') === '1',
			canEdit: data.get('canEdit') === '1',
			kind,
			venueId,
			venueIds: data.getAll('venueIds').map(String)
		});
		if (!result.ok) return fail(400, { error: result.error, userId });
		redirect(303, '/admin/users?saved=1');
	}
};
