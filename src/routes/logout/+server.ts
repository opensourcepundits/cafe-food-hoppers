import { redirect } from '@sveltejs/kit';
import { clearAdminSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	await clearAdminSession(cookies);
	redirect(303, '/login');
};
