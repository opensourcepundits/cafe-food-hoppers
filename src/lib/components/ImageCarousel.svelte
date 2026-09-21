<script lang="ts">
	import type { VenueImage } from '$lib/venue';

	let {
		images,
		alt = 'Photo',
		onremove
	}: {
		images: VenueImage[];
		alt?: string;
		onremove?: (id: string) => void;
	} = $props();

	let index = $state(0);
	let expanded = $state(false);

	const current = $derived(images[index] ?? images[0]);
	const count = $derived(images.length);

	$effect(() => {
		if (index > count - 1) index = Math.max(0, count - 1);
	});

	function prev() {
		if (!count) return;
		index = (index - 1 + count) % count;
	}

	function next() {
		if (!count) return;
		index = (index + 1) % count;
	}

	function keydown(event: KeyboardEvent) {
		if (!expanded) return;
		if (event.key === 'Escape') expanded = false;
		if (event.key === 'ArrowLeft') prev();
		if (event.key === 'ArrowRight') next();
	}
</script>

<svelte:window onkeydown={keydown} />

{#if count > 0 && current}
	<div class="relative border border-line bg-paper-2">
		<button type="button" class="block w-full" onclick={() => (expanded = true)} aria-label="Expand photo">
			<img src={current.url} alt="{alt} {index + 1}" class="h-64 w-full object-cover lg:h-80" />
		</button>
		{#if count > 1}
			<button
				type="button"
				class="absolute top-1/2 left-2 -translate-y-1/2 border border-ink bg-paper px-2 py-1 text-sm"
				onclick={prev}
				aria-label="Previous photo">‹</button
			>
			<button
				type="button"
				class="absolute top-1/2 right-2 -translate-y-1/2 border border-ink bg-paper px-2 py-1 text-sm"
				onclick={next}
				aria-label="Next photo">›</button
			>
			<p class="absolute bottom-2 left-1/2 -translate-x-1/2 border border-ink bg-paper px-2 py-0.5 font-mono text-[10px]">
				{index + 1} / {count}
			</p>
		{/if}
		{#if onremove}
			<button
				type="button"
				class="absolute top-2 right-2 border border-ink bg-paper px-2 py-0.5 text-[10px] uppercase"
				onclick={() => onremove(current.id)}>Remove</button
			>
		{/if}
	</div>
	{#if count > 1}
		<ul class="mt-2 flex gap-2 overflow-x-auto">
			{#each images as image, i (image.id)}
				<li>
					<button
						type="button"
						class="block size-14 border {i === index ? 'border-ink' : 'border-line'}"
						onclick={() => (index = i)}
					>
						<img src={image.url} alt="" class="size-full object-cover" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

{#if expanded && current}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4" role="presentation">
		<button type="button" class="absolute inset-0 cursor-default" aria-label="Close photo" onclick={() => (expanded = false)}
		></button>
		<div class="relative z-10 max-h-full max-w-5xl">
			<img src={current.url} alt="{alt} {index + 1}" class="max-h-[85vh] w-full object-contain" />
			{#if count > 1}
				<button
					type="button"
					class="absolute top-1/2 left-2 -translate-y-1/2 border border-paper bg-ink px-2 py-1 text-paper"
					onclick={prev}>‹</button
				>
				<button
					type="button"
					class="absolute top-1/2 right-2 -translate-y-1/2 border border-paper bg-ink px-2 py-1 text-paper"
					onclick={next}>›</button
				>
			{/if}
			<button
				type="button"
				class="absolute top-2 right-2 border border-paper bg-ink px-2 py-1 text-xs text-paper"
				onclick={() => (expanded = false)}>Close</button
			>
		</div>
	</div>
{/if}
