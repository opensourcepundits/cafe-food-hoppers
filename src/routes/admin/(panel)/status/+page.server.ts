import { fail, redirect } from '@sveltejs/kit';
import { requireSuperuser } from '$lib/server/access';
import { getSiteStatus, saveSiteStatus } from '$lib/server/site-status';
import { isSiteSeverity } from '$lib/site-status';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireSuperuser(locals.user);
	return {
		status: await getSiteStatus(),
		saved: url.searchParams.get('saved') === '1'
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		requireSuperuser(locals.user);
		const data = await request.formData();
		const text = String(data.get('text') ?? '');
		const severity = String(data.get('severity') ?? '');
		if (!isSiteSeverity(severity)) {
			return fail(400, { error: 'Choose a severity.', text, severity, active: data.get('active') === 'on' });
		}
		try {
			await saveSiteStatus({
				active: data.get('active') === 'on',
				text,
				severity
			});
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : 'Could not save the status.';
			return fail(400, { error: message, text, severity, active: data.get('active') === 'on' });
		}
		redirect(303, '/admin/status?saved=1');
	}
};
