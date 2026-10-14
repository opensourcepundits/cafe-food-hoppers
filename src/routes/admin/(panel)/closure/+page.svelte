<script lang="ts">
	import { untrack } from 'svelte';
	import { formatMauritiusWhen, isoToDatetimeLocal } from '$lib/venue';

	let { data, form } = $props();
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';
	let venueId = $state(untrack(() => form?.venueId || data.selectedId));

	const current = $derived(data.closures.find((item) => item.venueId === venueId) ?? null);
	const preset = $derived(form?.venueId === venueId ? form : null);
</script>

<svelte:head>
	<title>Temporary closure — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mb-10 max-w-xl">
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Temporary closure</h3>
	<p class="mt-3 text-sm leading-6 text-muted">
		Close a place immediately, and set when it is expected to open again. Regular hours apply after that time. Times are Indian/Mauritius.
	</p>
	{#if form?.error}
		<p class="mt-3 text-sm text-accent">{form.error}</p>
	{/if}
	{#if data.closed}
		<p class="mt-3 text-sm">
			{#if data.notice === 'sent'}
				Place closed. A notification was sent to your devices and to anyone who saved this place.
			{:else if data.notice === 'quiet'}
				Place closed. This account has no device with notifications on, and nobody who saved the place does either.
			{:else if data.notice === 'failed'}
				Place closed, but the notification could not be sent.
			{:else}
				Place closed.
			{/if}
		</p>
	{/if}
	{#if data.updated}
		<p class="mt-3 text-sm">Reopen time updated. The place stays closed until then.</p>
	{/if}
	{#if data.reopened}
		<p class="mt-3 text-sm">Place marked open again. Regular hours apply.</p>
	{/if}
	{#if data.places.length === 0}
		<p class="mt-3 text-sm text-muted">No places are assigned to this account.</p>
	{:else}
		<label class="mt-4 block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Place</span>
			<select class={field} name="venueId" bind:value={venueId}>
				{#each data.places as place (place.id)}
					<option value={place.id}>{place.name}</option>
				{/each}
			</select>
		</label>
		{#key venueId}
			<form method="POST" action="?/close" class="mt-3 grid gap-3">
				<input type="hidden" name="venueId" value={venueId} />
				<label class="block">
					<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
						Expected to open again
					</span>
					<input
						class={field}
						type="datetime-local"
						name="reopens"
						required
						value={preset?.reopens ?? isoToDatetimeLocal(current?.endsAt)}
					/>
				</label>
				<label class="block">
					<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Note</span>
					<textarea class="{field} min-h-24" name="note" maxlength="400">{preset?.note ?? current?.note ?? ''}</textarea>
				</label>
				<p class="text-sm text-muted">
					{#if current}
						This place is already temporarily closed. Saving changes the expected reopen time.
					{:else}
						Saving closes the place now. People who saved it are notified the first time you report the closure.
					{/if}
				</p>
				<button type="submit" class="w-fit border border-ink bg-ink px-4 py-2 text-sm text-paper">
					{current ? 'Update closure' : 'Close now'}
				</button>
			</form>
		{/key}
	{/if}
</section>

<section>
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
		Closed now · {data.closures.length}
	</h3>
	{#if data.closures.length === 0}
		<p class="mt-3 text-sm text-muted">No places are temporarily closed.</p>
	{:else}
		<ul class="mt-3 divide-y divide-line border-y border-line">
			{#each data.closures as closure (closure.id)}
				<li class="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p class="font-medium">{closure.venueName}</p>
						<p class="mt-1 text-sm text-muted">
							{#if closure.endsAt}
								Expected open {formatMauritiusWhen(closure.endsAt)}
							{:else}
								Temporarily closed, with no reopen time
							{/if}
						</p>
						{#if closure.note}
							<p class="mt-2 max-w-xl text-sm">{closure.note}</p>
						{/if}
					</div>
					<form method="POST" action="?/reopen">
						<input type="hidden" name="venueId" value={closure.venueId} />
						<input type="hidden" name="closureId" value={closure.id} />
						<button
							type="submit"
							class="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:border-ink hover:text-ink"
						>
							Reopen now
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>
