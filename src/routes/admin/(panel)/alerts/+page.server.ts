import { error, fail, redirect } from '@sveltejs/kit';
import { canManagePlaces, canPostAlert } from '$lib/server/access';
import { dispatchDueEvents } from '$lib/server/push';
import { getVenueById, listVenuesAdmin, setVenueAnnouncements } from '$lib/server/venues';
import {
	alertTiming,
	datetimeLocalToIso,
	type Announcement,
	type AnnouncementType
} from '$lib/venue';
import type { Actions, PageServerLoad } from './$types';

const TYPES = new Set<AnnouncementType>(['notice', 'event', 'closure', 'alert']);

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, '/login?next=/admin/alerts');
	if (!canManagePlaces(locals.user)) error(403, 'You cannot manage alerts.');
	const venues = (await listVenuesAdmin(locals.user)).filter((venue) => canPostAlert(locals.user, venue));
	const alerts = venues.flatMap((venue) =>
		venue.announcements.map((alert) => ({
			...alert,
			venueId: venue.id,
			venueName: venue.name,
			status: alertTiming(alert)
		}))
	);
	const byStart = (a: { starts_at: string }, b: { starts_at: string }) =>
		Date.parse(a.starts_at) - Date.parse(b.starts_at);
	return {
		places: venues.map((venue) => ({ id: venue.id, name: venue.name })),
		upcoming: alerts.filter((alert) => alert.status === 'upcoming').sort(byStart),
		ongoing: alerts.filter((alert) => alert.status === 'ongoing').sort(byStart),
		done: alerts.filter((alert) => alert.status === 'done').sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at)),
		created: url.searchParams.get('created') === '1',
		cancelled: url.searchParams.get('cancelled') === '1'
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login?next=/admin/alerts');
		if (!canManagePlaces(locals.user)) error(403, 'You cannot manage alerts.');
		const data = await request.formData();
		const venue = await getVenueById(String(data.get('venueId') ?? ''));
		if (!venue || !canPostAlert(locals.user, venue)) return fail(400, { error: 'Choose a place you manage.' });
		const type = String(data.get('type') ?? 'notice');
		const title = String(data.get('title') ?? '').trim();
		const body = String(data.get('body') ?? '').trim();
		const starts = datetimeLocalToIso(String(data.get('starts') ?? ''));
		const endsRaw = String(data.get('ends') ?? '').trim();
		const ends = endsRaw ? datetimeLocalToIso(endsRaw) : null;
		if (!TYPES.has(type as AnnouncementType)) return fail(400, { error: 'Choose an alert type.' });
		if (!title || !body || !starts) return fail(400, { error: 'Title, details, and a start time are required.' });
		if (ends && Date.parse(ends) < Date.parse(starts)) return fail(400, { error: 'The end must be after the start.' });
		const alert: Announcement = {
			id: crypto.randomUUID(),
			type: type as AnnouncementType,
			title,
			body,
			starts_at: starts,
			ends_at: ends
		};
		const saved = await setVenueAnnouncements(venue.id, [...venue.announcements, alert]);
		if (!saved) error(404, 'Place not found.');
		if (alert.type === 'event') await dispatchDueEvents(venue.id);
		redirect(303, '/admin/alerts?created=1');
	},
	cancel: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login?next=/admin/alerts');
		if (!canManagePlaces(locals.user)) error(403, 'You cannot manage alerts.');
		const data = await request.formData();
		const venue = await getVenueById(String(data.get('venueId') ?? ''));
		if (!venue || !canPostAlert(locals.user, venue)) error(403, 'You cannot change alerts for that place.');
		const alertId = String(data.get('alertId') ?? '');
		const current = venue.announcements.find((item) => item.id === alertId);
		if (!current) return fail(404, { error: 'That alert is no longer there.' });
		if (alertTiming(current) === 'done') redirect(303, '/admin/alerts');
		const ended = new Date(Date.now() - 1000).toISOString();
		const next = venue.announcements.map((item) => (item.id === alertId ? { ...item, ends_at: ended } : item));
		const saved = await setVenueAnnouncements(venue.id, next);
		if (!saved) error(404, 'Place not found.');
		redirect(303, '/admin/alerts?cancelled=1');
	}
};
