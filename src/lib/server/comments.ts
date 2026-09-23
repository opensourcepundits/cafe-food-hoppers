import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { comments, users } from '$lib/server/db/schema';

export type PlaceComment = {
	id: string;
	body: string;
	createdAt: string;
	author: string;
};

export async function listComments(venueId: string): Promise<PlaceComment[]> {
	const rows = await db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			firstName: users.firstName,
			email: users.email
		})
		.from(comments)
		.innerJoin(users, eq(comments.userId, users.id))
		.where(eq(comments.venueId, venueId))
		.orderBy(desc(comments.createdAt));

	return rows.map((row) => ({
		id: row.id,
		body: row.body,
		createdAt: row.createdAt.toISOString(),
		author: displayName(row.firstName, row.email)
	}));
}

export async function addComment(venueId: string, userId: string, body: string): Promise<void> {
	await db.insert(comments).values({ venueId, userId, body });
}

export function displayName(firstName: string | null | undefined, email: string): string {
	const name = firstName?.trim();
	if (name) return name;
	const local = email.split('@')[0]?.trim();
	return local || 'Member';
}
