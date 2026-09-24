<script lang="ts">
	import PlacesMap from '$lib/components/PlacesMap.svelte';

	let { data } = $props();
	let map: PlacesMap | undefined = $state();
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
		Pins are read from the Google Maps link on each place. Click a name to jump to it.
	</p>
</section>

<p class="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
	{data.places.length} {data.places.length === 1 ? 'place' : 'places'}
	{#if data.missing > 0}
		· {data.missing} without a pin
	{/if}
</p>

{#if data.places.length === 0}
	<div class="border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
		No places have a Google Maps pin yet.
	</div>
{:else}
	<PlacesMap bind:this={map} places={data.places} />
	<ul class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.places as place (place.id)}
			<li class="flex items-baseline justify-between gap-3 border border-line px-3 py-2 hover:border-ink hover:bg-paper-2">
				<button type="button" class="min-w-0 text-left" onclick={() => map?.focus(place.id)}>
					<span class="block text-sm font-medium">{place.name}</span>
					<span class="text-xs text-muted">{place.district}</span>
				</button>
				<a href="/venues/{place.slug}" class="shrink-0 text-xs underline decoration-line underline-offset-4">
					Open
				</a>
			</li>
		{/each}
	</ul>
{/if}
