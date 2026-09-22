import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, readSession } from '$lib/server/auth';
import { ensureSchema } from '$lib/server/db/ensure-schema';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const isAdminApp = path === '/admin' || path.startsWith('/admin/');
	const isPublicAdmin =
		path === '/admin/login' ||
		path === '/admin/login/' ||
		path === '/admin/register' ||
		path === '/admin/register/';

	if (isAdminApp || event.cookies.get(SESSION_COOKIE)) await ensureSchema();

	const user = await readSession(event.cookies);
	event.locals.user = user;
	event.locals.admin = Boolean(user);

	if (isAdminApp && !isPublicAdmin && !event.locals.admin) {
		const next = path === '/admin' ? '/admin' : path;
		redirect(303, `/admin/login?next=${encodeURIComponent(next)}`);
	}

	return resolve(event);
};
