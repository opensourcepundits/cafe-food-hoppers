<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();
	const path = $derived(page.url.pathname);
	const email = $derived(page.data.user?.email);
	const role = $derived(page.data.user?.role ?? 'user');
	const canCreate = $derived(page.data.canCreate);
	const canManage = $derived(page.data.canManage);
	const canReportClosure = $derived(page.data.canReportClosure);
	const isSuperuser = $derived(page.data.isSuperuser);
	const placesLabel = $derived(role === 'place_manager' ? 'Your place' : role === 'superuser' ? 'Places' : 'Your places');
	const placesActive = $derived(
		path === '/my-places' ||
			(/^\/my-places\/[^/]+$/.test(path) &&
				path !== '/my-places/new' &&
				path !== '/my-places/alerts' &&
				path !== '/my-places/closure')
	);
</script>

<div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
	<div>
		<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">My places</p>
		<h2 class="mt-1 text-2xl font-semibold tracking-tight">
			{#if path.startsWith('/my-places/alerts')}
				Alerts
			{:else if path.startsWith('/my-places/closure')}
				Closure
			{:else if path.startsWith('/my-places/new')}
				New place
			{:else if placesActive && path !== '/my-places'}
				Edit
			{:else}
				{placesLabel}
			{/if}
		</h2>
	</div>
	<div class="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
		<a
			href="/my-places"
			class="border-b pb-0.5 {placesActive
				? 'border-ink text-ink'
				: 'border-transparent text-muted hover:text-ink'}"
		>
			{placesLabel}
		</a>
		{#if canCreate}
			<a
				href="/my-places/new"
				class="border-b pb-0.5 {path.startsWith('/my-places/new')
					? 'border-ink text-ink'
					: 'border-transparent text-muted hover:text-ink'}"
			>
				New
			</a>
		{/if}
		{#if canManage}
			<a
				href="/my-places/alerts"
				class="border-b pb-0.5 {path.startsWith('/my-places/alerts')
					? 'border-ink text-ink'
					: 'border-transparent text-muted hover:text-ink'}"
			>
				Alerts
			</a>
		{/if}
		{#if canReportClosure}
			<a
				href="/my-places/closure"
				class="border-b pb-0.5 {path.startsWith('/my-places/closure')
					? 'border-ink text-ink'
					: 'border-transparent text-muted hover:text-ink'}"
			>
				Closure
			</a>
		{/if}
		{#if isSuperuser}
			<a href="/admin/users" class="border-b border-transparent pb-0.5 text-muted hover:text-ink">Admin</a>
		{/if}
		{#if email}
			<span class="normal-case tracking-normal text-muted">{email}</span>
		{/if}
		<form method="POST" action="/logout">
			<button type="submit" class="text-muted hover:text-ink">Sign out</button>
		</form>
	</div>
</div>

{@render children()}
