import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const next = url.searchParams.get('next');
	const target = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
	redirect(307, target);
};
