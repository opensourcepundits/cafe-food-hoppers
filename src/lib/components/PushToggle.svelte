<script lang="ts">
	import { onMount } from 'svelte';
	import { currentPushSubscription, dropThisDevice, enablePush, pushSupported } from '$lib/push-client';

	let { vapidPublicKey }: { vapidPublicKey: string } = $props();

	let status = $state<'idle' | 'on' | 'denied' | 'unsupported' | 'missing' | 'error' | 'working'>('idle');
	let iosInstall = $state(false);

	const button =
		'border border-ink bg-paper px-3 py-1.5 text-sm hover:bg-ink hover:text-paper disabled:opacity-50';

	onMount(() => {
		const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
		const standalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
		iosInstall = ios && !standalone;
		if (!pushSupported()) {
			status = 'unsupported';
			return;
		}
		void currentPushSubscription().then((subscription) => {
			if (subscription) status = 'on';
		});
	});

	async function enable() {
		status = 'working';
		status = await enablePush(vapidPublicKey);
	}

	async function disable() {
		status = 'working';
		await dropThisDevice();
		status = 'idle';
	}
</script>

{#if iosInstall}
	<p class="text-xs leading-5 text-muted">On iPhone, add Place to your Home Screen before notifications can arrive.</p>
{/if}

{#if status === 'unsupported'}
	<p class="text-sm text-muted">This browser cannot receive notifications.</p>
{:else if status === 'missing'}
	<p class="text-sm text-muted">Notifications are not configured on this server yet.</p>
{:else if status === 'denied'}
	<p class="text-sm text-muted">Notifications are blocked for this site.</p>
{:else if status === 'error'}
	<p class="text-sm text-accent">Could not enable notifications.</p>
	<button type="button" class="{button} mt-2" onclick={enable}>Try again</button>
{:else if status === 'on'}
	<button type="button" class={button} onclick={disable}>Notifications on</button>
{:else}
	<button type="button" class={button} disabled={status === 'working'} onclick={enable}>
		{status === 'working' ? 'Enabling…' : 'Enable notifications'}
	</button>
{/if}
