<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import FilterChip from '$lib/components/FilterChip.svelte';
	import VenueCard from '$lib/components/VenueCard.svelte';

	let { data } = $props();

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

	<div class="mt-4 flex flex-wrap gap-2">
		<FilterChip name="work" checked={data.filters.workFriendly}>Work friendly</FilterChip>
		<FilterChip name="notwork" checked={data.filters.notWorkFriendly}>Not work friendly</FilterChip>
		<FilterChip name="wifi" checked={data.filters.wifi}>WiFi</FilterChip>
		<FilterChip name="outlets" checked={data.filters.outlets}>Outlets</FilterChip>
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
	<div class="border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
		No venues match those filters. Clear a filter and try again.
	</div>
{:else}
	<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.venues as venue (venue.id)}
			<li>
				<VenueCard {venue} />
			</li>
		{/each}
	</ul>
{/if}
