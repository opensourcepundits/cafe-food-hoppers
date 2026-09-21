export const DISTRICTS = ['Grand Baie', 'Ebène', 'Tamarin', 'Port Louis', 'Moka'] as const;
export type District = (typeof DISTRICTS)[number];

export const MAURITIUS_TZ = 'Indian/Mauritius';

export const WEEKDAYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type WifiQuality = 'fast' | 'ok' | 'slow';
export type OutletAccess = 'plenty' | 'some' | 'none';
export type NoiseLevel = 'quiet' | 'moderate' | 'loud';

export type WorkInfo = {
	wifi?: boolean;
	wifi_quality?: WifiQuality;
	outlets?: boolean;
	outlet_access?: OutletAccess;
	laptop_friendly?: boolean;
	noise_level?: NoiseLevel;
	notes?: string;
};

export type HourSpan = {
	open: string;
	close: string;
};

export type DayHours = {
	open?: string;
	close?: string;
	spans?: HourSpan[];
	closed?: boolean;
};

export type OpeningHours = {
	timezone?: string;
} & Partial<Record<Weekday, DayHours>>;

export type AnnouncementType = 'event' | 'closure' | 'notice' | 'alert';

export type Announcement = {
	id: string;
	type: AnnouncementType;
	title: string;
	body: string;
	starts_at: string;
	ends_at: string | null;
};

export type Special = {
	id: string;
	title: string;
	body: string;
	starts_at: string;
	ends_at: string | null;
};

export type SpecialTiming = 'upcoming' | 'ongoing' | 'ended';

export type SpecialFeedItem = {
	venueId: string;
	venueName: string;
	venueSlug: string;
	district: string;
	special: Special;
	status: Exclude<SpecialTiming, 'ended'>;
};

export type MenuItem = {
	name: string;
	description?: string;
	price_mur: number;
	tags?: string[];
};

export type MenuCategory = {
	category: string;
	items: MenuItem[];
};

export type Contact = {
	phone?: string;
	instagram?: string;
	website?: string;
	email?: string;
	google_maps?: string;
};

export type VenueImage = {
	id: string;
	url: string;
	path: string;
};

export type Venue = {
	id: string;
	name: string;
	slug: string;
	district: string;
	lat: number | null;
	lng: number | null;
	isFeatured: boolean;
	featuredPriority: number;
	workInfo: WorkInfo;
	openingHours: OpeningHours;
	announcements: Announcement[];
	specials: Special[];
	menu: MenuCategory[];
	contact: Contact;
	images: VenueImage[];
	createdAt: Date | null;
	updatedAt: Date | null;
};

export type LiveVenue = Venue & {
	open: boolean;
	openLate: boolean;
	workFriendly: boolean;
	alerts: Announcement[];
	ongoingSpecials: Special[];
	upcomingSpecials: Special[];
};

export type VenueFilters = {
	q: string;
	district: string;
	wifi: boolean;
	outlets: boolean;
	workFriendly: boolean;
	notWorkFriendly: boolean;
	openNow: boolean;
	late: boolean;
	ongoingSpecials: boolean;
	upcomingSpecials: boolean;
};

const WEEKDAY_LABEL: Record<Weekday, string> = {
	monday: 'Mon',
	tuesday: 'Tue',
	wednesday: 'Wed',
	thursday: 'Thu',
	friday: 'Fri',
	saturday: 'Sat',
	sunday: 'Sun'
};

export function mur(amount: number): string {
	return `Rs ${Math.round(amount).toLocaleString('en-MU')}`;
}

export function mapsUrl(lat: number, lng: number): string {
	return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function mapsEmbedUrl(lat: number, lng: number): string {
	return `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
}

export function parseMapsPin(value: string): { lat: number; lng: number } | null {
	const text = value.trim();
	if (!text) return null;

	const bang = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
	if (bang) return toCoords(bang[1], bang[2]);

	const at = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
	if (at) return toCoords(at[1], at[2]);

	const query = text.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
	if (query) return toCoords(query[1], query[2]);

	const raw = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
	if (raw) return toCoords(raw[1], raw[2]);

	return null;
}

function toCoords(latText: string, lngText: string): { lat: number; lng: number } | null {
	const lat = Number(latText);
	const lng = Number(lngText);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
	return { lat, lng };
}

export function mapsPinForVenue(venue: Pick<Venue, 'lat' | 'lng' | 'contact'>): string {
	return venue.contact.google_maps?.trim() || (venue.lat !== null && venue.lng !== null ? mapsUrl(venue.lat, venue.lng) : '');
}

type Clock = {
	weekday: Weekday;
	minutes: number;
};

export function mauritiusClock(at = new Date()): Clock {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone: MAURITIUS_TZ,
			weekday: 'long',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(at)
			.map((part) => [part.type, part.value])
	);

	return {
		weekday: parts.weekday.toLowerCase() as Weekday,
		minutes: Number(parts.hour) * 60 + Number(parts.minute)
	};
}

function parseMinutes(value: string): number {
	const [hours, minutes] = value.split(':').map(Number);
	return hours * 60 + minutes;
}

function previousWeekday(day: Weekday): Weekday {
	const index = WEEKDAYS.indexOf(day);
	return WEEKDAYS[(index + 6) % 7];
}

export function daySpans(day: DayHours | undefined): HourSpan[] {
	if (!day || day.closed) return [];
	const spans = (day.spans ?? []).filter((span) => Boolean(span.open && span.close));
	if (spans.length) return spans;
	if (day.open && day.close) return [{ open: day.open, close: day.close }];
	return [];
}

export function normalizeDayHours(day: DayHours | undefined): DayHours {
	const closed = Boolean(day?.closed);
	const spans = daySpans(closed ? { ...day, closed: false } : day);
	const next = spans.length ? spans : [{ open: '08:00', close: '17:00' }];
	return {
		closed,
		open: next[0].open,
		close: next[0].close,
		spans: next
	};
}

export function normalizeOpeningHours(hours: OpeningHours | undefined): OpeningHours {
	const next: OpeningHours = { timezone: hours?.timezone || MAURITIUS_TZ };
	for (const day of orderedWeekdays()) {
		next[day] = normalizeDayHours(hours?.[day]);
	}
	return next;
}

function spanContains(span: HourSpan, minutes: number, overnightOnly = false): boolean {
	const open = parseMinutes(span.open);
	const close = parseMinutes(span.close);
	if (close > open) {
		if (overnightOnly) return false;
		return minutes >= open && minutes < close;
	}
	if (close === open) return false;
	return overnightOnly ? minutes < close : minutes >= open || minutes < close;
}

function isWithinHours(day: DayHours | undefined, minutes: number, overnightOnly = false): boolean {
	return daySpans(day).some((span) => spanContains(span, minutes, overnightOnly));
}

export function isOpenNow(hours: OpeningHours, at = new Date()): boolean {
	const clock = mauritiusClock(at);
	if (isWithinHours(hours[clock.weekday], clock.minutes)) return true;
	return isWithinHours(hours[previousWeekday(clock.weekday)], clock.minutes, true);
}

export function dayHoursLabel(day: DayHours | undefined, closedText = 'Closed'): string {
	if (!day || day.closed) return closedText;
	const spans = daySpans(day);
	if (!spans.length) return closedText;
	return spans.map((span) => `${span.open}–${span.close}`).join(', ');
}

export function hoursLabel(hours: OpeningHours, at = new Date()): string {
	const clock = mauritiusClock(at);
	return dayHoursLabel(hours[clock.weekday], 'Closed today');
}

export function weekdayLabel(day: Weekday): string {
	return WEEKDAY_LABEL[day];
}

export function orderedWeekdays(): Weekday[] {
	return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
}

export function slugify(name: string): string {
	const slug = name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return slug || 'venue';
}

export function emptyOpeningHours(): OpeningHours {
	return normalizeOpeningHours({ timezone: MAURITIUS_TZ });
}

export function isoToDatetimeLocal(iso: string | null | undefined): string {
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-GB', {
			timeZone: MAURITIUS_TZ,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(date)
			.map((part) => [part.type, part.value])
	);
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function datetimeLocalToIso(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
		return `${trimmed}:00+04:00`;
	}
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
		return trimmed.includes('+') || trimmed.endsWith('Z') ? trimmed : `${trimmed}+04:00`;
	}
	const parsed = Date.parse(trimmed);
	if (Number.isNaN(parsed)) return null;
	return new Date(parsed).toISOString();
}

export function isAnnouncementActive(announcement: Announcement, at = new Date()): boolean {
	const start = Date.parse(announcement.starts_at);
	if (Number.isNaN(start) || at.getTime() < start) return false;
	if (!announcement.ends_at) return true;
	const end = Date.parse(announcement.ends_at);
	if (Number.isNaN(end)) return true;
	return at.getTime() <= end;
}

export function activeAnnouncements(announcements: Announcement[], at = new Date()): Announcement[] {
	return announcements.filter((item) => isAnnouncementActive(item, at));
}

export function noiseLabel(level: NoiseLevel | undefined): string | null {
	if (!level) return null;
	if (level === 'quiet') return 'Quiet';
	if (level === 'moderate') return 'Moderate';
	return 'Loud';
}

export function outletLabel(access: OutletAccess | undefined, outlets: boolean | undefined): string | null {
	if (outlets === false || access === 'none') return 'No outlets';
	if (access === 'plenty') return 'Many outlets';
	if (access === 'some' || outlets) return 'Some outlets';
	return null;
}

export function wifiLabel(info: WorkInfo): string | null {
	if (!info.wifi) return null;
	if (info.wifi_quality === 'fast') return 'Fast WiFi';
	if (info.wifi_quality === 'slow') return 'Slow WiFi';
	return 'WiFi';
}

const LATE_CLOSE_MINUTES = 21 * 60;

export function isWorkFriendly(info: WorkInfo): boolean {
	return Boolean(info.wifi && info.laptop_friendly && info.outlets);
}

export function isDayLate(day: DayHours | undefined): boolean {
	return daySpans(day).some((span) => {
		const open = parseMinutes(span.open);
		const close = parseMinutes(span.close);
		if (close <= open) return true;
		return close >= LATE_CLOSE_MINUTES;
	});
}

export function isOpenTillLate(hours: OpeningHours): boolean {
	return orderedWeekdays().some((day) => isDayLate(hours[day]));
}

export function specialTiming(special: Special, at = new Date()): SpecialTiming {
	const start = Date.parse(special.starts_at);
	if (Number.isNaN(start)) return 'ended';
	if (at.getTime() < start) return 'upcoming';
	if (!special.ends_at) return 'ongoing';
	const end = Date.parse(special.ends_at);
	if (Number.isNaN(end) || at.getTime() <= end) return 'ongoing';
	return 'ended';
}

export function ongoingSpecials(specials: Special[], at = new Date()): Special[] {
	return specials.filter((item) => specialTiming(item, at) === 'ongoing');
}

export function upcomingSpecials(specials: Special[], at = new Date()): Special[] {
	return specials.filter((item) => specialTiming(item, at) === 'upcoming');
}

function formatMuDate(iso: string): string {
	return new Intl.DateTimeFormat('en-GB', {
		timeZone: MAURITIUS_TZ,
		day: 'numeric',
		month: 'short'
	}).format(new Date(iso));
}

export function formatSpecialWhen(special: Special, at = new Date()): string {
	const timing = specialTiming(special, at);
	const start = formatMuDate(special.starts_at);
	const end = special.ends_at ? formatMuDate(special.ends_at) : null;
	if (timing === 'upcoming') {
		return end && end !== start ? `${start} – ${end}` : `From ${start}`;
	}
	if (end) return `Until ${end}`;
	return 'On now';
}
