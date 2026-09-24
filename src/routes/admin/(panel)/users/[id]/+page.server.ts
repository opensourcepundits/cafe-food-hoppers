import { error, fail, redirect } from '@sveltejs/kit';
import { asc, eq, sql } from 'drizzle-orm';
import { requireSuperuser } from '$lib/server/access';
import { listCommentsByUser } from '$lib/server/comments';
import { db } from '$lib/server/db';
import { franchises, users, venues } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const ROLES = [
	{ id: 'user', label: 'User' },
	{ id: 'place_manager', label: 'Place manager' },
	{ id: 'franchise_manager', label: 'Franchise manager' }
] as const;

type AssignableRole = (typeof ROLES)[number]['id'];

export const load: PageServerLoad = async ({ locals, params }) => {
	requireSuperuser(locals.user);
	const [row] = await db
		.select({
			id: users.id,
			firstName: users.firstName,
			email: users.email,
			phone: users.phone,
			role: sql<string>`lower(${users.role}::text)`,
			venueId: users.venueId,
			franchiseId: users.franchiseId
		})
		.from(users)
		.where(eq(users.id, params.id))
		.limit(1);
	if (!row) error(404, 'That account was not found.');

	const [places, groups, comments] = await Promise.all([
		db
			.select({
				id: venues.id,
				name: venues.name,
				district: venues.district,
				franchiseId: venues.franchiseId
			})
			.from(venues)
			.orderBy(asc(venues.name)),
		db.select({ id: franchises.id, name: franchises.name }).from(franchises).orderBy(asc(franchises.name)),
		listCommentsByUser(row.id)
	]);

	return {
		account: {
			id: row.id,
			name: row.firstName?.trim() || row.email.split('@')[0] || 'Account',
			email: row.email,
			phone: row.phone,
			role: row.role || 'user',
			venueId: row.venueId,
			franchiseId: row.franchiseId
		},
		roles: ROLES,
		places,
		franchises: groups,
		comments
	};
};

export const actions: Actions = {
	role: async ({ request, locals, params }) => {
		requireSuperuser(locals.user);
		const data = await request.formData();
		const role = String(data.get('role') ?? '') as AssignableRole;
		if (!ROLES.some((item) => item.id === role)) return fail(400, { error: 'Choose a role from the list.' });

		const [existing] = await db
			.select({ role: sql<string>`lower(${users.role}::text)` })
			.from(users)
			.where(eq(users.id, params.id))
			.limit(1);
		if (!existing) return fail(404, { error: 'That account was not found.' });
		if (existing.role === 'superuser' || locals.user?.id === params.id) {
			return fail(400, { error: 'Superuser accounts are not changed here.' });
		}

		let venueId: string | null = null;
		let franchiseId: string | null = null;

		if (role === 'place_manager') {
			venueId = String(data.get('venueId') ?? '').trim();
			if (!venueId) return fail(400, { error: 'Choose the one place this person manages.' });
			const [place] = await db
				.select({ id: venues.id, name: venues.name, franchiseId: venues.franchiseId })
				.from(venues)
				.where(eq(venues.id, venueId))
				.limit(1);
			if (!place) return fail(400, { error: 'That place no longer exists.' });
			if (!place.franchiseId) {
				const [created] = await db
					.insert(franchises)
					.values({ name: place.name })
					.returning({ id: franchises.id });
				if (!created) return fail(500, { error: 'Could not tie this place to a franchise.' });
				await db.update(venues).set({ franchiseId: created.id }).where(eq(venues.id, place.id));
			}
		}

		if (role === 'franchise_manager') {
			const picked = String(data.get('franchiseId') ?? '').trim();
			if (picked === 'new') {
				const name = String(data.get('franchiseName') ?? '').trim();
				const venueIds = data.getAll('venueIds').map(String).filter(Boolean);
				if (!name) return fail(400, { error: 'Name the franchise.' });
				if (!venueIds.length) return fail(400, { error: 'A franchise needs at least one place.' });
				const [created] = await db.insert(franchises).values({ name }).returning({ id: franchises.id });
				if (!created) return fail(500, { error: 'Could not create the franchise.' });
				franchiseId = created.id;
				for (const id of venueIds) {
					await db.update(venues).set({ franchiseId }).where(eq(venues.id, id));
				}
			} else {
				franchiseId = picked;
				if (!franchiseId) return fail(400, { error: 'Choose the franchise this person manages.' });
				const places = await db
					.select({ id: venues.id })
					.from(venues)
					.where(eq(venues.franchiseId, franchiseId));
				if (!places.length) return fail(400, { error: 'That franchise has no places yet.' });
			}
		}

		await db
			.update(users)
			.set({ role, venueId, franchiseId, updatedAt: new Date() })
			.where(eq(users.id, params.id));
		redirect(303, `/admin/users/${params.id}?saved=1`);
	}
};
