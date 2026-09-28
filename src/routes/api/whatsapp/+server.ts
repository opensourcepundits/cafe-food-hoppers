import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { resolveWhatsApp } from '$lib/server/runtime-env';
import { applyWhatsAppWebhook, tokensMatch, verifyWhatsAppSignature } from '$lib/server/whatsapp';
import type { RequestHandler } from './$types';

function serverEnv(): Record<string, string | undefined> {
	return { ...privateEnv, ...publicEnv };
}

/** Meta calls this once when the webhook URL is saved. */
export const GET: RequestHandler = async ({ url }) => {
	const { verifyToken } = resolveWhatsApp(serverEnv());
	if (!verifyToken) return new Response('WhatsApp webhook is not configured', { status: 503 });
	const mode = url.searchParams.get('hub.mode');
	const token = url.searchParams.get('hub.verify_token');
	const challenge = url.searchParams.get('hub.challenge');
	if (mode === 'subscribe' && token && challenge && tokensMatch(token, verifyToken)) {
		return new Response(challenge);
	}
	return new Response('Forbidden', { status: 403 });
};

/** Inbound messages and delivery statuses. Signature is required. */
export const POST: RequestHandler = async ({ request }) => {
	const { appSecret } = resolveWhatsApp(serverEnv());
	if (!appSecret) return new Response('WhatsApp webhook is not configured', { status: 503 });
	const raw = await request.text();
	if (!verifyWhatsAppSignature(raw, request.headers.get('x-hub-signature-256'), appSecret)) {
		return new Response('Unauthorized', { status: 401 });
	}
	let payload: unknown;
	try {
		payload = JSON.parse(raw);
	} catch {
		return new Response('Bad request', { status: 400 });
	}
	try {
		await applyWhatsAppWebhook(payload);
	} catch (error) {
		console.error('WhatsApp webhook failed', error);
		return new Response('Error', { status: 500 });
	}
	return new Response('ok');
};
