import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { venues, type VenueRow } from '$lib/server/db/schema';
import type { AuthUser } from '$lib/server/auth';
import type { VenueWrite } from '$lib/server/venue-input';
import {
	activeAnnouncements,
	isWorkFriendly,
	distanceMeters,
	isOpenNow,
	isOpenTillLate,
	normalizeOpeningHours,
	ZOOM_WALK_METERS,
	ongoingSpecials,
	upcomingSpecials,
	type Announcement,
	type Contact,
	type LiveVenue,
	type MenuCategory,
	type OpeningHours,
	type Special,
	amenityLabels,
	hoursLabel,
	noiseLabel,
	outletRatingLabel,
	outletRatingOf,
	parseMapsPin,
	wifiLabel,
	type MapPlace,
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
		wifiTestedAt: row.wifiTestedAt ? new Date(row.wifiTestedAt).toISOString() : null,
		wifiDownloadMbps: row.wifiDownloadMbps,
		wifiUploadMbps: row.wifiUploadMbps,
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
		outdoor: url.searchParams.get('outdoor') === '1',
		lighting: (['natural', 'warm', 'bright', 'dim'] as const).filter(
			(type) => url.searchParams.get(`light_${type}`) === '1'
		),
		outletRatings: (['scarce', 'moderate', 'abundant'] as const).filter(
			(rating) => url.searchParams.get(`outlets_${rating}`) === '1'
		),
		ergonomic: (['low', 'moderate', 'high'] as const).filter(
			(level) => url.searchParams.get(`ergo_${level}`) === '1'
		),
		zoom: url.searchParams.get('zoom') === '1',
		lat: asCoord(url.searchParams.get('lat')),
		lng: asCoord(url.searchParams.get('lng'))
	};
}

function asCoord(value: string | null): number | null {
	if (!value) return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function workContains(fragment: string): SQL {
	return sql`${venues.workInfo} @> ${sql.raw(`'${fragment}'::jsonb`)}`;
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

	for (const type of filters.lighting) {
		conditions.push(sql`${venues.workInfo}->'lighting' @> ${sql.raw(`'["${type}"]'::jsonb`)}`);
	}

	if (filters.outletRatings.length) {
		conditions.push(
			or(...filters.outletRatings.map((rating) => workContains(`{"outlet_rating":"${rating}"}`))) as SQL
		);
	}

	if (filters.ergonomic.length) {
		conditions.push(
			or(...filters.ergonomic.map((level) => workContains(`{"ergonomic_index":"${level}"}`))) as SQL
		);
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

	if (filters.zoom && filters.lat !== null && filters.lng !== null) {
		const originLat = filters.lat;
		const originLng = filters.lng;
		mapped = mapped
			.filter(
				(venue) =>
					venue.open &&
					venue.lat !== null &&
					venue.lng !== null &&
					venue.workInfo.noise_level === 'quiet' &&
					venue.workInfo.wifi === true &&
					venue.workInfo.wifi_quality === 'fast'
			)
			.map((venue) => ({
				...venue,
				walkMeters: distanceMeters(originLat, originLng, venue.lat as number, venue.lng as number)
			}))
			.filter((venue) => (venue.walkMeters ?? Infinity) <= ZOOM_WALK_METERS)
			.sort((a, b) => (a.walkMeters ?? 0) - (b.walkMeters ?? 0));
	} else if (filters.zoom) {
		mapped = [];
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
	if (!user || user.role === 'superuser') return mapped;
	return mapped.filter((venue) => {
		if (user.role === 'franchise_manager' || user.role === 'place_manager') return user.venueIds.includes(venue.id);
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
	badges: {
		speedVerified: boolean;
		noiseVerified: boolean;
		wifiTestedAt: Date | null;
		wifiDownloadMbps: number | null;
		wifiUploadMbps: number | null;
	}
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
		walkMeters: null,
		alerts: activeAnnouncements(venue.announcements),
		ongoingSpecials: ongoingSpecials(venue.specials),
		upcomingSpecials: upcomingSpecials(venue.specials)
	};
}

export function placePin(venue: Pick<Venue, 'lat' | 'lng' | 'contact'>): { lat: number; lng: number } | null {
	const fromUrl = parseMapsPin(venue.contact.google_maps ?? '');
	if (fromUrl) return fromUrl;
	if (venue.lat !== null && venue.lng !== null) return { lat: venue.lat, lng: venue.lng };
	return null;
}

function toMapPlace(venue: LiveVenue, pin: { lat: number; lng: number }): MapPlace {
	const bits = [
		venue.workFriendly ? 'Work friendly' : null,
		wifiLabel(venue.workInfo),
		outletRatingLabel(outletRatingOf(venue.workInfo)),
		noiseLabel(venue.workInfo.noise_level),
		...amenityLabels(venue.workInfo)
	].filter((value): value is string => Boolean(value));

	return {
		id: venue.id,
		name: venue.name,
		slug: venue.slug,
		district: venue.district,
		lat: pin.lat,
		lng: pin.lng,
		open: venue.open,
		openLate: venue.openLate,
		hours: hoursLabel(venue.openingHours),
		bits: bits.slice(0, 5),
		special: venue.ongoingSpecials[0]?.title ?? venue.upcomingSpecials[0]?.title ?? null,
		alert: venue.alerts.length > 0
	};
}

export async function listMapPlaces(
	filters: VenueFilters
): Promise<{ places: MapPlace[]; missing: number }> {
	const matched = await listVenues(filters);
	const places: MapPlace[] = [];
	let missing = 0;

	for (const venue of matched) {
		const pin = placePin(venue);
		if (!pin) {
			missing += 1;
			continue;
		}
		places.push(toMapPlace(venue, pin));
	}

	return { places, missing };
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
