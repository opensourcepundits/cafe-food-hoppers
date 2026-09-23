<script lang="ts">
	let { data } = $props();
	let hideToast = $state(false);
</script>

<svelte:head>
	<title>Admin — Place</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.deleted && !hideToast}
	<div class="fixed right-4 bottom-4 z-30 border border-ink bg-paper px-4 py-3 text-sm shadow-[4px_4px_0_0_var(--color-ink)]">
		Place deleted.
		<button type="button" class="ml-3 text-muted hover:text-ink" onclick={() => (hideToast = true)}>Close</button>
	</div>
{/if}

<form method="GET" class="mb-6 flex gap-3">
	<input
		name="q"
		value={data.q}
		placeholder="Search by name or district"
		class="w-full max-w-sm border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
	/>
	<button type="submit" class="border border-ink bg-ink px-4 py-2 text-sm text-paper">Search</button>
	{#if data.q}
		<a href="/admin" class="border border-line px-4 py-2 text-sm text-muted">Clear</a>
	{/if}
</form>

<p class="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
	{data.venues.length} of {data.total} {data.total === 1 ? 'place' : 'places'}
</p>

{#if data.venues.length === 0}
	<div class="border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
		{#if data.canCreate}
			No places yet. <a href="/admin/venues/new" class="underline decoration-line underline-offset-4">Add one</a>.
		{:else if data.scoped}
			No placements are assigned to this account.
		{:else}
			This account cannot create or edit places yet.
		{/if}
	</div>
{:else}
	<div class="overflow-x-auto border border-line">
		<table class="w-full text-left text-sm">
			<thead class="border-b border-line bg-paper-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
				<tr>
					<th class="px-4 py-3 font-medium">Name</th>
					<th class="px-4 py-3 font-medium">District</th>
					<th class="px-4 py-3 font-medium">Menu</th>
					<th class="px-4 py-3 font-medium">Specials</th>
					<th class="px-4 py-3 font-medium"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each data.venues as venue (venue.id)}
					<tr>
						<td class="px-4 py-3">
							<p class="font-medium">{venue.name}</p>
							<p class="font-mono text-[11px] text-muted">/{venue.slug}</p>
						</td>
						<td class="px-4 py-3 text-muted">{venue.district}</td>
						<td class="px-4 py-3 tabular-nums text-muted">
							{venue.menu.reduce((sum, category) => sum + category.items.length, 0)}
						</td>
						<td class="px-4 py-3 tabular-nums text-muted">{venue.specials.length}</td>
						<td class="px-4 py-3 text-right">
							{#if venue.editable}
								<a
									href="/admin/venues/{venue.id}"
									class="font-mono text-[11px] uppercase tracking-[0.14em] underline decoration-line underline-offset-4"
								>
									Edit
								</a>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
