import { createClient } from '@supabase/supabase-js';
import { env as priv } from '$env/dynamic/private';
import { env as pub } from '$env/dynamic/public';
import type { VenueImage } from '$lib/venue';

export const IMAGE_BUCKET = 'venue-images';
export const MAX_VENUE_IMAGES = 5;
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

let bucketReady: Promise<void> | undefined;

function supabase() {
	const url = pub.PUBLIC_SUPABASE_URL?.trim();
	const key = (priv.SUPABASE_SERVICE_ROLE_KEY ?? pub.PUBLIC_SUPABASE_PUBLISHABLE_KEY)?.trim();
	if (!url || !key) {
		throw new Error(
			'Image uploads need PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or the publishable key).'
		);
	}
	return createClient(url, key);
}

async function ensureBucket(): Promise<void> {
	bucketReady ??= (async () => {
		const client = supabase();
		const { data } = await client.storage.getBucket(IMAGE_BUCKET);
		if (data) return;
		const { error } = await client.storage.createBucket(IMAGE_BUCKET, {
			public: true,
			fileSizeLimit: MAX_BYTES,
			allowedMimeTypes: [...ALLOWED]
		});
		if (error && !/already exists|duplicate/i.test(error.message)) throw error;
	})().catch((error) => {
		bucketReady = undefined;
		throw error;
	});
	return bucketReady;
}

function extFor(file: File): string {
	if (file.type === 'image/png') return 'png';
	if (file.type === 'image/webp') return 'webp';
	if (file.type === 'image/gif') return 'gif';
	return 'jpg';
}

export function parseKeptImages(value: unknown): VenueImage[] {
	if (!Array.isArray(value)) return [];
	const next: VenueImage[] = [];
	for (const item of value) {
		if (!item || typeof item !== 'object') continue;
		const raw = item as Record<string, unknown>;
		const url = typeof raw.url === 'string' ? raw.url.trim() : '';
		const path = typeof raw.path === 'string' ? raw.path.trim() : '';
		if (!url) continue;
		next.push({
			id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
			url,
			path
		});
		if (next.length >= MAX_VENUE_IMAGES) break;
	}
	return next;
}

export async function persistVenueImages(
	kept: VenueImage[],
	files: File[],
	previous: VenueImage[] = []
): Promise<VenueImage[]> {
	const keptPaths = new Set(kept.map((image) => image.path).filter(Boolean));
	const removed = previous.filter((image) => image.path && !keptPaths.has(image.path));
	if (removed.length) await removeImagePaths(removed.map((image) => image.path));

	if (!files.length) return kept.slice(0, MAX_VENUE_IMAGES);

	await ensureBucket();
	const client = supabase();
	const room = Math.max(0, MAX_VENUE_IMAGES - kept.length);
	const uploaded: VenueImage[] = [];

	for (const file of files.slice(0, room)) {
		if (!file.size) continue;
		if (file.size > MAX_BYTES) {
			throw new Error(`${file.name} is over 4 MB.`);
		}
		if (file.type && !ALLOWED.has(file.type)) {
			throw new Error(`${file.name} must be a JPEG, PNG, WebP, or GIF.`);
		}
		const id = crypto.randomUUID();
		const path = `${id}.${extFor(file)}`;
		const { error } = await client.storage.from(IMAGE_BUCKET).upload(path, file, {
			contentType: file.type || 'image/jpeg',
			upsert: false
		});
		if (error) throw new Error(error.message);
		const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
		uploaded.push({ id, path, url: data.publicUrl });
	}

	return [...kept, ...uploaded].slice(0, MAX_VENUE_IMAGES);
}

export async function removeImagePaths(paths: string[]): Promise<void> {
	const clean = paths.filter(Boolean);
	if (!clean.length) return;
	try {
		await ensureBucket();
		const { error } = await supabase().storage.from(IMAGE_BUCKET).remove(clean);
		if (error) console.error(error);
	} catch (error) {
		console.error(error);
	}
}

export function filesFromForm(data: FormData, name = 'photos'): File[] {
	return data
		.getAll(name)
		.filter((item): item is File => item instanceof File && item.size > 0);
}
