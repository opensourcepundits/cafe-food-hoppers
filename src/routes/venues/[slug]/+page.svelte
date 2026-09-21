<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Clock from '@lucide/svelte/icons/clock';
	import Globe from '@lucide/svelte/icons/globe';
	import AtSign from '@lucide/svelte/icons/at-sign';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Phone from '@lucide/svelte/icons/phone';
	import Plug from '@lucide/svelte/icons/plug';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Wifi from '@lucide/svelte/icons/wifi';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import MapEmbed from '$lib/components/MapEmbed.svelte';
	import {
		dayHoursLabel,
		formatSpecialWhen,
		hoursLabel,
		mapsUrl,
		mur,
		noiseLabel,
		orderedWeekdays,
		outletLabel,
		parseMapsPin,
		weekdayLabel,
		wifiLabel
	} from '$lib/venue';

	let { data } = $props();
	const venue = $derived(data.venue);

	const maps = $derived(
		venue.contact.google_maps ??
			(venue.lat !== null && venue.lng !== null ? mapsUrl(venue.lat, venue.lng) : null)
	);
	const pin = $derived(
		venue.lat !== null && venue.lng !== null
			? { lat: venue.lat, lng: venue.lng }
			: parseMapsPin(venue.contact.google_maps ?? '')
	);
</script>

<svelte:head>
	<title>{venue.name} — Place</title>
	<meta name="description" content="{venue.name} in {venue.district}. Hours, menu, and work setup." />
</svelte:head>

<a href="/" class="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
	<ArrowLeft class="size-4" />
	All venues
</a>

<div class="mb-8 flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-start sm:justify-between">
	<div>
		{#if venue.isFeatured}
			<p class="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Featured</p>
		{/if}
		<h2 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{venue.name}</h2>
		<p class="mt-2 flex items-center gap-2 text-sm text-muted">
			<MapPin class="size-4" />
			{venue.district}
			{#if maps}
				<a href={maps} class="underline decoration-line underline-offset-4 hover:text-ink" target="_blank" rel="noreferrer">
					Map
				</a>
			{/if}
		</p>
	</div>
	<div class="text-left sm:text-right">
		<StatusBadge status={venue.open ? 'open' : 'closed'} alert={venue.alerts.length > 0} />
		<p class="mt-2 text-sm tabular-nums text-muted">
			<Clock class="mr-1 inline size-3.5 align-[-2px]" />
			{hoursLabel(venue.openingHours)}
			{#if venue.openLate}
				<span class="text-ink"> · Open till late</span>
			{/if}
		</p>
	</div>
</div>

{#if (venue.images ?? []).length > 0}
	<section class="mb-8">
		<div class="grid gap-2 {(venue.images ?? []).length === 1 ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}">
			{#each venue.images ?? [] as image, index (image.id)}
				<img
					src={image.url}
					alt="{venue.name} photo {index + 1}"
					class="h-56 w-full border border-line object-cover {index === 0 && venue.images.length !== 1
						? 'sm:col-span-2 lg:col-span-2 lg:h-72'
						: ''}"
				/>
			{/each}
		</div>
	</section>
{/if}

{#if pin}
	<section class="mb-8">
		<div class="mb-3 flex items-end justify-between gap-4">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Map</h3>
			{#if maps}
				<a href={maps} class="text-xs underline decoration-line underline-offset-4 hover:text-ink" target="_blank" rel="noreferrer">
					Open in Google Maps
				</a>
			{/if}
		</div>
		<MapEmbed {venue} />
	</section>
{/if}

{#if venue.alerts.length > 0}
	<section class="mb-8 space-y-2">
		{#each venue.alerts as alert (alert.id)}
			<article class="border border-accent bg-paper px-4 py-3">
				<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{alert.type}</p>
				<h3 class="mt-1 text-sm font-medium">{alert.title}</h3>
				<p class="mt-1 text-sm leading-6 text-muted">{alert.body}</p>
			</article>
		{/each}
	</section>
{/if}

{#if venue.ongoingSpecials.length > 0 || venue.upcomingSpecials.length > 0}
	<section class="mb-8">
		<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Specials</h3>
		<ul class="mt-3 space-y-2">
			{#each venue.ongoingSpecials as special (special.id)}
				<li class="border border-accent px-4 py-3">
					<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">On now</p>
					<h4 class="mt-1 text-sm font-medium">{special.title}</h4>
					<p class="mt-1 text-sm leading-6 text-muted">{special.body}</p>
					<p class="mt-2 text-xs tabular-nums text-muted">{formatSpecialWhen(special)}</p>
				</li>
			{/each}
			{#each venue.upcomingSpecials as special (special.id)}
				<li class="border border-line px-4 py-3">
					<p class="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Upcoming</p>
					<h4 class="mt-1 text-sm font-medium">{special.title}</h4>
					<p class="mt-1 text-sm leading-6 text-muted">{special.body}</p>
					<p class="mt-2 text-xs tabular-nums text-muted">{formatSpecialWhen(special)}</p>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<div class="grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
	<section>
		<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Menu</h3>
		{#if venue.menu.length === 0}
			<p class="mt-4 text-sm text-muted">No menu listed yet.</p>
		{:else}
			<div class="mt-4 space-y-8">
				{#each venue.menu as category (category.category)}
					<div>
						<h4 class="text-base font-medium">{category.category}</h4>
						<ul class="mt-3 divide-y divide-line border-y border-line">
							{#each category.items as item (item.name)}
								<li class="flex items-baseline justify-between gap-4 py-3">
									<div>
										<p class="text-sm">{item.name}</p>
										{#if item.description}
											<p class="mt-0.5 text-xs leading-5 text-muted">{item.description}</p>
										{/if}
										{#if item.tags?.length}
											<p class="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
												{item.tags.join(' · ')}
											</p>
										{/if}
									</div>
									<p class="shrink-0 font-mono text-sm">{mur(item.price_mur)}</p>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<aside class="space-y-8">
		<section>
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Work setup</h3>
			<ul class="mt-4 space-y-3 text-sm">
				<li class="flex items-start gap-2">
					<Wifi class="mt-0.5 size-4 text-muted" />
					<span>{wifiLabel(venue.workInfo) ?? 'No WiFi listed'}</span>
				</li>
				<li class="flex items-start gap-2">
					<Plug class="mt-0.5 size-4 text-muted" />
					<span>{outletLabel(venue.workInfo.outlet_access, venue.workInfo.outlets) ?? 'Outlets unknown'}</span>
				</li>
				<li class="flex items-start gap-2">
					<Volume2 class="mt-0.5 size-4 text-muted" />
					<span>{noiseLabel(venue.workInfo.noise_level) ?? 'Noise not listed'}</span>
				</li>
			</ul>
			<p class="mt-3 text-sm leading-6 text-muted">
				{venue.workFriendly
					? 'Work friendly — WiFi, outlets, and laptop seating.'
					: 'Not work friendly — not set up for a full work session.'}
				{venue.workInfo.notes ?? ''}
			</p>
		</section>

		<section>
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Hours</h3>
			<ul class="mt-4 divide-y divide-line border-y border-line text-sm">
				{#each orderedWeekdays() as day (day)}
					{@const slot = venue.openingHours[day]}
					<li class="flex items-center justify-between py-2">
						<span class="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
							{weekdayLabel(day)}
						</span>
						<span>
							{#if !slot || slot.closed}
								Closed
							{:else}
								{dayHoursLabel(slot)}
							{/if}
						</span>
					</li>
				{/each}
			</ul>
		</section>

		<section>
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Contact</h3>
			<ul class="mt-4 space-y-3 text-sm">
				{#if venue.contact.phone}
					<li>
						<a href="tel:{venue.contact.phone}" class="inline-flex items-center gap-2 hover:underline">
							<Phone class="size-4 text-muted" />
							{venue.contact.phone}
						</a>
					</li>
				{/if}
				{#if venue.contact.instagram}
					<li>
						<a
							href="https://instagram.com/{venue.contact.instagram}"
							class="inline-flex items-center gap-2 hover:underline"
							target="_blank"
							rel="noreferrer"
						>
							<AtSign class="size-4 text-muted" />
							@{venue.contact.instagram}
						</a>
					</li>
				{/if}
				{#if venue.contact.website}
					<li>
						<a
							href={venue.contact.website}
							class="inline-flex items-center gap-2 hover:underline"
							target="_blank"
							rel="noreferrer"
						>
							<Globe class="size-4 text-muted" />
							Website
						</a>
					</li>
				{/if}
				{#if venue.contact.email}
					<li>
						<a href="mailto:{venue.contact.email}" class="inline-flex items-center gap-2 hover:underline">
							<Mail class="size-4 text-muted" />
							{venue.contact.email}
						</a>
					</li>
				{/if}
				{#if maps}
					<li>
						<a href={maps} class="inline-flex items-center gap-2 hover:underline" target="_blank" rel="noreferrer">
							<MapPin class="size-4 text-muted" />
							Google Maps
						</a>
					</li>
				{/if}
			</ul>
		</section>
	</aside>
</div>
