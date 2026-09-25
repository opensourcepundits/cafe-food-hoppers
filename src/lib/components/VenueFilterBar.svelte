<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import FilterChip from '$lib/components/FilterChip.svelte';
	import {
		ERGONOMIC_LEVELS,
		LIGHTING_TYPES,
		OUTLET_RATINGS,
		ergoLabel,
		lightingLabel,
		outletRatingLabel,
		type VenueFilters
	} from '$lib/venue';

	let { filters, districts }: { filters: VenueFilters; districts: readonly string[] } = $props();

	const activeFilters = $derived(
		[
			filters.workFriendly,
			filters.notWorkFriendly,
			filters.wifi,
			filters.outlets,
			filters.niceView,
			filters.ocean,
			filters.airConditioning,
			filters.indoor,
			filters.outdoor,
			filters.openNow,
			filters.late,
			filters.ongoingSpecials,
			filters.upcomingSpecials
		].filter(Boolean).length +
			filters.lighting.length +
			filters.outletRatings.length +
			filters.ergonomic.length
	);
	let filtersOpen = $state(activeFilters > 0);
	$effect(() => {
		if (activeFilters > 0) filtersOpen = true;
	});

	function submitForm(event: Event) {
		const target = event.currentTarget;
		if (target instanceof HTMLSelectElement) target.form?.requestSubmit();
	}
</script>

<form method="GET" data-sveltekit-noscroll class="mb-8 border border-line bg-paper-2 p-4">
	<div class="flex flex-col gap-3 sm:flex-row">
		<label class="relative block flex-1">
			<span class="sr-only">Search</span>
			<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
			<input
				name="q"
				value={filters.q}
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
			{#each districts as district (district)}
				<option value={district} selected={filters.district === district}>{district}</option>
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
		<FilterChip name="work" checked={filters.workFriendly}>Work friendly</FilterChip>
		<FilterChip name="notwork" checked={filters.notWorkFriendly}>Not work friendly</FilterChip>
		<FilterChip name="wifi" checked={filters.wifi}>WiFi</FilterChip>
		<FilterChip name="outlets" checked={filters.outlets}>Outlets</FilterChip>
		{#each OUTLET_RATINGS as rating (rating)}
			<FilterChip name="outlets_{rating}" checked={filters.outletRatings.includes(rating)}>
				{outletRatingLabel(rating)}
			</FilterChip>
		{/each}
		{#each LIGHTING_TYPES as type (type)}
			<FilterChip name="light_{type}" checked={filters.lighting.includes(type)}>
				{lightingLabel(type)}
			</FilterChip>
		{/each}
		{#each ERGONOMIC_LEVELS as level (level)}
			<FilterChip name="ergo_{level}" checked={filters.ergonomic.includes(level)}>
				{ergoLabel(level)}
			</FilterChip>
		{/each}
		<FilterChip name="view" checked={filters.niceView}>Nice view</FilterChip>
		<FilterChip name="ocean" checked={filters.ocean}>Close to ocean</FilterChip>
		<FilterChip name="ac" checked={filters.airConditioning}>A/C</FilterChip>
		<FilterChip name="indoor" checked={filters.indoor}>Indoor seating</FilterChip>
		<FilterChip name="outdoor" checked={filters.outdoor}>Outdoor seating</FilterChip>
		<FilterChip name="open" checked={filters.openNow}>Open now</FilterChip>
		<FilterChip name="late" checked={filters.late}>Open till late</FilterChip>
		<FilterChip name="ongoing" checked={filters.ongoingSpecials}>Ongoing specials</FilterChip>
		<FilterChip name="upcoming" checked={filters.upcomingSpecials}>Upcoming specials</FilterChip>
	</div>
</form>
