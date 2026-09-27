import { json } from '@sveltejs/kit';
import { deletePushSubscription, savePushSubscription } from '$lib/server/push';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Sign in required.' }, { status: 401 });
	const subscription = await readSubscription(request);
	if (!subscription) return json({ error: 'Invalid push subscription.' }, { status: 400 });
	await savePushSubscription(locals.user.id, subscription);
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Sign in required.' }, { status: 401 });
	let endpoint = '';
	try {
		const body = (await request.json()) as { endpoint?: unknown };
		endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
	} catch {
		endpoint = '';
	}
	if (!endpoint) return json({ error: 'Missing endpoint.' }, { status: 400 });
	await deletePushSubscription(locals.user.id, endpoint);
	return json({ ok: true });
};

async function readSubscription(
	request: Request
): Promise<{ endpoint: string; keys: { p256dh: string; auth: string } } | null> {
	try {
		const body = (await request.json()) as {
			endpoint?: unknown;
			keys?: { p256dh?: unknown; auth?: unknown };
		};
		const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
		const p256dh = typeof body.keys?.p256dh === 'string' ? body.keys.p256dh : '';
		const auth = typeof body.keys?.auth === 'string' ? body.keys.auth : '';
		if (!endpoint.startsWith('https://') || !p256dh || !auth) return null;
		return { endpoint, keys: { p256dh, auth } };
	} catch {
		return null;
	}
}
