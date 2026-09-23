<script lang="ts">
	import { page } from '$app/state';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();

	const path = $derived(page.url.pathname);
	const signedInName = $derived(
		data.user?.firstName?.trim() || data.user?.email.split('@')[0] || ''
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
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
					href="/specials"
					class="border-b pb-0.5 {path.startsWith('/specials')
						? 'border-ink text-ink'
						: 'border-transparent text-muted hover:text-ink'}"
				>
					Specials
				</a>
				{#if signedInName}
					<a
						href="/admin"
						class="border-b border-transparent pb-0.5 normal-case tracking-normal text-ink"
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

	<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
		{@render children()}
	</main>

	<footer class="border-t border-line">
		<div class="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-muted sm:flex-row sm:justify-between sm:px-6">
			<p>Hours in Indian/Mauritius time (UTC+4).</p>
			<p>Independent index. Not affiliated with listed venues.</p>
		</div>
	</footer>
</div>
