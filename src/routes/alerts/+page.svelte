<script lang="ts">
	import SpecialCard from '$lib/components/SpecialCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Alerts — Place</title>
	<meta
		name="description"
		content="Ongoing and upcoming alerts from cafes across Mauritius — Grand Baie, Ebène, Tamarin, Port Louis, and Moka."
	/>
</svelte:head>

<section class="mb-8 max-w-xl">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Alerts</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">What’s on, and what’s next.</h2>
	<p class="mt-3 text-sm leading-6 text-muted">
		Ongoing and upcoming alerts from the directory, earliest first. Saved places are listed before the rest. Times are Indian/Mauritius.
	</p>
</section>

<p class="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
	{data.items.length} {data.items.length === 1 ? 'alert' : 'alerts'}
</p>

{#if data.items.length === 0}
	<div class="border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
		No ongoing or upcoming alerts right now.
	</div>
{:else}
	<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.items as item (`${item.venueId}-${item.alert.id}`)}
			<li><SpecialCard {item} /></li>
		{/each}
	</ul>
{/if}
