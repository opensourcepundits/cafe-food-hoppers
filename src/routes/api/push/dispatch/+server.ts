import { env } from '$env/dynamic/private';
import { dispatchDueEvents } from '$lib/server/push';
import { resolveCronSecret } from '$lib/server/runtime-env';
import type { RequestHandler } from './$types';

/** Supabase pg_cron calls this every minute through pg_net, with the bearer secret from Vault. */
export const GET: RequestHandler = async ({ request }) => {
	const secret = resolveCronSecret(env);
	const header = request.headers.get('authorization');
	if (!secret || header !== `Bearer ${secret}`) {
		return new Response('Unauthorized', { status: 401 });
	}
	await dispatchDueEvents();
	return new Response('ok');
};
