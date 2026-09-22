<script lang="ts">
	let { data, form } = $props();
	let hideToast = $state(false);
</script>

<svelte:head>
	<title>Users — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.saved && !hideToast}
	<div class="fixed right-4 bottom-4 z-30 border border-ink bg-paper px-4 py-3 text-sm shadow-[4px_4px_0_0_var(--color-ink)]">
		Access updated.
		<button type="button" class="ml-3 text-muted hover:text-ink" onclick={() => (hideToast = true)}>Close</button>
	</div>
{/if}

<section>
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Accounts</h3>
	<p class="mt-2 max-w-xl text-sm text-muted">
		Registered users start with no create or edit access. Grant creator access to add places, and editor access to change places they created. Times are Indian/Mauritius.
	</p>
	<p class="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
		{data.accounts.length} {data.accounts.length === 1 ? 'account' : 'accounts'}
	</p>
	{#if data.accounts.length === 0}
		<p class="mt-4 text-sm text-muted">No registered accounts yet.</p>
	{:else}
		<ul class="mt-4 space-y-4">
			{#each data.accounts as person (person.id)}
				<li class="border border-line">
					<form method="POST" action="?/access" class="border-b border-line px-4 py-4">
						<input type="hidden" name="userId" value={person.id} />
						<div class="flex flex-wrap items-start justify-between gap-4">
							<div>
								<p class="font-medium">{person.email}</p>
								<p class="mt-1 text-sm text-muted">{person.phone ?? 'No phone'}</p>
								<p class="mt-1 font-mono text-[11px] text-muted">
									Joined {person.joinedAt}
									· Last sign-in {person.lastSeenAt ?? '—'}
								</p>
							</div>
							<div class="flex flex-wrap items-center gap-4 text-sm">
								<label class="flex items-center gap-2">
									<input type="checkbox" name="canCreate" value="1" checked={person.canCreate} />
									Creator
								</label>
								<label class="flex items-center gap-2">
									<input type="checkbox" name="canEdit" value="1" checked={person.canEdit} />
									Editor
								</label>
								<button type="submit" class="border border-ink bg-ink px-3 py-1.5 text-sm text-paper">
									Save access
								</button>
							</div>
						</div>
						{#if form?.error && form.userId === person.id}
							<p class="mt-3 border border-accent px-3 py-2 text-sm text-accent">{form.error}</p>
						{/if}
					</form>
					<div class="px-4 py-3">
						<p class="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
							Places created · {person.places.length}
						</p>
						{#if person.places.length === 0}
							<p class="mt-2 text-sm text-muted">No places yet.</p>
						{:else}
							<ul class="mt-2 divide-y divide-line border-y border-line text-sm">
								{#each person.places as place (place.id)}
									<li class="flex items-baseline justify-between gap-3 py-2">
										<a href="/admin/venues/{place.id}" class="underline decoration-line underline-offset-4 hover:text-ink">
											{place.name}
										</a>
										<span class="text-muted">{place.district}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
