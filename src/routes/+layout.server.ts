import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';
import { canCreateVenue, isOwner, isSuperuser } from '$lib/server/access';
import { resolveVapid } from '$lib/server/runtime-env';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		admin: locals.admin,
		user: locals.user,
		isOwner: isOwner(locals.user),
		isSuperuser: isSuperuser(locals.user),
		canCreate: canCreateVenue(locals.user),
		vapidPublicKey: resolveVapid(env).publicKey ?? ''
	};
};
