import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { comments, users, venues } from '$lib/server/db/schema';

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

export type UserComment = {
	id: string;
	body: string;
	createdAt: string;
	venueName: string;
	venueSlug: string;
};

export async function listCommentsByUser(userId: string): Promise<UserComment[]> {
	const rows = await db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			venueName: venues.name,
			venueSlug: venues.slug
		})
		.from(comments)
		.innerJoin(venues, eq(comments.venueId, venues.id))
		.where(eq(comments.userId, userId))
		.orderBy(desc(comments.createdAt));

	return rows.map((row) => ({
		id: row.id,
		body: row.body,
		createdAt: row.createdAt.toISOString(),
		venueName: row.venueName,
		venueSlug: row.venueSlug
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
