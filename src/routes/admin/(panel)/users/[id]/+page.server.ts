import { error, fail, redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { requireSuperuser } from '$lib/server/access';
import { listCommentsByUser } from '$lib/server/comments';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const ROLES = ['user', 'admin', 'editor', 'manager', 'superuser'] as const;

export const load: PageServerLoad = async ({ locals, params }) => {
	requireSuperuser(locals.user);
	const [row] = await db
		.select({
			id: users.id,
			firstName: users.firstName,
			email: users.email,
			phone: users.phone,
			role: sql<string>`lower(${users.role}::text)`
		})
		.from(users)
		.where(eq(users.id, params.id))
		.limit(1);

	if (!row) error(404, 'That account was not found.');

	const comments = await listCommentsByUser(row.id);
	return {
		account: {
			id: row.id,
			name: row.firstName?.trim() || row.email.split('@')[0] || 'Account',
			email: row.email,
			phone: row.phone,
			role: row.role || 'user'
		},
		roles: ROLES,
		comments,
		self: locals.user?.id === row.id
	};
};

export const actions: Actions = {
	role: async ({ request, locals, params }) => {
		requireSuperuser(locals.user);
		const data = await request.formData();
		const role = String(data.get('role') ?? '');
		if (!ROLES.includes(role as (typeof ROLES)[number])) {
			return fail(400, { error: 'Choose a role from the list.' });
		}
		if (locals.user?.id === params.id && role !== 'superuser') {
			return fail(400, { error: 'You can’t remove your own superuser role.' });
		}

		const [updated] = await db
			.update(users)
			.set({ role: role as (typeof ROLES)[number], updatedAt: new Date() })
			.where(eq(users.id, params.id))
			.returning({ id: users.id });

		if (!updated) return fail(404, { error: 'That account was not found.' });
		redirect(303, `/admin/users/${params.id}?saved=1`);
	}
};
