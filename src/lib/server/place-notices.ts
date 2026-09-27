import { eventPhase, type Announcement, type Special } from '$lib/venue';

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
			.filter((item) => item.type === 'event')
			.map((item) => ({ key: `event:${item.id}`, item }))
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
