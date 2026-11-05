import { redirect, type Handle } from '@sveltejs/kit';
import { readSession } from '$lib/server/auth';

function movedPlacePath(url: URL): string | null {
	const path = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname;
	let next: string | null = null;
	if (path === '/admin/venues/new') next = '/my-places/new';
	else if (path.startsWith('/admin/venues/')) next = `/my-places/${path.slice('/admin/venues/'.length)}`;
	else if (path === '/admin/alerts') next = '/my-places/alerts';
	else if (path === '/admin/closure') next = '/my-places/closure';
	return next ? next + url.search : null;
}

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const moved = movedPlacePath(event.url);
	if (moved) redirect(303, moved);

	const isAdminApp = path === '/admin' || path.startsWith('/admin/');
	const isPublicAdmin =
		path === '/admin/login' ||
		path === '/admin/login/' ||
		path === '/admin/register' ||
		path === '/admin/register/';
	const isMyPlaces = path === '/my-places' || path.startsWith('/my-places/');

	const user = await readSession(event.cookies);
	event.locals.user = user;
	event.locals.admin = Boolean(user);

	if ((isAdminApp && !isPublicAdmin) || isMyPlaces) {
		if (!event.locals.admin) {
			const next = path === '/admin' ? '/my-places' : path;
			redirect(303, `/login?next=${encodeURIComponent(next)}`);
		}
	}

	if (path === '/admin' && user?.role === 'superuser') redirect(303, '/admin/users');
	if (path === '/admin') redirect(303, '/my-places');

	return resolve(event);
};
