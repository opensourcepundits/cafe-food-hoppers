import { error, fail, redirect } from '@sveltejs/kit';
import { canEditVenue, canReportClosure } from '$lib/server/access';
import { dispatchPostedAnnouncement } from '$lib/server/push';
import { getVenueById, listVenuesAdmin, setVenueAnnouncements } from '$lib/server/venues';
import {
	activeTemporaryClosure,
	alertTiming,
	closureAnnouncementBody,
	closureNote,
	datetimeLocalToIso,
	type Announcement
} from '$lib/venue';
import type { Actions, PageServerLoad } from './$types';

const NOTE_LIMIT = 400;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, '/login?next=/admin/closure');
	if (!canReportClosure(locals.user)) error(403, 'You cannot report a temporary closure.');
	const venues = (await listVenuesAdmin(locals.user)).filter((venue) => canEditVenue(locals.user, venue));
	const requested = url.searchParams.get('venue');
	const selectedId = venues.some((venue) => venue.id === requested) ? requested : (venues[0]?.id ?? '');
	const closures = venues.flatMap((venue) => {
		const active = activeTemporaryClosure(venue.announcements);
		if (!active) return [];
		return [
			{
				id: active.id,
				venueId: venue.id,
				venueName: venue.name,
				endsAt: active.ends_at,
				note: closureNote(active.body)
			}
		];
	});
	return {
		places: venues.map((venue) => ({ id: venue.id, name: venue.name })),
		closures,
		selectedId,
		closed: url.searchParams.get('closed') === '1',
		updated: url.searchParams.get('updated') === '1',
		indefinite: url.searchParams.get('indefinite') === '1',
		reopened: url.searchParams.get('reopened') === '1',
		notice: url.searchParams.get('notice')
	};
};

export const actions: Actions = {
	close: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login?next=/admin/closure');
		if (!canReportClosure(locals.user)) error(403, 'You cannot report a temporary closure.');
		const data = await request.formData();
		const venueId = String(data.get('venueId') ?? '');
		const note = String(data.get('note') ?? '').trim();
		const indefinite = data.get('indefinite') === '1';
		const reopensRaw = String(data.get('reopens') ?? '');
		const posted = { venueId, note, reopens: reopensRaw, indefinite: indefinite ? '1' : '' };
		const venue = await getVenueById(venueId);
		if (!venue || !canEditVenue(locals.user, venue)) return fail(400, { ...posted, error: 'Choose a place you manage.' });
		if (note.length > NOTE_LIMIT) return fail(400, { ...posted, error: 'Keep the reason under 400 characters.' });
		const reopens = indefinite ? null : datetimeLocalToIso(reopensRaw);
		if (!indefinite && !reopens) {
			return fail(400, { ...posted, error: 'Choose when the place is expected to open again, or mark it indefinite.' });
		}
		if (reopens && Date.parse(reopens) <= Date.now()) {
			return fail(400, { ...posted, error: 'The reopen time has to be in the future.' });
		}

		const now = new Date();
		const body = closureAnnouncementBody(note, reopens);
		const ongoing = venue.announcements.filter(
			(item) => item.type === 'closure' && alertTiming(item, now) === 'ongoing'
		);
		const primary = ongoing[0];
		const drop = new Set(ongoing.slice(1).map((item) => item.id));
		const ended = new Date(now.getTime() - 1000).toISOString();
		const createdAlert: Announcement = {
			id: crypto.randomUUID(),
			type: 'closure',
			title: 'Temporarily closed',
			body,
			starts_at: now.toISOString(),
			ends_at: reopens
		};
		const next: Announcement[] = primary
			? venue.announcements.map((item) => {
					if (drop.has(item.id)) return { ...item, ends_at: ended };
					if (item.id !== primary.id) return item;
					return { ...item, title: 'Temporarily closed', body, ends_at: reopens };
				})
			: [...venue.announcements, createdAlert];

		const saved = await setVenueAnnouncements(venue.id, next);
		if (!saved) error(404, 'Place not found.');
		const indefiniteFlag = reopens ? '' : '&indefinite=1';
		if (!primary) {
			const notice = await dispatchPostedAnnouncement(saved.id, createdAlert, locals.user.id);
			redirect(303, `/admin/closure?venue=${venue.id}&closed=1&notice=${notice}`);
		}
		redirect(303, `/admin/closure?venue=${venue.id}&updated=1${indefiniteFlag}`);
	},
	reopen: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login?next=/admin/closure');
		if (!canReportClosure(locals.user)) error(403, 'You cannot report a temporary closure.');
		const data = await request.formData();
		const venue = await getVenueById(String(data.get('venueId') ?? ''));
		if (!venue || !canEditVenue(locals.user, venue)) error(403, 'You cannot change that place.');
		const closureId = String(data.get('closureId') ?? '');
		const current = venue.announcements.find((item) => item.id === closureId && item.type === 'closure');
		if (!current) return fail(404, { error: 'That closure is no longer there.' });
		if (alertTiming(current) === 'done') redirect(303, `/admin/closure?venue=${venue.id}`);
		const ended = new Date(Date.now() - 1000).toISOString();
		const next = venue.announcements.map((item) =>
			item.type === 'closure' && alertTiming(item) === 'ongoing' ? { ...item, ends_at: ended } : item
		);
		const saved = await setVenueAnnouncements(venue.id, next);
		if (!saved) error(404, 'Place not found.');
		redirect(303, `/admin/closure?venue=${venue.id}&reopened=1`);
	}
};
