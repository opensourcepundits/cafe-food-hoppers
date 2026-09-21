<script lang="ts">
	let { data, form } = $props();
	let hideToast = $state(false);
</script>

<svelte:head>
	<title>Users — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.created && !hideToast}
	<div class="fixed right-4 bottom-4 z-30 border border-ink bg-paper px-4 py-3 text-sm shadow-[4px_4px_0_0_var(--color-ink)]">
		User created.
		<button type="button" class="ml-3 text-muted hover:text-ink" onclick={() => (hideToast = true)}>Close</button>
	</div>
{/if}

<section class="mb-10 max-w-xl">
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">New editor</h3>
	<p class="mt-2 text-sm text-muted">
		They can sign in with any of the emails and only edit the assigned place. They cannot add or delete places.
	</p>
	<form method="POST" action="?/create" class="mt-4 space-y-4">
		{#if form?.error}
			<p class="border border-accent px-3 py-2 text-sm text-accent">{form.error}</p>
		{/if}
		<label class="block text-sm">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Email(s)</span>
			<textarea
				name="emails"
				rows="3"
				required
				value={form?.emails ?? ''}
				placeholder="one@place.mu, two@place.mu"
				class="w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
			></textarea>
		</label>
		<label class="block text-sm">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Password</span>
			<input
				name="password"
				type="password"
				required
				minlength="8"
				class="w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
			/>
		</label>
		<label class="block text-sm">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Assigned place</span>
			<select
				name="venueId"
				required
				value={form?.venueId ?? ''}
				class="w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
			>
				<option value="">Select a place</option>
				{#each data.venues as venue (venue.id)}
					<option value={venue.id}>{venue.name}</option>
				{/each}
			</select>
		</label>
		<button type="submit" class="border border-ink bg-ink px-4 py-2 text-sm text-paper">Create user</button>
	</form>
</section>

<section>
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Accounts</h3>
	{#if data.staff.length === 0}
		<p class="mt-4 text-sm text-muted">No users yet.</p>
	{:else}
		<div class="mt-4 overflow-x-auto border border-line">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-line bg-paper-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
					<tr>
						<th class="px-4 py-3 font-medium">Email</th>
						<th class="px-4 py-3 font-medium">Aliases</th>
						<th class="px-4 py-3 font-medium">Role</th>
						<th class="px-4 py-3 font-medium">Place</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each data.staff as person (person.id)}
						<tr>
							<td class="px-4 py-3">{person.email}</td>
							<td class="px-4 py-3 text-muted">{person.emails.join(', ') || '—'}</td>
							<td class="px-4 py-3 font-mono text-[11px] uppercase">{person.role}</td>
							<td class="px-4 py-3 text-muted">{person.venueName ?? 'All'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
