<script lang="ts">
	import { formatMauritiusWhen } from '$lib/venue';

	let { data, form } = $props();
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';

	const groups = $derived([
		{ key: 'ongoing', label: 'Ongoing', items: data.ongoing, empty: 'Nothing is running.' },
		{ key: 'upcoming', label: 'Upcoming', items: data.upcoming, empty: 'Nothing is scheduled.' },
		{ key: 'done', label: 'Done', items: data.done, empty: 'No finished alerts.' }
	]);
</script>

<svelte:head>
	<title>Alerts — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mb-10">
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">New alert</h3>
	{#if form?.error}
		<p class="mt-3 text-sm text-accent">{form.error}</p>
	{/if}
	{#if data.created}
		<p class="mt-3 text-sm">Alert saved.</p>
	{/if}
	{#if data.cancelled}
		<p class="mt-3 text-sm">Alert cancelled.</p>
	{/if}
	{#if data.places.length === 0}
		<p class="mt-3 max-w-lg text-sm text-muted">Add a place, or get one assigned, before posting an alert.</p>
	{:else}
		<form method="POST" action="?/create" class="mt-4 grid max-w-xl gap-3">
			<label class="block">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Place</span>
				<select class={field} name="venueId" required>
					{#each data.places as place (place.id)}
						<option value={place.id}>{place.name}</option>
					{/each}
				</select>
			</label>
			<label class="block">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Type</span>
				<select class={field} name="type">
					<option value="notice">Notice</option>
					<option value="event">Event</option>
					<option value="closure">Closure</option>
					<option value="alert">Alert</option>
				</select>
			</label>
			<label class="block">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Title</span>
				<input class={field} name="title" required />
			</label>
			<label class="block">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Details</span>
				<textarea class="{field} min-h-24" name="body" required></textarea>
			</label>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="block">
					<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Starts</span>
					<input class={field} type="datetime-local" name="starts" required />
				</label>
				<label class="block">
					<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Ends</span>
					<input class={field} type="datetime-local" name="ends" />
				</label>
			</div>
			<p class="text-sm text-muted">An event also notifies people who saved the place when it is about to start.</p>
			<button type="submit" class="w-fit border border-ink bg-ink px-4 py-2 text-sm text-paper">Create alert</button>
		</form>
	{/if}
</section>

{#each groups as group (group.key)}
	<section class="mb-10">
		<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
			{group.label} · {group.items.length}
		</h3>
		{#if group.items.length === 0}
			<p class="mt-3 text-sm text-muted">{group.empty}</p>
		{:else}
			<ul class="mt-3 divide-y divide-line border-y border-line">
				{#each group.items as alert (alert.venueId + alert.id)}
					<li class="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<p class="font-medium">{alert.title}</p>
							<p class="mt-1 text-sm text-muted">{alert.venueName}</p>
							<p class="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{alert.type}</p>
							<p class="mt-2 max-w-xl text-sm">{alert.body}</p>
							<p class="mt-2 text-sm text-muted">
								{formatMauritiusWhen(alert.starts_at)}
								{#if alert.ends_at}
									– {formatMauritiusWhen(alert.ends_at)}
								{/if}
							</p>
						</div>
						{#if alert.status !== 'done'}
							<form method="POST" action="?/cancel">
								<input type="hidden" name="venueId" value={alert.venueId} />
								<input type="hidden" name="alertId" value={alert.id} />
								<button
									type="submit"
									class="border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:border-ink hover:text-ink"
								>
									Cancel
								</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/each}
