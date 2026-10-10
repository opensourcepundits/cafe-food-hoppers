<script lang="ts">
	import { onMount } from 'svelte';
	import Share from '@lucide/svelte/icons/share';
	import { iosInSafari, iosNeedsHomeScreen, registerIosInstallOpener } from '$lib/ios-install';

	let { variant = 'banner' }: { variant?: 'banner' | 'inline' } = $props();

	let visible = $state(false);
	let inSafari = $state(true);
	let open = $state(false);

	const hideKey = 'place-ios-install-hide';
	const seenKey = 'place-ios-install-steps';
	const button = 'border border-ink bg-ink px-3 py-1.5 text-sm text-paper';

	onMount(() => {
		inSafari = iosInSafari();
		const needs = iosNeedsHomeScreen();
		if (!needs) return;
		if (variant === 'inline') {
			visible = true;
			return;
		}
		const hidden = sessionStorage.getItem(hideKey) === '1';
		visible = !hidden;
		const unregister = registerIosInstallOpener(() => {
			open = true;
		});
		if (!hidden && sessionStorage.getItem(seenKey) !== '1') open = true;
		return unregister;
	});

	function closeSteps() {
		open = false;
		sessionStorage.setItem(seenKey, '1');
	}

	function later() {
		visible = false;
		open = false;
		sessionStorage.setItem(hideKey, '1');
		sessionStorage.setItem(seenKey, '1');
	}
</script>

{#if visible}
	{#if variant === 'banner'}
		<div class="border-b border-ink bg-paper-2">
			<div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
				<div>
					<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">iPhone alerts</p>
					<p class="mt-1 max-w-xl text-sm leading-5">
						Safari will not notify you. Add Place to your Home Screen, open it from the new icon, and allow notifications. Otherwise you miss events at saved places.
					</p>
				</div>
				<div class="flex shrink-0 items-center gap-3">
					<button type="button" class={button} onclick={() => (open = true)}>Add to Home Screen</button>
					<button type="button" class="text-sm text-muted underline decoration-line underline-offset-4" onclick={later}>
						Later
					</button>
				</div>
			</div>
		</div>
	{:else}
		<button type="button" class={button} onclick={() => (open = true)}>Add to Home Screen to get alerts</button>
	{/if}
{/if}

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
		<div class="w-full max-w-sm border border-ink bg-paper p-5 shadow-[4px_4px_0_0_var(--color-ink)]">
			<p class="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Required on iPhone</p>
			<h2 class="mt-2 text-lg font-semibold">Add Place to get alerts</h2>
			<p class="mt-2 text-sm leading-6">
				This is the only way notifications work on iPhone. Safari itself will not deliver them.
			</p>
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
			<button type="button" class="{button} mt-5" onclick={closeSteps}>Done</button>
		</div>
	</div>
{/if}
