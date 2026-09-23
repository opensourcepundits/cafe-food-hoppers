import { error, fail, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { deleteVenue, getVenueById, setVenueBadges, updateVenue } from '$lib/server/venues';
import { isUniqueViolation, payloadFromForm } from '$lib/server/venue-input';
import { filesFromForm, persistVenueImages, removeImagePaths } from '$lib/server/storage';
import { canDeleteVenue, isSuperuser, requireVenueEditor } from '$lib/server/access';
import { datetimeLocalToIso } from '$lib/venue';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const venue = await getVenueById(params.id);
	if (!venue) error(404, 'Place not found.');
	requireVenueEditor(locals.user, venue);
	return {
		venue,
		saved: url.searchParams.get('saved') === '1',
		badgesSaved: url.searchParams.get('badges') === '1',
		canDelete: canDeleteVenue(locals.user, venue),
		canVerify: isSuperuser(locals.user)
	};
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		const existing = await getVenueById(params.id);
		if (!existing) error(404, 'Place not found.');
		requireVenueEditor(locals.user, existing);
		const data = await request.formData();
		const parsed = payloadFromForm(data);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		try {
			const current = await getVenueById(params.id);
			if (!current) error(404, 'Place not found.');
			const images = await persistVenueImages(
				parsed.value.images,
				filesFromForm(data),
				current.images,
				parsed.value.slug || current.slug
			);
			const venue = await updateVenue(params.id, { ...parsed.value, images });
			if (!venue) error(404, 'Place not found.');
			redirect(303, `/admin/venues/${params.id}?saved=1`);
		} catch (cause) {
			if (isRedirect(cause) || isHttpError(cause)) throw cause;
			if (isUniqueViolation(cause)) return fail(400, { error: 'That slug is already taken.' });
			console.error(cause);
			const message = cause instanceof Error ? cause.message : 'Could not save this place.';
			return fail(500, { error: message });
		}
	},
	badges: async ({ request, params, locals }) => {
		if (!locals.user) redirect(303, '/login');
		if (!isSuperuser(locals.user)) error(403, 'Only a superuser can set verification badges.');
		const data = await request.formData();
		const testedAt = datetimeLocalToIso(String(data.get('wifiTestedAt') ?? ''));
		const venue = await setVenueBadges(params.id, {
			speedVerified: data.get('speedVerified') === '1',
			noiseVerified: data.get('noiseVerified') === '1',
			wifiTestedAt: testedAt ? new Date(testedAt) : null,
			wifiDownloadMbps: mbps(data.get('wifiDownloadMbps')),
			wifiUploadMbps: mbps(data.get('wifiUploadMbps'))
		});
		if (!venue) error(404, 'Place not found.');
		redirect(303, `/admin/venues/${params.id}?badges=1`);
	},
	delete: async ({ params, locals }) => {
		const existing = await getVenueById(params.id);
		if (!existing) error(404, 'Place not found.');
		requireVenueEditor(locals.user, existing);
		if (!canDeleteVenue(locals.user, existing)) error(403, 'You cannot delete this place.');
		const venue = await getVenueById(params.id);
		if (venue) await removeImagePaths(venue.images.map((image) => image.path));
		await deleteVenue(params.id);
		redirect(303, '/admin?deleted=1');
	}
};

function mbps(value: FormDataEntryValue | null): number | null {
	const text = String(value ?? '').trim();
	if (!text) return null;
	const number = Number(text);
	if (!Number.isFinite(number) || number < 0 || number > 10000) return null;
	return Math.round(number * 10) / 10;
}
