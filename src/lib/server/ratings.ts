import { and, avg, count, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { ratings } from '$lib/server/db/schema';
import type { RatingSummary } from '$lib/venue';

const emptySummary: RatingSummary = { average: null, count: 0 };

function toSummary(average: unknown, total: unknown): RatingSummary {
	const ratingCount = Number(total ?? 0);
	if (!ratingCount) return emptySummary;
	const value = Number(average);
	if (!Number.isFinite(value)) return { average: null, count: ratingCount };
	return { average: Math.round(value * 10) / 10, count: ratingCount };
}

export async function ratingSummaries(venueIds: string[]): Promise<Map<string, RatingSummary>> {
	const summaries = new Map<string, RatingSummary>();
	if (venueIds.length === 0) return summaries;

	const rows = await db
		.select({
			venueId: ratings.venueId,
			average: avg(ratings.stars),
			total: count()
		})
		.from(ratings)
		.where(inArray(ratings.venueId, venueIds))
		.groupBy(ratings.venueId);

	for (const row of rows) summaries.set(row.venueId, toSummary(row.average, row.total));
	return summaries;
}

export async function ratingSummary(venueId: string): Promise<RatingSummary> {
	const summaries = await ratingSummaries([venueId]);
	return summaries.get(venueId) ?? emptySummary;
}

export async function userStars(userId: string, venueId: string): Promise<number | null> {
	const [row] = await db
		.select({ stars: ratings.stars })
		.from(ratings)
		.where(and(eq(ratings.userId, userId), eq(ratings.venueId, venueId)))
		.limit(1);
	return row?.stars ?? null;
}

export async function setRating(venueId: string, userId: string, stars: number): Promise<void> {
	await db
		.insert(ratings)
		.values({ venueId, userId, stars })
		.onConflictDoUpdate({
			target: [ratings.venueId, ratings.userId],
			set: { stars, updatedAt: sql`now()` }
		});
}
