import type { LayoutServerLoad } from './$types';
import { isOwner } from '$lib/server/access';

export const load: LayoutServerLoad = async ({ locals }) => {
	return { admin: locals.admin, user: locals.user, isOwner: isOwner(locals.user) };
};
