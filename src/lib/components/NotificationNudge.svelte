<script lang="ts">
	import { page } from '$app/state';
	import { iosNeedsHomeScreen } from '$lib/ios-install';
	import { enablePush, notificationsActive, pushSupported } from '$lib/push-client';

	let { vapidPublicKey, signedIn }: { vapidPublicKey: string; signedIn: boolean } = $props();

	let checked = $state(false);
	let active = $state(true);
	let denied = $state(false);
	let dismissed = $state(false);
	let iosInstall = $state(false);
	let working = $state(false);
	let failed = $state(false);
	let ask = $state(false);

	const hideKey = 'place-notify-nudge-hide';
	const askKey = 'place-notify-nudge-ask';
	const button = 'border border-ink bg-ink px-3 py-1.5 text-sm text-paper disabled:opacity-50';

	$effect(() => {
		const path = page.url.pathname;
		const savedNow = page.url.searchParams.get('saved') === '1';
		const onProfile = path.startsWith('/profile');
		if (!signedIn) return;
		if (savedNow || onProfile) ask = false;
		let cancelled = false;
		iosInstall = iosNeedsHomeScreen();
		dismissed = sessionStorage.getItem(hideKey) === '1';
		if (iosInstall || !pushSupported()) {
			checked = true;
			return;
		}
		denied = Notification.permission === 'denied';
		void notificationsActive().then((on) => {
			if (cancelled) return;
			active = on;
			denied = Notification.permission === 'denied';
			checked = true;
			if (
				!on &&
				!savedNow &&
				!onProfile &&
				sessionStorage.getItem(hideKey) !== '1' &&
				sessionStorage.getItem(askKey) !== '1'
			) {
				ask = true;
			}
		});
		return () => {
			cancelled = true;
		};
	});

	const quiet = $derived(
		page.url.pathname.startsWith('/profile') || page.url.searchParams.get('saved') === '1'
	);
	const show = $derived(checked && signedIn && !active && !dismissed && !quiet && !iosInstall && pushSupported());

	function later() {
		dismissed = true;
		ask = false;
		sessionStorage.setItem(hideKey, '1');
		sessionStorage.setItem(askKey, '1');
	}

	async function enable() {
		working = true;
		failed = false;
		try {
			const status = await enablePush(vapidPublicKey);
			if (status === 'on') {
				active = true;
				ask = false;
				return;
			}
			denied = status === 'denied';
			failed = status !== 'denied';
		} catch {
			failed = true;
		} finally {
			working = false;
		}
	}
</script>

{#if ask}
	<div class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
		<div class="w-full max-w-sm border border-ink bg-paper p-5 shadow-[4px_4px_0_0_var(--color-ink)]">
			<p class="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Notifications are off</p>
			<h2 class="mt-2 text-lg font-semibold">Allow notifications</h2>
			<p class="mt-3 text-sm leading-6">
				{#if denied}
					They are blocked for this site. Allow notifications in your browser settings, or you will miss events and promotions at saved places.
				{:else}
					Turn them on so a saved place can tell you when an event is about to start, or when a promotion starts now.
				{/if}
			</p>
			{#if failed}
				<p class="mt-3 text-sm text-accent">Could not enable notifications. Try again.</p>
			{/if}
			<div class="mt-5 flex items-center gap-3">
				{#if !denied}
					<button type="button" class={button} disabled={working} onclick={enable}>
						{working ? 'Enabling…' : 'Allow notifications'}
					</button>
				{/if}
				<button
					type="button"
					class="text-sm text-muted underline decoration-line underline-offset-4"
					onclick={() => {
						ask = false;
						sessionStorage.setItem(askKey, '1');
					}}
				>
					Not now
				</button>
			</div>
		</div>
	</div>
{/if}

{#if show && !ask}
	<div class="border-b border-accent bg-paper-2">
		<div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
			<div>
				<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Notifications are off</p>
				<p class="mt-1 max-w-xl text-sm leading-5">
					{#if denied}
						They are blocked for this site. Allow notifications in your browser settings, or you will miss events and promotions at saved places.
					{:else}
						Turn them on so a saved place can tell you when an event is about to start, or when a promotion starts now.
					{/if}
				</p>
				{#if failed}
					<p class="mt-2 text-sm text-accent">Could not enable notifications. Try again.</p>
				{/if}
			</div>
			<div class="flex shrink-0 items-center gap-3">
				{#if !denied}
					<button type="button" class={button} disabled={working} onclick={enable}>
						{working ? 'Enabling…' : 'Allow notifications'}
					</button>
				{/if}
				<button type="button" class="text-sm text-muted underline decoration-line underline-offset-4" onclick={later}>
					Not now
				</button>
			</div>
		</div>
	</div>
{/if}
