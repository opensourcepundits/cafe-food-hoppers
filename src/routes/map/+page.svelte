<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PlacesMap from '$lib/components/PlacesMap.svelte';
	import VenueFilterBar from '$lib/components/VenueFilterBar.svelte';
	import {
		distanceMeters,
		walkMinutes,
		meetWalkMeters,
		type MapFrame,
		type MapPlace,
		type MeetWalkMinutes
	} from '$lib/venue';

	let { data } = $props();
	let map: PlacesMap | undefined = $state();
	let frame = $state<MapFrame | null>(null);
	let selected = $state<MapPlace | null>(null);

	$effect(() => {
		if (selected && !data.places.some((place) => place.id === selected.id)) selected = null;
	});

	const meet = $derived.by(() => {
		const minutes = data.filters.meetMinutes;
		const { lat, lng } = data.filters;
		if (!minutes || lat === null || lng === null) return null;
		const meters = meetWalkMeters(minutes);
		const ids = data.places
			.filter((place) => distanceMeters(lat, lng, place.lat, place.lng) <= meters)
			.map((place) => place.id);
		return { lat, lng, minutes, meters, ids };
	});
	const walkIds = $derived(new Set(meet?.ids ?? []));
	const withinWalk = $derived.by(() => {
		const area = meet;
		if (!area) return [];
		return data.places
			.filter((place) => walkIds.has(place.id))
			.sort(
				(a, b) =>
					distanceMeters(area.lat, area.lng, a.lat, a.lng) -
					distanceMeters(area.lat, area.lng, b.lat, b.lng)
			);
	});

	const ordered = $derived.by(() => orderPlaces(data.places, frame));
	const inView = $derived.by(() => {
		const view = frame;
		const visible = ordered.filter((place) => !walkIds.has(place.id));
		if (!view) return visible;
		return visible.filter((place) => inside(place, view));
	});
	const outside = $derived.by(() => {
		const view = frame;
		if (!view) return [];
		return ordered.filter((place) => !inside(place, view) && !walkIds.has(place.id));
	});

	function setMeet(minutes: MeetWalkMinutes) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('meet', String(minutes));
		goto(`?${params}`, { noScroll: true, keepFocus: true, replaceState: true });
	}

	function inside(place: MapPlace, view: MapFrame): boolean {
		return (
			place.lat <= view.north &&
			place.lat >= view.south &&
			place.lng <= view.east &&
			place.lng >= view.west
		);
	}

	function orderPlaces(places: MapPlace[], view: MapFrame | null): MapPlace[] {
		return [...places].sort((a, b) => {
			if (view) {
				const aIn = inside(a, view) ? 0 : 1;
				const bIn = inside(b, view) ? 0 : 1;
				if (aIn !== bIn) return aIn - bIn;
			}
			const featured = Number(b.isFeatured) - Number(a.isFeatured);
			if (featured !== 0) return featured;
			if (a.featuredPriority !== b.featuredPriority) return b.featuredPriority - a.featuredPriority;
			if (!view) return a.name.localeCompare(b.name);
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

{#if meet}
	<section class="mb-4 max-w-xl">
		<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Emergency meeting</p>
		<h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
			Within a {meet.minutes}-minute walk.
		</h2>
		<p class="mt-3 text-sm leading-6 text-muted">
			Marked pins are inside this walk. Widen the radius if you need more places.
			<a href="/map" class="underline decoration-line underline-offset-4">Clear</a>
		</p>
	</section>
{:else}
	<section class="mb-8 max-w-xl">
		<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Map</p>
		<h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Every place, on the island.</h2>
		<p class="mt-3 text-sm leading-6 text-muted">
			Filter the pins, pan the map to reorder the list, and click a pin for hours and setup. A blue dot marks this device.
		</p>
	</section>

	<VenueFilterBar filters={data.filters} districts={data.districts} />

	<p class="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
		{data.places.length} {data.places.length === 1 ? 'place' : 'places'}
		{#if data.missing > 0}
			· {data.missing} without a pin
		{/if}
	</p>
{/if}

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
		{meet}
		onview={(next) => (frame = next)}
		onselect={(place) => (selected = place)}
		onmeet={setMeet}
	/>
	{#if meet}
		<p class="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
			Within a {meet.minutes}-minute walk · {withinWalk.length}
			{withinWalk.length === 1 ? 'place' : 'places'}
		</p>
		{#if withinWalk.length === 0}
			<p class="mt-2 border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
				No places within a {meet.minutes}-minute walk.
			</p>
		{:else}
			<ul class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each withinWalk as place (place.id)}
					{@render card(place, distanceMeters(meet.lat, meet.lng, place.lat, place.lng))}
				{/each}
			</ul>
		{/if}
	{/if}
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

{#if meet}
	<div class="mt-8">
		<VenueFilterBar filters={data.filters} districts={data.districts} />
	</div>
{/if}

{#snippet card(place: MapPlace, meters: number | null = null)}
	<li
		class="relative border hover:border-ink hover:bg-paper-2 {selected?.id === place.id
			? 'border-ink bg-paper-2'
			: meters !== null
				? 'border-accent'
				: 'border-line'}"
	>
		<button
			type="button"
			class="block w-full px-3 py-2 pr-24 text-left"
			onclick={() => {
				selected = null;
				map?.focus(place.id);
				selected = place;
			}}
		>
			<span class="block truncate text-sm font-medium">{place.name}</span>
			<span class="block truncate text-xs text-muted">
				{#if meters !== null}{walkMinutes(meters)} min walk · {/if}{place.open ? 'Open' : 'Closed'} · {place.hours} · {place.wifi ?? 'No WiFi'}
			</span>
		</button>
		<a
			href="/venues/{place.slug}"
			class="absolute top-1/2 right-3 -translate-y-1/2 text-xs underline decoration-line underline-offset-4"
		>
			More info
		</a>
	</li>
{/snippet}
