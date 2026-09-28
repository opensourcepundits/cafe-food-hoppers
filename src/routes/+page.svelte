<script lang="ts">
	import VenueCard from '$lib/components/VenueCard.svelte';
	import VenueFilterBar from '$lib/components/VenueFilterBar.svelte';

	let { data } = $props();
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
