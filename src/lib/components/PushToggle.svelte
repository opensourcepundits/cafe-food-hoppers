<script lang="ts">
	import { onMount } from 'svelte';
	import AddToHomeScreen from '$lib/components/AddToHomeScreen.svelte';
	import { iosNeedsHomeScreen } from '$lib/ios-install';
	import { currentPushSubscription, dropThisDevice, enablePush, pushSupported } from '$lib/push-client';

	let { vapidPublicKey }: { vapidPublicKey: string } = $props();

	let status = $state<'idle' | 'on' | 'denied' | 'unsupported' | 'missing' | 'error' | 'working'>('idle');
	let iosInstall = $state(false);

	const button =
		'border border-ink bg-paper px-3 py-1.5 text-sm hover:bg-ink hover:text-paper disabled:opacity-50';

	onMount(() => {
		iosInstall = iosNeedsHomeScreen();
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
		try {
			status = await enablePush(vapidPublicKey);
		} catch {
			status = 'error';
		}
	}

	async function disable() {
		status = 'working';
		await dropThisDevice();
		status = 'idle';
	}
</script>

{#if iosInstall}
	<AddToHomeScreen variant="inline" />
{:else if status === 'unsupported'}
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
