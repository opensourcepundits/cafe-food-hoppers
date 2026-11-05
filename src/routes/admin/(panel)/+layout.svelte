<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();
	const path = $derived(page.url.pathname);
	const email = $derived(page.data.user?.email);
</script>

<div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
	<div>
		<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Admin</p>
		<h2 class="mt-1 text-2xl font-semibold tracking-tight">
			{path.startsWith('/admin/status') ? 'Status' : 'Users'}
		</h2>
	</div>
	<div class="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
		<a href="/my-places" class="border-b border-transparent pb-0.5 text-muted hover:text-ink">My places</a>
		<a
			href="/admin/users"
			class="border-b pb-0.5 {path.startsWith('/admin/users')
				? 'border-ink text-ink'
				: 'border-transparent text-muted hover:text-ink'}"
		>
			Users
		</a>
		<a
			href="/admin/status"
			class="border-b pb-0.5 {path.startsWith('/admin/status')
				? 'border-ink text-ink'
				: 'border-transparent text-muted hover:text-ink'}"
		>
			Status
		</a>
		{#if email}
			<span class="normal-case tracking-normal text-muted">{email}</span>
		{/if}
		<form method="POST" action="/logout">
			<button type="submit" class="text-muted hover:text-ink">Sign out</button>
		</form>
	</div>
</div>

{@render children()}
