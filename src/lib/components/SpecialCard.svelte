<script lang="ts">
	import { formatSpecialWhen, type SpecialFeedItem } from '$lib/venue';

	let { item }: { item: SpecialFeedItem } = $props();
</script>

<a
	href="/venues/{item.venueSlug}"
	class="block border border-line bg-paper p-4 transition-colors hover:border-ink hover:bg-paper-2"
>
	<p
		class="font-mono text-[10px] uppercase tracking-[0.18em]"
		class:text-accent={item.status === 'ongoing'}
		class:text-muted={item.status === 'upcoming'}
	>
		{item.status === 'ongoing' ? 'On now' : 'Upcoming'}
	</p>
	<h3 class="mt-1 text-lg font-medium tracking-tight">{item.special.title}</h3>
	<p class="mt-1 text-sm text-muted">{item.venueName} · {item.district}</p>
	<p class="mt-3 text-sm leading-6">{item.special.body}</p>
	<p class="mt-3 text-xs tabular-nums text-muted">{formatSpecialWhen(item.special)}</p>
</a>
