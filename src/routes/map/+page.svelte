<script lang="ts">
	import PlacesMap from '$lib/components/PlacesMap.svelte';
	import VenueFilterBar from '$lib/components/VenueFilterBar.svelte';
	import { distanceMeters, type MapFrame, type MapPlace } from '$lib/venue';

	let { data } = $props();
	let map: PlacesMap | undefined = $state();
	let frame = $state<MapFrame | null>(null);
	let selected = $state<MapPlace | null>(null);

	$effect(() => {
		if (selected && !data.places.some((place) => place.id === selected.id)) selected = null;
	});

	const ordered = $derived.by(() => orderPlaces(data.places, frame));
	const inView = $derived.by(() => {
		const view = frame;
		if (!view) return ordered;
		return ordered.filter((place) => inside(place, view));
	});
	const outside = $derived.by(() => {
		const view = frame;
		if (!view) return [];
		return ordered.filter((place) => !inside(place, view));
	});

	function inside(place: MapPlace, view: MapFrame): boolean {
		return (
			place.lat <= view.north &&
			place.lat >= view.south &&
			place.lng <= view.east &&
			place.lng >= view.west
		);
	}

	function orderPlaces(places: MapPlace[], view: MapFrame | null): MapPlace[] {
		if (!view) return places;
		return [...places].sort((a, b) => {
			const aIn = inside(a, view) ? 0 : 1;
			const bIn = inside(b, view) ? 0 : 1;
			if (aIn !== bIn) return aIn - bIn;
			return (
				distanceMeters(view.lat, view.lng, a.lat, a.lng) -
				distanceMeters(view.lat, view.lng, b.lat, b.lng)
			);
		});
	}
</script>

<svelte:head>
	<title>Map — Place</title>
	<meta
		name="description"
		content="Map of every cafe in the Place directory, pinned from each venue’s Google Maps link."
	/>
</svelte:head>

<section class="mb-8 max-w-xl">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Map</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Every place, on the island.</h2>
	<p class="mt-3 text-sm leading-6 text-muted">
		Filter the pins, pan the map to reorder the list, and click a pin for hours and setup.
	</p>
</section>

<VenueFilterBar filters={data.filters} districts={data.districts} />

<p class="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
	{data.places.length} {data.places.length === 1 ? 'place' : 'places'}
	{#if data.missing > 0}
		· {data.missing} without a pin
	{/if}
</p>

{#if data.places.length === 0}
	<div class="border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
		{#if data.missing > 0}
			No places with a pin match those filters.
		{:else}
			No places have a Google Maps pin yet.
		{/if}
	</div>
{:else}
	<PlacesMap
		bind:this={map}
		places={data.places}
		{selected}
		onview={(next) => (frame = next)}
		onselect={(place) => (selected = place)}
	/>
	{#if inView.length}
		<p class="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">In this view</p>
		<ul class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each inView as place (place.id)}
				{@render card(place)}
			{/each}
		</ul>
	{/if}
	{#if outside.length}
		<p class="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Outside this view</p>
		<ul class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each outside as place (place.id)}
				{@render card(place)}
			{/each}
		</ul>
	{/if}
{/if}

{#snippet card(place: MapPlace)}
	<li
		class="flex items-baseline justify-between gap-3 border px-3 py-1.5 hover:border-ink hover:bg-paper-2 {selected?.id === place.id
			? 'border-ink bg-paper-2'
			: 'border-line'}"
	>
		<button
			type="button"
			class="min-w-0 text-left"
			onclick={() => {
				selected = place;
				map?.focus(place.id);
			}}
		>
			<span class="block truncate text-sm font-medium">{place.name}</span>
			<span class="block truncate text-xs text-muted">
				{place.district} · {place.open ? 'Open' : 'Closed'} · {place.hours}
			</span>
		</button>
		<a href="/venues/{place.slug}" class="shrink-0 text-xs underline decoration-line underline-offset-4">
			Open
		</a>
	</li>
{/snippet}
