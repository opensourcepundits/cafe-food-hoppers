import { env } from '$env/dynamic/private';
import { and, eq, exists } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '$lib/server/db';
import { favourites, pushDeliveries, pushSubscriptions, users, venues } from '$lib/server/db/schema';
import {
	dueEventNotices,
	postedNotices,
	promotionNowNotice,
	type NoticeSource,
	type PlaceNotice
} from '$lib/server/place-notices';
import type { Announcement } from '$lib/venue';
import { resolveVapid } from '$lib/server/runtime-env';
import { noteMissingWhatsApp, sendWhatsAppNotices, toWhatsAppRecipient, whatsAppReady } from '$lib/server/whatsapp';

let configured = false;

function configure(): boolean {
	const { publicKey, privateKey, subject } = resolveVapid(env);
	if (!publicKey || !privateKey) return false;
	if (!configured) {
		webpush.setVapidDetails(subject, publicKey, privateKey);
		configured = true;
	}
	return true;
}

export async function savePushSubscription(
	userId: string,
	subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
	await db
		.insert(pushSubscriptions)
		.values({
			userId,
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth
		})
		.onConflictDoUpdate({
			target: pushSubscriptions.endpoint,
			set: {
				userId,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth
			}
		});
}

export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
	await db
		.delete(pushSubscriptions)
		.where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

/** Notify the author and people who saved the place about an announcement that was just posted. */
export async function dispatchPostedAnnouncement(
	venueId: string,
	alert: Announcement,
	authorId: string
): Promise<'sent' | 'later' | 'none' | 'quiet' | 'failed'> {
	try {
		const pushReady = configure();
		const [venue] = await db
			.select({
				id: venues.id,
				name: venues.name,
				slug: venues.slug,
				specials: venues.specials,
				announcements: venues.announcements
			})
			.from(venues)
			.where(eq(venues.id, venueId))
			.limit(1);
		if (!venue) return 'none';
		const source: NoticeSource = {
			name: venue.name,
			slug: venue.slug,
			specials: venue.specials ?? [],
			announcements: venue.announcements ?? []
		};
		const posted = postedNotices(source, alert);
		if (posted.when !== 'now') return posted.when === 'later' ? 'later' : 'none';
		const devices = await recipientDevices(venue.id, authorId);
		const phones = await loadWhatsAppRecipients(venue.id);
		if (phones.length && !whatsAppReady()) noteMissingWhatsApp();
		const waTargets = whatsAppReady() ? phones : [];
		if (!pushReady && devices.length) return 'failed';
		const readyDevices = pushReady ? devices : [];
		if (!readyDevices.length && !waTargets.length) return 'quiet';
		let sent = false;
		for (const notice of posted.notices) {
			const claimed = await claim(venue.id, notice);
			if (!claimed) continue;
			const pushed = readyDevices.length ? await sendAll(readyDevices, notice) : 0;
			if (waTargets.length) await sendWhatsAppNotices(waTargets, notice);
			if (pushed || waTargets.length) {
				sent = true;
				continue;
			}
			await db.delete(pushDeliveries).where(eq(pushDeliveries.id, claimed));
		}
		return sent ? 'sent' : 'failed';
	} catch (error) {
		console.error('Place notification failed', error);
		return 'failed';
	}
}

/** Notify people who saved a place when one of its events is soon or starting. */
export async function dispatchDueEvents(venueId?: string, at = new Date()): Promise<void> {
	try {
		const pushReady = configure();
		const waReady = whatsAppReady();
		const rows = await db
			.select({
				id: venues.id,
				name: venues.name,
				slug: venues.slug,
				specials: venues.specials,
				announcements: venues.announcements
			})
			.from(venues)
			.where(
				venueId
					? eq(venues.id, venueId)
					: exists(
							db
								.select({ venueId: favourites.venueId })
								.from(favourites)
								.where(eq(favourites.venueId, venues.id))
						)
			);

		for (const venue of rows) {
			const source: NoticeSource = {
				name: venue.name,
				slug: venue.slug,
				specials: venue.specials ?? [],
				announcements: venue.announcements ?? []
			};
			const notices = dueEventNotices(source, at);
			if (!notices.length) continue;
			const devices = pushReady ? await subscribers(venue.id) : [];
			const phones = await loadWhatsAppRecipients(venue.id);
			if (phones.length && !waReady) noteMissingWhatsApp();
			const waTargets = waReady ? phones : [];
			if (!devices.length && !waTargets.length) continue;
			for (const notice of notices) {
				const claimed = await claim(venue.id, notice);
				if (!claimed) continue;
				if (devices.length) await sendAll(devices, notice);
				if (waTargets.length) await sendWhatsAppNotices(waTargets, notice);
			}
		}
	} catch (error) {
		console.error('Place notification failed', error);
	}
}

/** Notify savers immediately when an editor starts a promotion now. */
export async function dispatchPromotionsNow(venueId: string, specialIds: string[]): Promise<void> {
	if (!specialIds.length) return;
	try {
		const pushReady = configure();
		const waReady = whatsAppReady();
		const [venue] = await db
			.select({
				id: venues.id,
				name: venues.name,
				slug: venues.slug,
				specials: venues.specials,
				announcements: venues.announcements
			})
			.from(venues)
			.where(eq(venues.id, venueId))
			.limit(1);
		if (!venue) return;
		const wanted = new Set(specialIds);
		const devices = pushReady ? await subscribers(venue.id) : [];
		const phones = await loadWhatsAppRecipients(venue.id);
		if (phones.length && !waReady) noteMissingWhatsApp();
		const waTargets = waReady ? phones : [];
		if (!devices.length && !waTargets.length) return;
		const source: NoticeSource = {
			name: venue.name,
			slug: venue.slug,
			specials: venue.specials ?? [],
			announcements: venue.announcements ?? []
		};
		for (const special of source.specials) {
			if (!wanted.has(special.id)) continue;
			const notice = promotionNowNotice(source, special);
			const claimed = await claim(venue.id, notice);
			if (!claimed) continue;
			if (devices.length) await sendAll(devices, notice);
			if (waTargets.length) await sendWhatsAppNotices(waTargets, notice);
			await claim(venue.id, { ...notice, phase: 'starting', tag: `starting-${notice.eventKey}` });
		}
	} catch (error) {
		console.error('Place notification failed', error);
	}
}

async function loadWhatsAppRecipients(venueId: string): Promise<string[]> {
	try {
		return await whatsAppRecipients(venueId);
	} catch (error) {
		console.error('WhatsApp recipients failed', error);
		return [];
	}
}

async function whatsAppRecipients(venueId: string): Promise<string[]> {
	const rows = await db
		.select({ phone: users.phone })
		.from(users)
		.innerJoin(favourites, eq(favourites.userId, users.id))
		.where(and(eq(favourites.venueId, venueId), eq(users.whatsappOptIn, true)));
	const numbers: string[] = [];
	for (const row of rows) {
		if (!row.phone) continue;
		const to = toWhatsAppRecipient(row.phone);
		if (!to) {
			console.error('WhatsApp skipped, phone is not a Mauritius number', row.phone);
			continue;
		}
		numbers.push(to);
	}
	return numbers;
}

const deviceColumns = {
	id: pushSubscriptions.id,
	endpoint: pushSubscriptions.endpoint,
	p256dh: pushSubscriptions.p256dh,
	auth: pushSubscriptions.auth
};

async function subscribers(venueId: string) {
	return db
		.select(deviceColumns)
		.from(pushSubscriptions)
		.innerJoin(favourites, eq(favourites.userId, pushSubscriptions.userId))
		.where(eq(favourites.venueId, venueId));
}

async function recipientDevices(venueId: string, authorId: string) {
	const [saved, own] = await Promise.all([
		subscribers(venueId),
		db.select(deviceColumns).from(pushSubscriptions).where(eq(pushSubscriptions.userId, authorId))
	]);
	const seen = new Set(saved.map((device) => device.id));
	return [...saved, ...own.filter((device) => !seen.has(device.id))];
}

async function claim(venueId: string, notice: PlaceNotice): Promise<string | null> {
	const inserted = await db
		.insert(pushDeliveries)
		.values({
			venueId,
			eventKey: notice.eventKey,
			phase: notice.phase,
			startsAt: new Date(notice.startsAt)
		})
		.onConflictDoNothing()
		.returning({ id: pushDeliveries.id });
	return inserted[0]?.id ?? null;
}

async function sendAll(
	devices: { id: string; endpoint: string; p256dh: string; auth: string }[],
	notice: PlaceNotice
): Promise<number> {
	const payload = JSON.stringify({
		title: notice.title,
		body: notice.body,
		url: notice.url,
		tag: notice.tag
	});
	const results = await Promise.all(
		devices.map(async (device) => {
			try {
				await webpush.sendNotification(
					{ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
					payload
				);
				return true;
			} catch (error) {
				const status = statusCode(error);
				if (status === 404 || status === 410) {
					await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, device.id));
					return false;
				}
				console.error('Push send failed', status || error);
				return false;
			}
		})
	);
	return results.filter(Boolean).length;
}

function statusCode(error: unknown): number {
	if (!error || typeof error !== 'object' || !('statusCode' in error)) return 0;
	const code = (error as { statusCode?: unknown }).statusCode;
	return typeof code === 'number' ? code : 0;
}
