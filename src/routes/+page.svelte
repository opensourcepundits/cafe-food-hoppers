<script lang="ts">
	import { goto } from '$app/navigation';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Dialog from '$lib/components/admin/Dialog.svelte';
	import VenueCard from '$lib/components/VenueCard.svelte';
	import VenueFilterBar from '$lib/components/VenueFilterBar.svelte';

	let { data } = $props();
	let locating = $state(false);
	let locateError = $state('');
	let confirmOpen = $state(false);

	function askEmergency() {
		locateError = '';
		confirmOpen = true;
	}

	function findEmergencyPlace() {
		confirmOpen = false;
		locateError = '';
		if (!navigator.geolocation) {
			locateError = 'This browser cannot share your location.';
			return;
		}
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const params = new URLSearchParams({
					zoom: '1',
					lat: String(position.coords.latitude),
					lng: String(position.coords.longitude)
				});
				locating = false;
				goto(`/?${params}`);
			},
			() => {
				locating = false;
				locateError = 'Allow location access to find a place within a 5-minute walk.';
			},
			{ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
		);
	}

</script>

<svelte:head>
	<title>Place — Mauritius cafe index</title>
	<meta
		name="description"
		content="Find work-friendly cafes in Mauritius. Menus, live hours, specials, and venue alerts for Grand Baie, Ebène, Tamarin, Port Louis, and Moka."
	/>
</svelte:head>

<section class="mb-8 max-w-xl">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Directory</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Where to sit down and work.</h2>
	<p class="mt-3 text-sm leading-6 text-muted">
		Filter by district, work setup, late hours, and specials. Featured spots are paid placements.
	</p>
</section>

<button
	type="button"
	class="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full border border-ink bg-accent text-paper shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-60"
	aria-label="Emergency meeting"
	onclick={askEmergency}
	disabled={locating}
>
	<TriangleAlert class="size-6" />
</button>
{#if locateError}
	<p class="fixed right-4 bottom-24 z-40 max-w-xs border border-accent bg-paper px-3 py-2 text-sm text-accent">
		{locateError}
	</p>
{/if}
<Dialog
	open={confirmOpen}
	title="Emergency meeting"
	body="Do you have an emergency meeting? This finds the quietest open place within a 5-minute walk with solid Wi-Fi."
	confirmLabel="Find a place"
	danger
	busy={locating}
	oncancel={() => (confirmOpen = false)}
	onconfirm={findEmergencyPlace}
/>
{#if data.filters.zoom}
	<p class="mb-4 text-sm text-muted">
		Quiet, open now, fast Wi-Fi, within a 5-minute walk.
		<a href="/" class="underline decoration-line underline-offset-4">Clear</a>
	</p>
{/if}

<VenueFilterBar filters={data.filters} districts={data.districts} />

<p class="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
	{data.venues.length} {data.venues.length === 1 ? 'venue' : 'venues'}
</p>

{#if data.venues.length === 0}
	<div class="mb-20 border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
		{#if data.filters.zoom}
			No quiet place with fast Wi-Fi is open within a 5-minute walk.
		{:else}
			No venues match those filters. Clear a filter and try again.
		{/if}
	</div>
{:else}
	<ul class="grid gap-3 pb-20 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.venues as venue (venue.id)}
			<li>
				<VenueCard {venue} />
			</li>
		{/each}
	</ul>
{/if}
