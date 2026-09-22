<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Users — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section>
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Place owners</h3>
	<p class="mt-2 max-w-xl text-sm text-muted">
		Accounts that registered to manage places. Times are Indian/Mauritius.
	</p>
	<p class="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
		{data.owners.length} {data.owners.length === 1 ? 'account' : 'accounts'}
	</p>
	{#if data.owners.length === 0}
		<p class="mt-4 text-sm text-muted">No place owners yet.</p>
	{:else}
		<div class="mt-4 overflow-x-auto border border-line">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-line bg-paper-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
					<tr>
						<th class="px-4 py-3 font-medium">Email</th>
						<th class="px-4 py-3 font-medium">Phone</th>
						<th class="px-4 py-3 font-medium">Joined</th>
						<th class="px-4 py-3 font-medium">Last sign-in</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each data.owners as person (person.id)}
						<tr>
							<td class="px-4 py-3">{person.email}</td>
							<td class="px-4 py-3 text-muted">{person.phone ?? '—'}</td>
							<td class="px-4 py-3 text-muted">{person.joinedAt}</td>
							<td class="px-4 py-3 text-muted">{person.lastSeenAt ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
