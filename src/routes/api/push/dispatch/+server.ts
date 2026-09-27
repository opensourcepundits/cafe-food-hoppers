import { env } from '$env/dynamic/private';
import { dispatchDueEvents } from '$lib/server/push';
import type { RequestHandler } from './$types';

/** Vercel Cron calls this so events notify when they are soon or starting, not only when someone saves. */
export const GET: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET?.trim();
	const header = request.headers.get('authorization');
	if (!secret || header !== `Bearer ${secret}`) {
		return new Response('Unauthorized', { status: 401 });
	}
	await dispatchDueEvents();
	return new Response('ok');
};
