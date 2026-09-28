export function urlBase64ToUint8Array(value: string): Uint8Array {
	const padding = '='.repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(base64);
	const output = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
	return output;
}

export function pushSupported(): boolean {
	return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
	if (!pushSupported()) return null;
	const registration = await navigator.serviceWorker.getRegistration();
	if (!registration) return null;
	return registration.pushManager.getSubscription();
}

export async function enablePush(vapidPublicKey: string): Promise<'on' | 'denied' | 'unsupported' | 'missing' | 'error'> {
	if (!pushSupported()) return 'unsupported';
	const applicationServerKey = vapidApplicationServerKey(vapidPublicKey);
	if (!applicationServerKey) return 'missing';
	try {
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') return 'denied';
		const registration = await notificationRegistration();
		if (!registration) return 'error';
		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: applicationServerKey as BufferSource
		});
		const response = await fetch('/api/push', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(subscription)
		});
		return response.ok ? 'on' : 'error';
	} catch {
		return 'error';
	}
}

function vapidApplicationServerKey(value: string): Uint8Array | null {
	try {
		const key = urlBase64ToUint8Array(value);
		if (key.length !== 65 || key[0] !== 4) return null;
		return key;
	} catch {
		return null;
	}
}

/** `serviceWorker.ready` never settles when no worker is active, which leaves the button on Enabling…. */
async function notificationRegistration(): Promise<ServiceWorkerRegistration | null> {
	const existing = await navigator.serviceWorker.getRegistration();
	if (existing?.active) return existing;
	const registration =
		existing ??
		(await navigator.serviceWorker.register('/service-worker.js').catch(() => null));
	if (!registration) return null;
	if (registration.active) return registration;
	const worker = registration.installing ?? registration.waiting;
	if (!worker) return null;
	const active = await new Promise<boolean>((resolve) => {
		const timer = setTimeout(() => resolve(false), 8000);
		worker.addEventListener('statechange', () => {
			if (registration.active) {
				clearTimeout(timer);
				resolve(true);
			} else if (worker.state === 'redundant') {
				clearTimeout(timer);
				resolve(false);
			}
		});
	});
	return active ? registration : null;
}

export async function dropThisDevice(): Promise<void> {
	try {
		const subscription = await currentPushSubscription();
		if (!subscription) return;
		await fetch('/api/push', {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ endpoint: subscription.endpoint }),
			keepalive: true
		});
		await subscription.unsubscribe();
	} catch {
		// Signing out should still finish if the push endpoint is unreachable.
	}
}
