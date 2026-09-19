<script lang="ts">
	import { formatSpecialWhen, type LiveVenue } from '$lib/venue';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { hoursLabel, noiseLabel, outletLabel, wifiLabel } from '$lib/venue';

	let { venue }: { venue: LiveVenue } = $props();

	const workBits = $derived(
		[
			venue.workFriendly ? 'Work friendly' : 'Not work friendly',
			wifiLabel(venue.workInfo),
			outletLabel(venue.workInfo.outlet_access, venue.workInfo.outlets),
			noiseLabel(venue.workInfo.noise_level),
			venue.openLate ? 'Open till late' : null
		].filter((value): value is string => Boolean(value))
	);

	const liveSpecial = $derived(venue.ongoingSpecials[0] ?? venue.upcomingSpecials[0] ?? null);
	const liveSpecialKind = $derived(
		venue.ongoingSpecials.length > 0 ? 'ongoing' : venue.upcomingSpecials.length > 0 ? 'upcoming' : null
	);
</script>

<a
	href="/venues/{venue.slug}"
	class="group block border border-line bg-paper p-4 transition-colors hover:border-ink hover:bg-paper-2"
>
	<div class="flex items-start justify-between gap-3">
		<div>
			{#if venue.isFeatured}
				<p class="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Featured</p>
			{/if}
			<h2 class="text-lg font-medium tracking-tight group-hover:underline">{venue.name}</h2>
			<p class="mt-0.5 text-sm text-muted">{venue.district}</p>
		</div>
		<StatusBadge status={venue.open ? 'open' : 'closed'} alert={venue.alerts.length > 0} />
	</div>

	<p class="mt-4 text-sm tabular-nums text-muted">
		{hoursLabel(venue.openingHours)}
		{#if venue.openLate}
			<span class="text-ink"> · Late</span>
		{/if}
	</p>

	{#if liveSpecial && liveSpecialKind}
		<p class="mt-3 border-l-2 border-accent pl-2 text-sm">
			<span class="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
				{liveSpecialKind === 'ongoing' ? 'On now' : 'Upcoming'}
			</span>
			<span class="mt-0.5 block">{liveSpecial.title}</span>
			<span class="block text-xs text-muted">{formatSpecialWhen(liveSpecial)}</span>
		</p>
	{/if}

	<ul class="mt-3 flex flex-wrap gap-1.5">
		{#each workBits as bit (bit)}
			<li
				class="border border-line px-2 py-0.5 text-[11px] text-muted"
				class:border-ink={bit === 'Work friendly' || bit === 'Open till late'}
				class:text-ink={bit === 'Work friendly' || bit === 'Open till late'}
			>
				{bit}
			</li>
		{/each}
	</ul>
</a>
