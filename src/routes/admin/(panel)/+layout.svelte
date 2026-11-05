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
	const roleLabel = $derived(
		role === 'place_manager'
			? 'Place manager'
			: role === 'franchise_manager'
				? 'Franchise manager'
				: role === 'superuser'
					? 'Superuser'
					: 'User'
	);
	const placesLabel = $derived(role === 'place_manager' ? 'Your place' : role === 'superuser' ? 'Places' : 'Your places');
	const placesActive = $derived(
		path === '/admin' || (path.startsWith('/admin/venues/') && !path.startsWith('/admin/venues/new'))
	);
	const section = $derived(
		path.startsWith('/admin/users')
			? 'Users'
			: path.startsWith('/admin/status')
				? 'Status'
				: path.startsWith('/admin/alerts')
					? 'Alerts'
					: path.startsWith('/admin/closure')
						? 'Closure'
						: path.startsWith('/admin/venues/new')
							? 'New place'
							: path.startsWith('/admin/venues/')
								? 'Edit'
								: placesLabel
	);
</script>

<div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
	<div>
		<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Admin · {roleLabel}</p>
		<h2 class="mt-1 text-2xl font-semibold tracking-tight">{section}</h2>
	</div>
	<div class="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
		<a
			href="/admin"
			class="border-b pb-0.5 {placesActive
				? 'border-ink text-ink'
				: 'border-transparent text-muted hover:text-ink'}"
		>
			{placesLabel}
		</a>
		{#if canCreate}
			<a
				href="/admin/venues/new"
				class="border-b pb-0.5 {path.startsWith('/admin/venues/new')
					? 'border-ink text-ink'
					: 'border-transparent text-muted hover:text-ink'}"
			>
				New
			</a>
		{/if}
		{#if canManage}
			<a
				href="/admin/alerts"
				class="border-b pb-0.5 {path.startsWith('/admin/alerts')
					? 'border-ink text-ink'
					: 'border-transparent text-muted hover:text-ink'}"
			>
				Alerts
			</a>
		{/if}
		{#if canReportClosure}
			<a
				href="/admin/closure"
				class="border-b pb-0.5 {path.startsWith('/admin/closure')
					? 'border-ink text-ink'
					: 'border-transparent text-muted hover:text-ink'}"
			>
				Closure
			</a>
		{/if}
		{#if isSuperuser}
			<a
				href="/admin/status"
				class="border-b pb-0.5 {path.startsWith('/admin/status')
					? 'border-ink text-ink'
					: 'border-transparent text-muted hover:text-ink'}"
			>
				Status
			</a>
			<a
				href="/admin/users"
				class="border-b pb-0.5 {path.startsWith('/admin/users')
					? 'border-ink text-ink'
					: 'border-transparent text-muted hover:text-ink'}"
			>
				Users
			</a>
		{/if}
		{#if email}
			<span class="normal-case tracking-normal text-muted">{email}</span>
		{/if}
		<form method="POST" action="/admin?/logout">
			<button type="submit" class="text-muted hover:text-ink">Sign out</button>
		</form>
	</div>
</div>

{@render children()}
