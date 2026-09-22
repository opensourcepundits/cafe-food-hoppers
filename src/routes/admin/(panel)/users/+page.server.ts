import { listPlaceOwners } from '$lib/server/auth';
import { requireSuperuser } from '$lib/server/access';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireSuperuser(locals.user);
	const owners = await listPlaceOwners();
	return { owners };
};
