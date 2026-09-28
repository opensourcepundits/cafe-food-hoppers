import { env } from '$env/dynamic/private';
import { and, eq, exists } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '$lib/server/db';
import { favourites, pushDeliveries, pushSubscriptions, users, venues } from '$lib/server/db/schema';
import { dueEventNotices, promotionNowNotice, type NoticeSource, type PlaceNotice } from '$lib/server/place-notices';
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

async function subscribers(venueId: string) {
	return db
		.select({
			id: pushSubscriptions.id,
			endpoint: pushSubscriptions.endpoint,
			p256dh: pushSubscriptions.p256dh,
			auth: pushSubscriptions.auth
		})
		.from(pushSubscriptions)
		.innerJoin(favourites, eq(favourites.userId, pushSubscriptions.userId))
		.where(eq(favourites.venueId, venueId));
}

async function claim(venueId: string, notice: PlaceNotice): Promise<boolean> {
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
	return inserted.length > 0;
}

async function sendAll(
	devices: { id: string; endpoint: string; p256dh: string; auth: string }[],
	notice: PlaceNotice
): Promise<void> {
	const payload = JSON.stringify({
		title: notice.title,
		body: notice.body,
		url: notice.url,
		tag: notice.tag
	});
	await Promise.all(
		devices.map(async (device) => {
			try {
				await webpush.sendNotification(
					{ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
					payload
				);
			} catch (error) {
				const status = statusCode(error);
				if (status === 404 || status === 410) {
					await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, device.id));
					return;
				}
				console.error('Push send failed', status || error);
			}
		})
	);
}

function statusCode(error: unknown): number {
	if (!error || typeof error !== 'object' || !('statusCode' in error)) return 0;
	const code = (error as { statusCode?: unknown }).statusCode;
	return typeof code === 'number' ? code : 0;
}
