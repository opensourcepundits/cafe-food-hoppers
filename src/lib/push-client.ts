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
	if (!vapidPublicKey) return 'missing';
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return 'denied';
	const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
	});
	const response = await fetch('/api/push', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(subscription)
	});
	return response.ok ? 'on' : 'error';
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
