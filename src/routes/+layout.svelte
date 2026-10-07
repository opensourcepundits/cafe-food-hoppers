<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AddToHomeScreen from '$lib/components/AddToHomeScreen.svelte';
	import EmergencyMeeting from '$lib/components/EmergencyMeeting.svelte';
	import { dropThisDevice } from '$lib/push-client';
	import { applySiteFont, isSiteFont, siteFontFamily, siteFonts, type SiteFont } from '$lib/site-font';

	let { children, data } = $props();

	let font = $state<SiteFont>('plex');

	const path = $derived(page.url.pathname);
	const chosenFamily = $derived(siteFontFamily(font));
	const signedInName = $derived(
		data.user?.firstName?.trim() || data.user?.email.split('@')[0] || ''
	);
	const accountHref = $derived(
		data.user?.role === 'place_manager' || data.user?.role === 'franchise_manager' || data.user?.role === 'superuser'
			? '/admin'
			: '/profile'
	);

	function chooseFont(next: string) {
		if (!isSiteFont(next)) return;
		font = next;
		localStorage.setItem('place-font', next);
		void applySiteFont(next);
	}

	onMount(() => {
		const stored = localStorage.getItem('place-font');
		if (isSiteFont(stored)) {
			font = stored;
			void applySiteFont(stored);
		}
		const onSubmit = (event: Event) => {
			const form = event.target;
			if (!(form instanceof HTMLFormElement)) return;
			const action = form.getAttribute('action') ?? '';
			if (!action.includes('logout') || form.dataset.pushDropped === '1') return;
			event.preventDefault();
			void dropThisDevice().finally(() => {
				form.dataset.pushDropped = '1';
				form.requestSubmit();
			});
		};
		document.addEventListener('submit', onSubmit);
		return () => document.removeEventListener('submit', onSubmit);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icons/icon-192.png" />
	<meta name="theme-color" content="#f4f1ea" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Place" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Lato:ital,wght@0,400;0,700;1,400;1,700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen">
	<header class="border-b border-line">
		<div class="mx-auto flex max-w-6xl items-end justify-between gap-6 px-4 py-5 sm:px-6">
			<a href="/" class="group">
				<p class="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">Mauritius</p>
				<h1 class="mt-1 text-2xl font-semibold tracking-tight">Place</h1>
			</a>
			<nav class="flex gap-5 font-mono text-[11px] uppercase tracking-[0.18em]">
				<a
					href="/"
					class="border-b pb-0.5 {path === '/' ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}"
				>
					Places
				</a>
				<a
					href="/map"
					class="border-b pb-0.5 {path.startsWith('/map')
						? 'border-ink text-ink'
						: 'border-transparent text-muted hover:text-ink'}"
				>
					Map
				</a>
				<a
					href="/alerts"
					class="border-b pb-0.5 {path.startsWith('/alerts')
						? 'border-ink text-ink'
						: 'border-transparent text-muted hover:text-ink'}"
				>
					Alerts
				</a>
				<select
					aria-label="Font"
					class="cursor-pointer border-b bg-transparent pb-0.5 outline-none {font === 'plex'
						? 'border-transparent text-muted'
						: 'border-ink text-ink'}"
					style:font-family={chosenFamily ? `${chosenFamily}, sans-serif` : undefined}
					value={font}
					onchange={(event) => chooseFont(event.currentTarget.value)}
				>
					{#each siteFonts as option (option.id)}
						<option value={option.id} style:font-family={option.family || undefined}>{option.label}</option>
					{/each}
				</select>
				{#if signedInName}
					<a
						href={accountHref}
						class="border-b pb-0.5 normal-case tracking-normal {path.startsWith(accountHref)
							? 'border-ink text-ink'
							: 'border-transparent text-ink'}"
					>
						{signedInName}
					</a>
				{:else}
					<a
						href="/login"
						class="border-b pb-0.5 {path === '/login' ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}"
					>
						Login
					</a>
				{/if}
			</nav>
		</div>
	</header>
	<AddToHomeScreen />

	<main class="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6">
		{@render children()}
	</main>
	<EmergencyMeeting />

	<footer class="border-t border-line">
		<div class="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
			<p>Hours in Indian/Mauritius time (UTC+4).</p>
			<p>Independent index. Not affiliated with listed venues.</p>
		</div>
	</footer>
</div>
