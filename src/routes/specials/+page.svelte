<script lang="ts">
	import SpecialCard from '$lib/components/SpecialCard.svelte';

	let { data } = $props();
	const total = $derived(data.ongoing.length + data.upcoming.length);
</script>

<svelte:head>
	<title>Specials — Place</title>
	<meta
		name="description"
		content="Ongoing and upcoming cafe specials across Mauritius — Grand Baie, Ebène, Tamarin, Port Louis, and Moka."
	/>
</svelte:head>

<section class="mb-8 max-w-xl">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Specials</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">What’s on, and what’s next.</h2>
	<p class="mt-3 text-sm leading-6 text-muted">
		Live deals and coming promotions from the directory. Times are Indian/Mauritius.
	</p>
</section>

<p class="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
	{total} {total === 1 ? 'special' : 'specials'}
</p>

{#if total === 0}
	<div class="border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
		No active or upcoming specials right now.
	</div>
{:else}
	{#if data.ongoing.length > 0}
		<section class="mb-10">
			<h3 class="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">On now</h3>
			<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.ongoing as item (`${item.venueId}-${item.special.id}`)}
					<li><SpecialCard {item} /></li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.upcoming.length > 0}
		<section>
			<h3 class="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Upcoming</h3>
			<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.upcoming as item (`${item.venueId}-${item.special.id}`)}
					<li><SpecialCard {item} /></li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}
