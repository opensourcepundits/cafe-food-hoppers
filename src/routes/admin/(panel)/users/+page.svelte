<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Users — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section>
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Users</h3>
	<p class="mt-2 text-sm text-muted">{data.accounts.length} {data.accounts.length === 1 ? 'account' : 'accounts'}</p>

	{#if data.accounts.length === 0}
		<p class="mt-6 text-sm text-muted">No accounts yet.</p>
	{:else}
		<ul class="mt-4 divide-y divide-line border-y border-line">
			{#each data.accounts as account (account.id)}
				<li>
					<a href="/admin/users/{account.id}" class="flex items-baseline justify-between gap-4 py-3 hover:bg-paper-2">
						<span>
							<span class="block font-medium">{account.name}</span>
							<span class="text-sm text-muted">{account.email}</span>
						</span>
						<span class="text-right">
							{#if account.placeName}
								<span class="block text-sm text-muted">{account.placeName}</span>
							{:else if account.franchiseName}
								<span class="block text-sm text-muted">{account.franchiseName}</span>
							{/if}
							<span class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
							{account.role === 'place_manager'
								? 'Place manager'
								: account.role === 'franchise_manager'
									? 'Franchise manager'
									: account.role === 'superuser'
										? 'Superuser'
										: 'User'}
							</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
