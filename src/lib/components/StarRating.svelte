<script lang="ts">
	import { ratingLabel, ratingStars } from '$lib/venue';

	let {
		average,
		count
	}: {
		average: number | null;
		count: number;
	} = $props();

	const filled = $derived(ratingStars(average));
	const label = $derived(ratingLabel(average, count));
</script>

<p class="flex flex-wrap items-center gap-2 text-sm">
	<span class="tracking-[0.12em]" aria-hidden="true">
		{#each [1, 2, 3, 4, 5] as star (star)}
			<span class={star <= filled ? 'text-accent' : 'text-line'}>★</span>
		{/each}
	</span>
	<span class="text-muted">{label}</span>
</p>
