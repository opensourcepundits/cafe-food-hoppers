import { sql } from 'drizzle-orm';
import { requireSuperuser } from '$lib/server/access';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export type AccountRow = {
	id: string;
	name: string;
	email: string;
	role: string;
};

export const load: PageServerLoad = async ({ locals }) => {
	requireSuperuser(locals.user);
	const rows = await db
		.select({
			id: users.id,
			firstName: users.firstName,
			email: users.email,
			role: sql<string>`lower(${users.role}::text)`
		})
		.from(users)
		.orderBy(users.firstName, users.email);

	const accounts: AccountRow[] = rows.map((row) => ({
		id: row.id,
		name: row.firstName?.trim() || row.email.split('@')[0] || 'Account',
		email: row.email,
		role: row.role || 'user'
	}));

	return { accounts };
};
