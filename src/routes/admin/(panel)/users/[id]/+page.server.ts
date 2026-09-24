import { error, fail, redirect } from '@sveltejs/kit';
import { asc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { requireSuperuser } from '$lib/server/access';
import { db } from '$lib/server/db';
import { comments, franchises, users, venues } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const commentPlace = alias(venues, 'comment_place');

const ROLES = [
	{ id: 'user', label: 'User' },
	{ id: 'place_manager', label: 'Place manager' },
	{ id: 'franchise_manager', label: 'Franchise manager' }
] as const;

type AssignableRole = (typeof ROLES)[number]['id'];

export const load: PageServerLoad = async ({ locals, params }) => {
	requireSuperuser(locals.user);
	const rows = await db
		.select({
			id: users.id,
			firstName: users.firstName,
			email: users.email,
			phone: users.phone,
			role: sql<string>`lower(${users.role}::text)`,
			venueId: users.venueId,
			franchiseId: users.franchiseId,
			placeName: venues.name,
			placeDistrict: venues.district,
			franchiseName: franchises.name,
			commentId: comments.id,
			commentBody: comments.body,
			commentAt: comments.createdAt,
			commentVenue: commentPlace.name,
			commentSlug: commentPlace.slug
		})
		.from(users)
		.leftJoin(venues, eq(users.venueId, venues.id))
		.leftJoin(franchises, eq(users.franchiseId, franchises.id))
		.leftJoin(comments, eq(comments.userId, users.id))
		.leftJoin(commentPlace, eq(comments.venueId, commentPlace.id))
		.where(eq(users.id, params.id))
		.orderBy(asc(comments.createdAt));
	const row = rows[0];
	if (!row) error(404, 'That account was not found.');

	const [places, groups] = await Promise.all([
		db
			.select({ id: venues.id, name: venues.name, district: venues.district })
			.from(venues)
			.orderBy(asc(venues.name)),
		db.select({ id: franchises.id, name: franchises.name }).from(franchises).orderBy(asc(franchises.name))
	]);

	return {
		account: {
			id: row.id,
			name: row.firstName?.trim() || row.email.split('@')[0] || 'Account',
			email: row.email,
			phone: row.phone,
			role: row.role || 'user',
			venueId: row.venueId,
			franchiseId: row.franchiseId,
			placeName: row.placeName ? `${row.placeName} · ${row.placeDistrict}` : null,
			franchiseName: row.franchiseName
		},
		roles: ROLES,
		places,
		franchises: groups,
		comments: rows.flatMap((item) =>
			item.commentId && item.commentVenue && item.commentSlug && item.commentAt
				? [
						{
							id: item.commentId,
							body: item.commentBody ?? '',
							createdAt: item.commentAt.toISOString(),
							venueName: item.commentVenue,
							venueSlug: item.commentSlug
						}
					]
				: []
		)
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
				.select({ id: venues.id })
				.from(venues)
				.where(eq(venues.id, venueId))
				.limit(1);
			if (!place) return fail(400, { error: 'That place no longer exists.' });
		}

		if (role === 'franchise_manager') {
			franchiseId = String(data.get('franchiseId') ?? '').trim();
			if (!franchiseId) return fail(400, { error: 'Choose the franchise this person manages.' });
			const [group] = await db
				.select({ id: franchises.id })
				.from(franchises)
				.where(eq(franchises.id, franchiseId))
				.limit(1);
			if (!group) return fail(400, { error: 'That franchise no longer exists.' });
		}

		await db
			.update(users)
			.set({ role, venueId, franchiseId, updatedAt: new Date() })
			.where(eq(users.id, params.id));
		redirect(303, `/admin/users/${params.id}?saved=1`);
	}
};
