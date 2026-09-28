import { alertTiming, eventPhase, type Announcement, type Special } from '$lib/venue';

export type PlaceNotice = {
	title: string;
	body: string;
	url: string;
	tag: string;
	eventKey: string;
	phase: 'soon' | 'starting' | 'now';
	startsAt: string;
};

export type NoticeSource = {
	name: string;
	slug: string;
	specials: Special[];
	announcements: Announcement[];
};

/** Events that should notify now: within the hour before the start, or as they start. */
export function dueEventNotices(source: NoticeSource, at = new Date()): PlaceNotice[] {
	const url = `/venues/${source.slug}`;
	const events = [
		...source.specials.map((item) => ({ key: `special:${item.id}`, item })),
		...source.announcements
			.filter((item) => item.type === 'event' || item.type === 'alert')
			.map((item) => ({ key: `${item.type}:${item.id}`, item }))
	];

	const notices: PlaceNotice[] = [];
	for (const { key, item } of events) {
		const phase = eventPhase(item.starts_at, item.ends_at, at);
		if (!phase) continue;
		const startsAt = new Date(item.starts_at).toISOString();
		notices.push({
			title: clip(
				phase === 'soon' ? `${source.name}: ${item.title} starts soon` : `${source.name}: ${item.title} is starting`,
				80
			),
			body: clip(item.body || item.title),
			url,
			tag: `${phase}-${key}`,
			eventKey: key,
			phase,
			startsAt
		});
	}
	return notices;
}

export type PostedDelivery = 'now' | 'later' | 'never';

/** What to send for an announcement that was just posted. */
export function postedNotices(
	source: NoticeSource,
	alert: Announcement,
	at = new Date()
): { when: PostedDelivery; notices: PlaceNotice[] } {
	const phase = eventPhase(alert.starts_at, alert.ends_at, at);
	const live = phase !== null || alertTiming(alert, at) === 'ongoing';
	if (!live) {
		const later = alert.type === 'event' || alert.type === 'alert';
		return { when: later ? 'later' : 'never', notices: [] };
	}
	if ((alert.type === 'event' || alert.type === 'alert') && phase) {
		const key = `${alert.type}:${alert.id}`;
		const notices = dueEventNotices(source, at).filter((notice) => notice.eventKey === key);
		if (notices.length) return { when: 'now', notices };
	}
	return { when: 'now', notices: [postedNotice(source, alert)] };
}

function postedNotice(source: NoticeSource, alert: Announcement): PlaceNotice {
	const key = `${alert.type}:${alert.id}`;
	return {
		title: clip(`${source.name}: ${alert.title}`, 80),
		body: clip(alert.body || alert.title),
		url: `/venues/${source.slug}`,
		tag: `posted-${key}`,
		eventKey: key,
		phase: 'now',
		startsAt: new Date(alert.starts_at).toISOString()
	};
}

/** A promotion an editor started on the spot, rather than a scheduled start. */
export function promotionNowNotice(source: NoticeSource, special: Special): PlaceNotice {
	const key = `special:${special.id}`;
	const startsAt = new Date(special.starts_at).toISOString();
	return {
		title: clip(`${source.name}: ${special.title} is on now`, 80),
		body: clip(special.body || special.title),
		url: `/venues/${source.slug}`,
		tag: `now-${key}`,
		eventKey: key,
		phase: 'now',
		startsAt
	};
}

function clip(text: string, max = 140): string {
	const trimmed = text.trim().replace(/\s+/g, ' ');
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
