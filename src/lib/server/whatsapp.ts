import { createHmac, timingSafeEqual } from 'node:crypto';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import type { PlaceNotice } from '$lib/server/place-notices';
import { resolveWhatsApp } from '$lib/server/runtime-env';

const GRAPH_VERSION = 'v21.0';

let missingLogged = false;

function serverEnv(): Record<string, string | undefined> {
	return { ...privateEnv, ...publicEnv };
}

export function whatsAppReady(): boolean {
	const { token, phoneNumberId } = resolveWhatsApp(serverEnv());
	return Boolean(token && phoneNumberId);
}

/** Log once per process when a send cannot run because Meta credentials are absent. */
export function noteMissingWhatsApp(): void {
	if (missingLogged) return;
	missingLogged = true;
	console.error('WhatsApp is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
}

/**
 * Digits Meta expects, with no plus.
 * An 8-digit Mauritius number becomes 230 plus those digits.
 * An 11-digit number that already starts with 230 is kept.
 */
export function toWhatsAppRecipient(phone: string): string | null {
	const digits = phone.replace(/\D/g, '');
	if (digits.length === 8) return `230${digits}`;
	if (digits.length === 11 && digits.startsWith('230')) return digits;
	return null;
}

/** Stored login phones that could match an inbound WhatsApp `from` value. */
export function phoneLookupKeys(from: string): string[] {
	const digits = from.replace(/\D/g, '');
	if (!digits) return [];
	const keys = [digits];
	if (digits.startsWith('230') && digits.length === 11) keys.push(digits.slice(3));
	return keys;
}

export function isWhatsAppOptOut(text: string): boolean {
	const word = text.trim().toLowerCase().replace(/[.!]+$/g, '');
	return word === 'stop' || word === 'unsubscribe';
}

/** Template variables cannot contain newlines or long runs of spaces, and cannot be empty. */
export function templateText(value: string, fallback: string): string {
	const cleaned = value.replace(/[\r\n\t]+/g, ' ').replace(/ {5,}/g, '    ').trim();
	return cleaned || fallback;
}

export function noticeButtonPath(url: string): string {
	return url.replace(/^\/+/, '');
}

export function tokensMatch(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export function verifyWhatsAppSignature(rawBody: string, header: string | null, secret: string): boolean {
	if (!header?.startsWith('sha256=')) return false;
	const provided = header.slice('sha256='.length);
	const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
	return tokensMatch(expected, provided);
}

export async function setWhatsAppOptIn(userId: string, optIn: boolean): Promise<void> {
	await db
		.update(users)
		.set({
			whatsappOptIn: optIn,
			whatsappOptedAt: optIn ? new Date() : null,
			updatedAt: new Date()
		})
		.where(eq(users.id, userId));
}

export async function optOutWhatsApp(from: string): Promise<void> {
	const keys = phoneLookupKeys(from);
	if (!keys.length) return;
	await db
		.update(users)
		.set({ whatsappOptIn: false, whatsappOptedAt: null, updatedAt: new Date() })
		.where(inArray(users.phone, keys));
}

export async function sendTemplate(
	to: string,
	template: string,
	bodyParams: [string, string],
	urlPath: string
): Promise<void> {
	const config = resolveWhatsApp(serverEnv());
	if (!config.token || !config.phoneNumberId) {
		noteMissingWhatsApp();
		return;
	}
	const payload = {
		messaging_product: 'whatsapp',
		to,
		type: 'template',
		template: {
			name: template,
			language: { code: config.templateLang },
			components: [
				{
					type: 'body',
					parameters: [
						{ type: 'text', text: templateText(bodyParams[0], 'Saved place') },
						{ type: 'text', text: templateText(bodyParams[1], 'Open the place page for details.') }
					]
				},
				{
					type: 'button',
					sub_type: 'url',
					index: '0',
					parameters: [{ type: 'text', text: noticeButtonPath(urlPath) }]
				}
			]
		}
	};
	try {
		const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${config.phoneNumberId}/messages`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${config.token}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
		if (!response.ok) {
			const detail = await response.text();
			console.error('WhatsApp send failed', response.status, detail.slice(0, 500));
		}
	} catch (error) {
		console.error('WhatsApp send failed', error);
	}
}

export async function sendWhatsAppNotices(recipients: string[], notice: PlaceNotice): Promise<void> {
	if (!recipients.length) return;
	const config = resolveWhatsApp(serverEnv());
	if (!config.token || !config.phoneNumberId) {
		noteMissingWhatsApp();
		return;
	}
	const template = notice.phase === 'now' ? config.promoTemplate : config.eventTemplate;
	await Promise.all(
		recipients.map((to) => sendTemplate(to, template, [notice.title, notice.body], notice.url))
	);
}

type WaMessage = { from?: string; type?: string; text?: { body?: string } };
type WaStatus = { status?: string; id?: string; errors?: unknown };

/** Apply inbound STOP replies and log failed delivery statuses. Does not delete phone numbers. */
export async function applyWhatsAppWebhook(payload: unknown): Promise<void> {
	if (!payload || typeof payload !== 'object') return;
	const entries = (payload as { entry?: unknown }).entry;
	if (!Array.isArray(entries)) return;
	for (const entry of entries) {
		if (!entry || typeof entry !== 'object') continue;
		const changes = (entry as { changes?: unknown }).changes;
		if (!Array.isArray(changes)) continue;
		for (const change of changes) {
			if (!change || typeof change !== 'object') continue;
			const value = (change as { value?: unknown }).value;
			if (!value || typeof value !== 'object') continue;
			const messages = (value as { messages?: unknown }).messages;
			const statuses = (value as { statuses?: unknown }).statuses;
			if (Array.isArray(messages)) {
				for (const message of messages) {
					if (!message || typeof message !== 'object') continue;
					const row = message as WaMessage;
					const text = row.type === 'text' ? row.text?.body : undefined;
					if (row.from && text && isWhatsAppOptOut(text)) await optOutWhatsApp(row.from);
				}
			}
			if (Array.isArray(statuses)) {
				for (const status of statuses) {
					if (!status || typeof status !== 'object') continue;
					const row = status as WaStatus;
					if (row.status === 'failed') console.error('WhatsApp delivery failed', row.id, row.errors);
				}
			}
		}
	}
}
