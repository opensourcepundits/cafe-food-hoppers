import { redirect, type Handle } from '@sveltejs/kit';
import { hasAdminSession } from '$lib/server/admin';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = hasAdminSession(event.cookies);

	const path = event.url.pathname;
	const isAdminApp = path === '/admin' || path.startsWith('/admin/');
	const isLogin = path === '/admin/login' || path === '/admin/login/';

	if (isAdminApp && !isLogin && !event.locals.admin) {
		const next = path === '/admin' ? '/admin' : path;
		redirect(303, `/admin/login?next=${encodeURIComponent(next)}`);
	}

	return resolve(event);
};
