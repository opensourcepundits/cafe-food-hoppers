import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { favourites, venues } from '$lib/server/db/schema';

export type FavouritePlace = {
	id: string;
	name: string;
	slug: string;
	district: string;
};

export async function isFavourite(userId: string, venueId: string): Promise<boolean> {
	const [row] = await db
		.select({ venueId: favourites.venueId })
		.from(favourites)
		.where(and(eq(favourites.userId, userId), eq(favourites.venueId, venueId)))
		.limit(1);
	return Boolean(row);
}

export async function toggleFavourite(userId: string, venueId: string): Promise<boolean> {
	const existing = await isFavourite(userId, venueId);
	if (existing) {
		await db.delete(favourites).where(and(eq(favourites.userId, userId), eq(favourites.venueId, venueId)));
		return false;
	}
	await db.insert(favourites).values({ userId, venueId });
	return true;
}

export async function listFavourites(userId: string): Promise<FavouritePlace[]> {
	const rows = await db
		.select({
			id: venues.id,
			name: venues.name,
			slug: venues.slug,
			district: venues.district
		})
		.from(favourites)
		.innerJoin(venues, eq(favourites.venueId, venues.id))
		.where(eq(favourites.userId, userId))
		.orderBy(desc(favourites.createdAt));
	return rows;
}
