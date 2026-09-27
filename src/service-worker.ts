/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = globalThis as unknown as ServiceWorkerGlobalScope;

type PushPayload = {
	title?: string;
	body?: string;
	url?: string;
	tag?: string;
};

sw.addEventListener('install', () => {
	sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(sw.clients.claim());
});

sw.addEventListener('push', (event) => {
	const data = readPayload(event);
	const title = data.title?.trim() || 'Place';
	const path = safePath(data.url);
	event.waitUntil(
		sw.registration.showNotification(title, {
			body: data.body?.trim() || 'Open the place for details.',
			icon: '/icons/icon-192.png',
			badge: '/icons/icon-192.png',
			tag: data.tag?.trim() || 'place',
			data: { url: path }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const path = safePath(event.notification.data?.url);
	const target = new URL(path, sw.location.origin).href;
	event.waitUntil(openPlace(target));
});

function readPayload(event: PushEvent): PushPayload {
	try {
		const parsed = event.data?.json();
		return parsed && typeof parsed === 'object' ? (parsed as PushPayload) : {};
	} catch {
		return {};
	}
}

function safePath(value: unknown): string {
	return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

async function openPlace(target: string): Promise<void> {
	const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
	const existing = windows.find((client) => client.url.startsWith(sw.location.origin));
	if (existing) {
		await existing.focus();
		if ('navigate' in existing && typeof existing.navigate === 'function') {
			await existing.navigate(target);
		}
		return;
	}
	await sw.clients.openWindow(target);
}
