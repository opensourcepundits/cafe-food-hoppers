import {
	DISTRICTS,
	datetimeLocalToIso,
	emptyOpeningHours,
	orderedWeekdays,
	parseMapsPin,
	slugify,
	type Announcement,
	type AnnouncementType,
	type Contact,
	type DayHours,
	type HourSpan,
	type MenuCategory,
	type MenuItem,
	type NoiseLevel,
	type OpeningHours,
	type OutletAccess,
	type Special,
	type Venue,
	type WifiQuality,
	type WorkInfo
} from '$lib/venue';

export type VenueWrite = Omit<Venue, 'id' | 'createdAt' | 'updatedAt'>;

const ANNOUNCEMENT_TYPES = new Set<AnnouncementType>(['event', 'closure', 'notice', 'alert']);
const WIFI_QUALITY = new Set<WifiQuality>(['fast', 'ok', 'slow']);
const OUTLET_ACCESS = new Set<OutletAccess>(['plenty', 'some', 'none']);
const NOISE = new Set<NoiseLevel>(['quiet', 'moderate', 'loud']);

export function parseVenuePayload(raw: unknown): { ok: true; value: VenueWrite } | { ok: false; error: string } {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false, error: 'Invalid venue payload.' };
	}

	const input = raw as Record<string, unknown>;
	const name = asString(input.name);
	if (!name) return { ok: false, error: 'Name is required.' };

	const slug = slugify(asString(input.slug) || name);
	const district = asString(input.district) || DISTRICTS[0];
	const contact = parseContact(input.contact);
	const pin = parseMapsPin(contact.google_maps ?? '');
	const lat = pin?.lat ?? asNumber(input.lat, true);
	const lng = pin?.lng ?? asNumber(input.lng, true);

	if ((lat === null) !== (lng === null)) {
		return { ok: false, error: 'Paste a Google Maps pin that includes the place location.' };
	}

	return {
		ok: true,
		value: {
			name,
			slug,
			district,
			lat,
			lng,
			isFeatured: Boolean(input.isFeatured),
			featuredPriority: Math.round(asNumber(input.featuredPriority) ?? 0),
			workInfo: parseWorkInfo(input.workInfo),
			openingHours: parseHours(input.openingHours),
			announcements: parseAnnouncements(input.announcements),
			specials: parseSpecials(input.specials),
			menu: parseMenu(input.menu),
			contact
		}
	};
}

export function payloadFromForm(data: FormData): { ok: true; value: VenueWrite } | { ok: false; error: string } {
	const raw = data.get('payload');
	if (typeof raw !== 'string' || !raw.trim()) {
		return { ok: false, error: 'Nothing to save.' };
	}
	try {
		return parseVenuePayload(JSON.parse(raw));
	} catch {
		return { ok: false, error: 'Could not read the form payload.' };
	}
}

function parseWorkInfo(value: unknown): WorkInfo {
	const input = asRecord(value);
	const wifi = Boolean(input.wifi);
	const outlets = Boolean(input.outlets);
	const quality = asString(input.wifi_quality);
	const access = asString(input.outlet_access);
	const noise = asString(input.noise_level);
	return {
		wifi,
		wifi_quality: WIFI_QUALITY.has(quality as WifiQuality) ? (quality as WifiQuality) : undefined,
		outlets,
		outlet_access: OUTLET_ACCESS.has(access as OutletAccess) ? (access as OutletAccess) : undefined,
		laptop_friendly: Boolean(input.laptop_friendly),
		noise_level: NOISE.has(noise as NoiseLevel) ? (noise as NoiseLevel) : undefined,
		notes: asString(input.notes) || undefined
	};
}

function parseHours(value: unknown): OpeningHours {
	const input = asRecord(value);
	const hours: OpeningHours = { timezone: 'Indian/Mauritius' };
	for (const day of orderedWeekdays()) {
		const raw = asRecord(input[day]);
		const closed = Boolean(raw.closed);
		const spans = parseSpans(raw.spans);
		if (!spans.length) {
			spans.push({
				open: asTime(raw.open, '08:00'),
				close: asTime(raw.close, '17:00')
			});
		}
		hours[day] = {
			closed,
			open: spans[0].open,
			close: spans[0].close,
			spans
		} satisfies DayHours;
	}
	return Object.keys(asRecord(value)).length ? hours : emptyOpeningHours();
}

function parseSpans(value: unknown): HourSpan[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		const raw = asRecord(item);
		const open = asTime(raw.open, '');
		const close = asTime(raw.close, '');
		if (!open || !close) return [];
		return [{ open, close }];
	});
}

function parseAnnouncements(value: unknown): Announcement[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item, index) => {
		const raw = asRecord(item);
		const title = asString(raw.title);
		const body = asString(raw.body);
		const starts = datetimeLocalToIso(asString(raw.starts_at)) ?? asString(raw.starts_at);
		if (!title || !body || !starts) return [];
		const type = asString(raw.type);
		const ends = datetimeLocalToIso(asString(raw.ends_at)) ?? (asString(raw.ends_at) || null);
		return [
			{
				id: asString(raw.id) || `announcement-${index + 1}`,
				type: ANNOUNCEMENT_TYPES.has(type as AnnouncementType) ? (type as AnnouncementType) : 'notice',
				title,
				body,
				starts_at: starts,
				ends_at: ends
			}
		];
	});
}

function parseSpecials(value: unknown): Special[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item, index) => {
		const raw = asRecord(item);
		const title = asString(raw.title);
		const body = asString(raw.body);
		const starts = datetimeLocalToIso(asString(raw.starts_at)) ?? asString(raw.starts_at);
		if (!title || !body || !starts) return [];
		const ends = datetimeLocalToIso(asString(raw.ends_at)) ?? (asString(raw.ends_at) || null);
		return [
			{
				id: asString(raw.id) || `special-${index + 1}`,
				title,
				body,
				starts_at: starts,
				ends_at: ends
			}
		];
	});
}

function parseMenu(value: unknown): MenuCategory[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap((category) => {
		const raw = asRecord(category);
		const name = asString(raw.category);
		const items = Array.isArray(raw.items) ? raw.items.flatMap(parseMenuItem) : [];
		if (!name || items.length === 0) return [];
		return [{ category: name, items }];
	});
}

function parseMenuItem(value: unknown): MenuItem[] {
	const raw = asRecord(value);
	const name = asString(raw.name);
	if (!name) return [];
	const tags = Array.isArray(raw.tags)
		? raw.tags.map((tag) => asString(tag)).filter(Boolean)
		: asString(raw.tags)
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean);
	return [
		{
			name,
			description: asString(raw.description) || undefined,
			price_mur: Math.max(0, asNumber(raw.price_mur) ?? 0),
			tags: tags.length ? tags : undefined
		}
	];
}

function parseContact(value: unknown): Contact {
	const raw = asRecord(value);
	return {
		phone: asString(raw.phone) || undefined,
		instagram: asString(raw.instagram) || undefined,
		website: asString(raw.website) || undefined,
		email: asString(raw.email) || undefined,
		google_maps: asString(raw.google_maps) || undefined
	};
}

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown, emptyAsNull = false): number | null {
	if (value === '' || value === null || value === undefined) return emptyAsNull ? null : 0;
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) return emptyAsNull ? null : 0;
	return n;
}

function asTime(value: unknown, fallback: string): string {
	const text = asString(value);
	const match = text.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
	return match ? match[1] : fallback;
}

export function isUniqueViolation(error: unknown): boolean {
	return Boolean(
		error &&
			typeof error === 'object' &&
			'code' in error &&
			(error as { code?: string }).code === '23505'
	);
}
