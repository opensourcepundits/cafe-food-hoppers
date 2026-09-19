import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { venues, type VenueRow } from '$lib/server/db/schema';
import {
	activeAnnouncements,
	isWorkFriendly,
	isOpenNow,
	isOpenTillLate,
	ongoingSpecials,
	upcomingSpecials,
	type Announcement,
	type Contact,
	type LiveVenue,
	type MenuCategory,
	type OpeningHours,
	type Special,
	type SpecialFeedItem,
	type Venue,
	type VenueFilters,
	type WorkInfo
} from '$lib/venue';

function asObject<T>(value: unknown, fallback: T): T {
	return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as T) : fallback;
}

function asArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

export function mapVenue(row: VenueRow): Venue {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		district: row.district,
		lat: row.lat,
		lng: row.lng,
		isFeatured: row.isFeatured,
		featuredPriority: row.featuredPriority,
		workInfo: asObject<WorkInfo>(row.workInfo, {}),
		openingHours: asObject<OpeningHours>(row.openingHours, {}),
		announcements: asArray<Announcement>(row.announcements),
		specials: asArray<Special>(row.specials),
		menu: asArray<MenuCategory>(row.menu),
		contact: asObject<Contact>(row.contact, {}),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export function parseFilters(url: URL): VenueFilters {
	return {
		q: url.searchParams.get('q')?.trim() ?? '',
		district: url.searchParams.get('district')?.trim() ?? '',
		wifi: url.searchParams.get('wifi') === '1',
		outlets: url.searchParams.get('outlets') === '1',
		workFriendly: url.searchParams.get('work') === '1',
		notWorkFriendly: url.searchParams.get('notwork') === '1',
		openNow: url.searchParams.get('open') === '1',
		late: url.searchParams.get('late') === '1',
		ongoingSpecials: url.searchParams.get('ongoing') === '1',
		upcomingSpecials: url.searchParams.get('upcoming') === '1'
	};
}

export async function listVenues(filters: VenueFilters): Promise<LiveVenue[]> {
	const conditions: SQL[] = [];

	if (filters.district) {
		conditions.push(eq(venues.district, filters.district));
	}

	if (filters.wifi) {
		conditions.push(sql`${venues.workInfo} @> '{"wifi":true}'::jsonb`);
	}

	if (filters.outlets) {
		conditions.push(sql`${venues.workInfo} @> '{"outlets":true}'::jsonb`);
	}

	if (filters.q) {
		const pattern = `%${filters.q}%`;
		const menuMatch = sql`exists (
			select 1
			from jsonb_array_elements(${venues.menu}) as category,
			     jsonb_array_elements(category->'items') as item
			where item->>'name' ilike ${pattern}
			   or coalesce(item->>'description', '') ilike ${pattern}
			   or category->>'category' ilike ${pattern}
		)`;
		const specialMatch = sql`exists (
			select 1
			from jsonb_array_elements(${venues.specials}) as special
			where special->>'title' ilike ${pattern}
			   or coalesce(special->>'body', '') ilike ${pattern}
		)`;

		conditions.push(
			or(
				ilike(venues.name, pattern),
				ilike(venues.district, pattern),
				menuMatch,
				specialMatch
			) as SQL
		);
	}

	const rows = await db
		.select()
		.from(venues)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(venues.isFeatured), desc(venues.featuredPriority), venues.name);

	let mapped = rows.map((row) => withLiveState(mapVenue(row)));

	if (filters.openNow) {
		mapped = mapped.filter((venue) => venue.open);
	}

	if (filters.late) {
		mapped = mapped.filter((venue) => venue.openLate);
	}

	if (filters.workFriendly !== filters.notWorkFriendly) {
		mapped = mapped.filter((venue) =>
			filters.workFriendly ? venue.workFriendly : !venue.workFriendly
		);
	}

	if (filters.ongoingSpecials && filters.upcomingSpecials) {
		mapped = mapped.filter(
			(venue) => venue.ongoingSpecials.length > 0 || venue.upcomingSpecials.length > 0
		);
	} else if (filters.ongoingSpecials) {
		mapped = mapped.filter((venue) => venue.ongoingSpecials.length > 0);
	} else if (filters.upcomingSpecials) {
		mapped = mapped.filter((venue) => venue.upcomingSpecials.length > 0);
	}

	return mapped;
}

export async function getVenueBySlug(slug: string): Promise<LiveVenue | null> {
	const [row] = await db.select().from(venues).where(eq(venues.slug, slug)).limit(1);
	return row ? withLiveState(mapVenue(row)) : null;
}

export function withLiveState(venue: Venue): LiveVenue {
	return {
		...venue,
		open: isOpenNow(venue.openingHours),
		openLate: isOpenTillLate(venue.openingHours),
		workFriendly: isWorkFriendly(venue.workInfo),
		alerts: activeAnnouncements(venue.announcements),
		ongoingSpecials: ongoingSpecials(venue.specials),
		upcomingSpecials: upcomingSpecials(venue.specials)
	};
}

export async function listSpecialsFeed(): Promise<SpecialFeedItem[]> {
	const rows = await db
		.select()
		.from(venues)
		.orderBy(desc(venues.isFeatured), desc(venues.featuredPriority), venues.name);

	const feed: SpecialFeedItem[] = [];

	for (const venue of rows.map(mapVenue)) {
		for (const special of ongoingSpecials(venue.specials)) {
			feed.push({
				venueId: venue.id,
				venueName: venue.name,
				venueSlug: venue.slug,
				district: venue.district,
				special,
				status: 'ongoing'
			});
		}
		for (const special of upcomingSpecials(venue.specials)) {
			feed.push({
				venueId: venue.id,
				venueName: venue.name,
				venueSlug: venue.slug,
				district: venue.district,
				special,
				status: 'upcoming'
			});
		}
	}

	return feed.sort((a, b) => {
		if (a.status !== b.status) return a.status === 'ongoing' ? -1 : 1;
		const aTime = Date.parse(a.status === 'ongoing' ? (a.special.ends_at ?? a.special.starts_at) : a.special.starts_at);
		const bTime = Date.parse(b.status === 'ongoing' ? (b.special.ends_at ?? b.special.starts_at) : b.special.starts_at);
		return aTime - bTime;
	});
}
