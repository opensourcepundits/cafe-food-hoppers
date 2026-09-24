<script lang="ts">
	import AccountAccess from '$lib/components/admin/AccountAccess.svelte';

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
		A shop account can monitor and edit every placement you assign. A placement account can change only its one place.
		Standard accounts still start with no access until you grant creator or editor.
	</p>
	{#if data.loadError}
		<p class="mt-4 border border-accent px-3 py-2 text-sm text-accent">{data.loadError}</p>
	{/if}
	<p class="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
		{data.accounts.length} {data.accounts.length === 1 ? 'account' : 'accounts'}
	</p>
	{#if data.accounts.length === 0}
		<p class="mt-4 text-sm text-muted">No registered accounts yet.</p>
	{:else}
		<ul class="mt-4 space-y-4">
			{#each data.accounts as person (person.id)}
				<AccountAccess
					{person}
					places={data.places}
					error={form?.error && form.userId === person.id ? form.error : ''}
				/>
			{/each}
		</ul>
	{/if}
</section>
