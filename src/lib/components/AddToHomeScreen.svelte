<script lang="ts">
	import { onMount } from 'svelte';
	import Share from '@lucide/svelte/icons/share';
	import { iosInSafari, iosNeedsHomeScreen } from '$lib/ios-install';

	let { variant = 'banner' }: { variant?: 'banner' | 'inline' } = $props();

	let visible = $state(false);
	let inSafari = $state(true);
	let open = $state(false);

	const button = 'border border-ink bg-ink px-3 py-1.5 text-sm text-paper';

	onMount(() => {
		visible = iosNeedsHomeScreen();
		inSafari = iosInSafari();
	});
</script>

{#if visible}
	{#if variant === 'banner'}
		<div class="border-b border-line bg-paper-2">
			<div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
				<p class="text-sm leading-5">Add Place to your Home Screen to get alerts.</p>
				<button type="button" class="{button} shrink-0" onclick={() => (open = true)}>
					Add to Home Screen
				</button>
			</div>
		</div>
	{:else}
		<button type="button" class={button} onclick={() => (open = true)}>Add to Home Screen</button>
	{/if}
{/if}

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
		<div class="w-full max-w-sm border border-ink bg-paper p-5 shadow-[4px_4px_0_0_var(--color-ink)]">
			<p class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Home Screen</p>
			<h2 class="mt-2 text-lg font-semibold">Add Place</h2>
			{#if inSafari}
				<ol class="mt-4 space-y-3 text-sm leading-6">
					<li class="flex gap-3">
						<span class="font-mono text-xs text-muted">1</span>
						<span>Tap <Share class="inline size-4 align-text-bottom" /> Share in the Safari toolbar.</span>
					</li>
					<li class="flex gap-3">
						<span class="font-mono text-xs text-muted">2</span>
						<span>Tap <strong>Add to Home Screen</strong>.</span>
					</li>
					<li class="flex gap-3">
						<span class="font-mono text-xs text-muted">3</span>
						<span>Tap <strong>Add</strong>. Open Place from the new icon to turn on notifications.</span>
					</li>
				</ol>
			{:else}
				<p class="mt-4 text-sm leading-6">
					Open this page in Safari, then tap Share and choose Add to Home Screen. Notifications only arrive from that icon.
				</p>
			{/if}
			<button type="button" class="{button} mt-5" onclick={() => (open = false)}>Done</button>
		</div>
	</div>
{/if}
