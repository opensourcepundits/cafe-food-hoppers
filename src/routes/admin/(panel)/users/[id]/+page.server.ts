import { error, fail, redirect } from '@sveltejs/kit';
import { asc, eq, inArray, sql } from 'drizzle-orm';
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
			.select({
				id: venues.id,
				name: venues.name,
				district: venues.district,
				franchiseId: venues.franchiseId,
				franchiseName: franchises.name
			})
			.from(venues)
			.leftJoin(franchises, eq(venues.franchiseId, franchises.id))
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function submitted(data: FormData, error: string, status = 400) {
	return fail(status, {
		error,
		role: String(data.get('role') ?? ''),
		venueId: String(data.get('venueId') ?? ''),
		franchiseId: String(data.get('franchiseId') ?? ''),
		franchiseName: String(data.get('franchiseName') ?? ''),
		placeIds: data.getAll('placeIds').map((value) => String(value))
	});
}

function chosenPlaceIds(data: FormData): { ids: string[] } | { error: string } {
	const ids = [...new Set(data.getAll('placeIds').map((value) => String(value).trim()).filter(Boolean))];
	if (ids.some((id) => !UUID_RE.test(id))) return { error: 'One of those places is not valid.' };
	return { ids };
}

export const actions: Actions = {
	role: async ({ request, locals, params }) => {
		requireSuperuser(locals.user);
		const data = await request.formData();
		const role = String(data.get('role') ?? '') as AssignableRole;
		if (!ROLES.some((item) => item.id === role)) return submitted(data, 'Choose a role from the list.');

		const [existing] = await db
			.select({ role: sql<string>`lower(${users.role}::text)` })
			.from(users)
			.where(eq(users.id, params.id))
			.limit(1);
		if (!existing) return submitted(data, 'That account was not found.', 404);
		if (existing.role === 'superuser' || locals.user?.id === params.id) {
			return submitted(data, 'Superuser accounts are not changed here.');
		}

		let venueId: string | null = null;
		let franchiseId: string | null = null;
		const places = role === 'franchise_manager' ? chosenPlaceIds(data) : { ids: [] as string[] };
		if ('error' in places) return submitted(data, places.error);

		if (role === 'place_manager') {
			venueId = String(data.get('venueId') ?? '').trim();
			if (!venueId) return submitted(data, 'Choose the one place this person manages.');
			const [place] = await db
				.select({ id: venues.id })
				.from(venues)
				.where(eq(venues.id, venueId))
				.limit(1);
			if (!place) return submitted(data, 'That place no longer exists.');
		}

		if (role === 'franchise_manager') {
			const choice = String(data.get('franchiseId') ?? '').trim();
			const creating = choice === 'new';
			const name = String(data.get('franchiseName') ?? '')
				.trim()
				.replace(/\s+/g, ' ');

			if (!creating && !UUID_RE.test(choice)) {
				return submitted(data, 'Choose the franchise this person manages.');
			}
			if (creating && !name) return submitted(data, 'Name the new franchise.');
			if (creating && name.length > 80) return submitted(data, 'Keep the franchise name under 80 characters.');

			const outcome: { error: string } | { ok: true } = await db.transaction(async (tx) => {
				if (places.ids.length) {
					const found = await tx.select({ id: venues.id }).from(venues).where(inArray(venues.id, places.ids));
					if (found.length !== places.ids.length) return { error: 'One of those places no longer exists.' };
				}

				let nextFranchiseId = choice;
				if (creating) {
					const [duplicate] = await tx
						.select({ id: franchises.id })
						.from(franchises)
						.where(sql`lower(${franchises.name}) = lower(${name})`)
						.limit(1);
					if (duplicate) {
						return { error: 'A franchise with that name already exists. Choose it from the list.' };
					}
					const [created] = await tx.insert(franchises).values({ name }).returning({ id: franchises.id });
					nextFranchiseId = created.id;
				} else {
					const [group] = await tx
						.select({ id: franchises.id })
						.from(franchises)
						.where(eq(franchises.id, choice))
						.limit(1);
					if (!group) return { error: 'That franchise no longer exists.' };
				}

				if (places.ids.length) {
					await tx
						.update(venues)
						.set({ franchiseId: nextFranchiseId, updatedAt: new Date() })
						.where(inArray(venues.id, places.ids));
				}
				await tx
					.update(users)
					.set({ role, venueId: null, franchiseId: nextFranchiseId, updatedAt: new Date() })
					.where(eq(users.id, params.id));
				return { ok: true as const };
			});
			if ('error' in outcome) return submitted(data, outcome.error);
			redirect(303, `/admin/users/${params.id}?saved=1`);
		}

		await db
			.update(users)
			.set({ role, venueId, franchiseId, updatedAt: new Date() })
			.where(eq(users.id, params.id));
		redirect(303, `/admin/users/${params.id}?saved=1`);
	}
};
