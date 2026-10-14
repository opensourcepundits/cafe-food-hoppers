<script lang="ts">
	import { untrack } from 'svelte';
	import { formatMauritiusWhen, isoToDatetimeLocal } from '$lib/venue';

	let { data, form } = $props();
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';
	let venueId = $state(untrack(() => form?.venueId ?? data.selectedId ?? ''));
	let indefinite = $state(false);
	let indefiniteFor = $state('');

	const current = $derived(data.closures.find((item) => item.venueId === venueId) ?? null);
	const preset = $derived(form?.venueId === venueId ? form : null);

	$effect(() => {
		const id = venueId;
		if (indefiniteFor === id) return;
		indefiniteFor = id;
		const failed = form?.venueId === id ? form : null;
		const closed = data.closures.find((item) => item.venueId === id) ?? null;
		indefinite = failed ? failed.indefinite === '1' : Boolean(closed && !closed.endsAt);
	});
</script>

<svelte:head>
	<title>Temporary closure — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mb-10 max-w-xl">
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Temporary closure</h3>
	<p class="mt-3 text-sm leading-6 text-muted">
		Close a place immediately. Set when it is expected to open again, or leave it closed indefinitely. Times are Indian/Mauritius.
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
		<p class="mt-3 text-sm">
			{#if data.indefinite}
				The place stays closed until you reopen it.
			{:else}
				Reopen time updated. The place stays closed until then.
			{/if}
		</p>
	{/if}
	{#if data.reopened}
		<p class="mt-3 text-sm">
			{#if data.notice === 'sent'}
				Place marked open again. A notification was sent to anyone who saved this place.
			{:else if data.notice === 'quiet'}
				Place marked open again. Nobody who saved this place has notifications on.
			{:else if data.notice === 'failed'}
				Place marked open again, but the notification could not be sent.
			{:else}
				Place marked open again. Regular hours apply.
			{/if}
		</p>
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
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" name="indefinite" value="1" bind:checked={indefinite} />
					Indefinite
				</label>
				<label class="block" class:opacity-50={indefinite}>
					<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
						Expected to open again
					</span>
					<input
						class={field}
						type="datetime-local"
						name="reopens"
						required={!indefinite}
						disabled={indefinite}
						value={preset?.reopens ?? isoToDatetimeLocal(current?.endsAt)}
					/>
				</label>
				<label class="block">
					<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Reason</span>
					<textarea class="{field} min-h-24" name="note" maxlength="400" placeholder="Why is this place closed?"
						>{preset?.note ?? current?.note ?? ''}</textarea
					>
				</label>
				<p class="text-sm text-muted">
					{#if indefinite}
						The place stays closed until you reopen it. The reason is shown on the place and on saved profiles.
					{:else if current}
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
								Closed indefinitely
							{/if}
						</p>
						{#if closure.note}
							<p class="mt-2 max-w-xl text-sm">{closure.note}</p>
						{/if}
					</div>
					<form method="POST" action="?/reopen" class="grid w-full gap-2 sm:max-w-xs">
						<input type="hidden" name="venueId" value={closure.venueId} />
						<input type="hidden" name="closureId" value={closure.id} />
						<label class="block">
							<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Message</span>
							<textarea
								class="{field} min-h-20"
								name="message"
								maxlength="140"
								placeholder="We're open again"
							></textarea>
						</label>
						<p class="text-sm text-muted">Sent to people who saved this place. Leave it blank for a short default.</p>
						<button
							type="submit"
							class="w-fit border border-ink bg-ink px-3 py-1.5 text-sm text-paper"
						>
							Reopen now
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>
