<script lang="ts">
	import { goto } from '$app/navigation';
	import Search from '@lucide/svelte/icons/search';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Dialog from '$lib/components/admin/Dialog.svelte';
	import FilterChip from '$lib/components/FilterChip.svelte';
	import VenueCard from '$lib/components/VenueCard.svelte';
	import { ERGONOMIC_LEVELS, LIGHTING_TYPES, OUTLET_RATINGS, ergoLabel, lightingLabel, outletRatingLabel } from '$lib/venue';

	let { data } = $props();
	const activeFilters = $derived(
		[
			data.filters.workFriendly,
			data.filters.notWorkFriendly,
			data.filters.wifi,
			data.filters.outlets,
			data.filters.niceView,
			data.filters.ocean,
			data.filters.airConditioning,
			data.filters.indoor,
			data.filters.outdoor,
			data.filters.openNow,
			data.filters.late,
			data.filters.ongoingSpecials,
			data.filters.upcomingSpecials
		].filter(Boolean).length +
			data.filters.lighting.length +
			data.filters.outletRatings.length +
			data.filters.ergonomic.length
	);
	let filtersOpen = $state(activeFilters > 0);
	$effect(() => {
		if (activeFilters > 0) filtersOpen = true;
	});
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

	function submitForm(event: Event) {
		const target = event.currentTarget;
		if (target instanceof HTMLSelectElement) target.form?.requestSubmit();
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

<form method="GET" data-sveltekit-noscroll class="mb-8 border border-line bg-paper-2 p-4">
	<div class="flex flex-col gap-3 sm:flex-row">
		<label class="relative block flex-1">
			<span class="sr-only">Search</span>
			<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
			<input
				name="q"
				value={data.filters.q}
				placeholder="Search venue, dish, or special"
				class="w-full border border-line bg-paper py-2 pr-3 pl-10 text-sm outline-none focus:border-ink"
			/>
		</label>
		<select
			name="district"
			onchange={submitForm}
			class="border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
		>
			<option value="">All districts</option>
			{#each data.districts as district (district)}
				<option value={district} selected={data.filters.district === district}>{district}</option>
			{/each}
		</select>
		<button type="submit" class="border border-ink bg-ink px-4 py-2 text-sm text-paper">
			Search
		</button>
	</div>

	<button
		type="button"
		class="mt-4 flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted sm:hidden"
		aria-expanded={filtersOpen}
		onclick={() => (filtersOpen = !filtersOpen)}
	>
		<span>Filters{activeFilters > 0 ? ` · ${activeFilters}` : ''}</span>
		<span>{filtersOpen ? 'Hide' : 'Show'}</span>
	</button>
	<div class="mt-4 flex-wrap gap-2 {filtersOpen ? 'flex' : 'hidden'} sm:mt-0 sm:flex">
		<FilterChip name="work" checked={data.filters.workFriendly}>Work friendly</FilterChip>
		<FilterChip name="notwork" checked={data.filters.notWorkFriendly}>Not work friendly</FilterChip>
		<FilterChip name="wifi" checked={data.filters.wifi}>WiFi</FilterChip>
		<FilterChip name="outlets" checked={data.filters.outlets}>Outlets</FilterChip>
		{#each OUTLET_RATINGS as rating (rating)}
			<FilterChip name="outlets_{rating}" checked={data.filters.outletRatings.includes(rating)}>
				{outletRatingLabel(rating)}
			</FilterChip>
		{/each}
		{#each LIGHTING_TYPES as type (type)}
			<FilterChip name="light_{type}" checked={data.filters.lighting.includes(type)}>
				{lightingLabel(type)}
			</FilterChip>
		{/each}
		{#each ERGONOMIC_LEVELS as level (level)}
			<FilterChip name="ergo_{level}" checked={data.filters.ergonomic.includes(level)}>
				{ergoLabel(level)}
			</FilterChip>
		{/each}
		<FilterChip name="view" checked={data.filters.niceView}>Nice view</FilterChip>
		<FilterChip name="ocean" checked={data.filters.ocean}>Close to ocean</FilterChip>
		<FilterChip name="ac" checked={data.filters.airConditioning}>A/C</FilterChip>
		<FilterChip name="indoor" checked={data.filters.indoor}>Indoor seating</FilterChip>
		<FilterChip name="outdoor" checked={data.filters.outdoor}>Outdoor seating</FilterChip>
		<FilterChip name="open" checked={data.filters.openNow}>Open now</FilterChip>
		<FilterChip name="late" checked={data.filters.late}>Open till late</FilterChip>
		<FilterChip name="ongoing" checked={data.filters.ongoingSpecials}>Ongoing specials</FilterChip>
		<FilterChip name="upcoming" checked={data.filters.upcomingSpecials}>Upcoming specials</FilterChip>
	</div>
</form>

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
