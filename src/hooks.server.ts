import { redirect, type Handle } from '@sveltejs/kit';
import { readSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const user = await readSession(event.cookies);
	event.locals.user = user;
	event.locals.admin = Boolean(user);

	const path = event.url.pathname;
	const isAdminApp = path === '/admin' || path.startsWith('/admin/');
	const isPublicAdmin =
		path === '/admin/login' ||
		path === '/admin/login/' ||
		path === '/admin/register' ||
		path === '/admin/register/';

	if (isAdminApp && !isPublicAdmin && !event.locals.admin) {
		const next = path === '/admin' ? '/admin' : path;
		redirect(303, `/admin/login?next=${encodeURIComponent(next)}`);
	}

	return resolve(event);
};
