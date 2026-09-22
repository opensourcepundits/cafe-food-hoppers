import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { venues, type VenueRow } from '$lib/server/db/schema';
import type { AuthUser } from '$lib/server/auth';
import type { VenueWrite } from '$lib/server/venue-input';
import {
	activeAnnouncements,
	isWorkFriendly,
	isOpenNow,
	isOpenTillLate,
	normalizeOpeningHours,
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
	type VenueImage,
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
	const contact = asObject<Contact>(row.contact, {});
	const storedImages = asArray<VenueImage>(
		'images' in contact ? (contact as Contact & { images?: VenueImage[] }).images : []
	);
	const { images: _ignored, ...publicContact } = contact as Contact & { images?: VenueImage[] };
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
		openingHours: normalizeOpeningHours(asObject<OpeningHours>(row.openingHours, {})),
		announcements: asArray<Announcement>(row.announcements),
		specials: asArray<Special>(row.specials),
		menu: asArray<MenuCategory>(row.menu),
		contact: publicContact,
		images: storedImages.filter((image) => Boolean(image?.url)),
		createdBy: row.createdBy,
		speedVerified: row.speedVerified,
		noiseVerified: row.noiseVerified,
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
		upcomingSpecials: url.searchParams.get('upcoming') === '1',
		niceView: url.searchParams.get('view') === '1',
		ocean: url.searchParams.get('ocean') === '1',
		airConditioning: url.searchParams.get('ac') === '1',
		indoor: url.searchParams.get('indoor') === '1',
		outdoor: url.searchParams.get('outdoor') === '1'
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

	if (filters.niceView) {
		conditions.push(sql`${venues.workInfo} @> '{"nice_view":true}'::jsonb`);
	}

	if (filters.ocean) {
		conditions.push(sql`${venues.workInfo} @> '{"close_to_ocean":true}'::jsonb`);
	}

	if (filters.airConditioning) {
		conditions.push(sql`${venues.workInfo} @> '{"air_conditioning":true}'::jsonb`);
	}

	if (filters.indoor) {
		conditions.push(sql`${venues.workInfo} @> '{"indoor_seating":true}'::jsonb`);
	}

	if (filters.outdoor) {
		conditions.push(sql`${venues.workInfo} @> '{"outdoor_seating":true}'::jsonb`);
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

export async function listVenuesAdmin(user?: AuthUser | null): Promise<Venue[]> {
	const rows = await db.select().from(venues).orderBy(venues.name);
	const mapped = rows.map(mapVenue);
	if (!user || user.role === 'superuser' || user.role === 'admin') return mapped;
	return mapped.filter((venue) => {
		if (user.role === 'editor' && user.venueId === venue.id) return true;
		return venue.createdBy === user.id;
	});
}

export async function getVenueById(id: string): Promise<Venue | null> {
	const [row] = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
	return row ? mapVenue(row) : null;
}

function persist(input: VenueWrite, slug: string) {
	const { images, ...rest } = input;
	return {
		...rest,
		slug,
		contact: { ...input.contact, images }
	};
}

export async function createVenue(input: VenueWrite, createdBy: string): Promise<Venue> {
	const slug = await uniqueSlug(input.slug);
	const [row] = await db.insert(venues).values({ ...persist(input, slug), createdBy }).returning();
	if (!row) throw new Error('Insert failed');
	return mapVenue(row);
}

export async function setVenueBadges(
	id: string,
	badges: { speedVerified: boolean; noiseVerified: boolean }
): Promise<Venue | null> {
	const [row] = await db
		.update(venues)
		.set({ ...badges, updatedAt: new Date() })
		.where(eq(venues.id, id))
		.returning();
	return row ? mapVenue(row) : null;
}

export async function updateVenue(id: string, input: VenueWrite): Promise<Venue | null> {
	const slug = await uniqueSlug(input.slug, id);
	const [row] = await db
		.update(venues)
		.set({ ...persist(input, slug), updatedAt: new Date() })
		.where(eq(venues.id, id))
		.returning();
	return row ? mapVenue(row) : null;
}

export async function deleteVenue(id: string): Promise<boolean> {
	const deleted = await db.delete(venues).where(eq(venues.id, id)).returning();
	return deleted.length > 0;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
	if (excludeId) {
		const [current] = await db
			.select({ id: venues.id, slug: venues.slug })
			.from(venues)
			.where(eq(venues.id, excludeId))
			.limit(1);
		if (current && current.slug === base) return current.slug;
	}

	let candidate = base;
	let n = 2;
	while (n < 50) {
		const [row] = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, candidate)).limit(1);
		if (!row || String(row.id) === String(excludeId)) return candidate;
		candidate = `${base.slice(0, 70)}-${n}`;
		n += 1;
	}
	return `${base.slice(0, 60)}-${Date.now().toString(36)}`;
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
