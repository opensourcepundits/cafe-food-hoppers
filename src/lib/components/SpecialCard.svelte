<script lang="ts">
	import { formatMauritiusWhen, type AlertFeedItem } from '$lib/venue';

	let { item }: { item: AlertFeedItem } = $props();
</script>

<a
	href="/venues/{item.venueSlug}"
	class="block border bg-paper p-4 transition-colors hover:border-ink hover:bg-paper-2 {item.saved
		? 'border-ink'
		: 'border-line'}"
>
	<p class="font-mono text-[10px] uppercase tracking-[0.18em]">
		<span class:text-accent={item.status === 'ongoing'} class:text-muted={item.status === 'upcoming'}>
			{item.status === 'ongoing' ? 'On now' : 'Upcoming'}
			· {item.alert.type}
		</span>
		{#if item.saved}
			<span class="text-ink"> · Saved</span>
		{/if}
	</p>
	<h3 class="mt-1 text-lg font-medium tracking-tight">{item.alert.title}</h3>
	<p class="mt-1 text-sm text-muted">{item.venueName} · {item.district}</p>
	{#if item.alert.body}
		<p class="mt-3 text-sm leading-6">{item.alert.body}</p>
	{/if}
	<p class="mt-3 text-xs tabular-nums text-muted">
		{formatMauritiusWhen(item.alert.starts_at)}
		{#if item.alert.ends_at}
			– {formatMauritiusWhen(item.alert.ends_at)}
		{/if}
	</p>
</a>
