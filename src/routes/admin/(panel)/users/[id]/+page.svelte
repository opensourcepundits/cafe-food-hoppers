<script lang="ts">
	import { page } from '$app/state';
	import { formatMauritiusWhen } from '$lib/venue';

	let { data, form } = $props();
	let role = $state(data.account.role === 'superuser' ? 'user' : data.account.role);
	const saved = $derived(page.url.searchParams.get('saved') === '1');
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';
</script>

<svelte:head>
	<title>{data.account.name} — Users</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a href="/admin/users" class="text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink">
	All users
</a>

<section class="mt-6">
	<p class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Account</p>
	<h3 class="mt-2 text-3xl font-semibold tracking-tight">{data.account.name}</h3>
	<p class="mt-2 text-sm text-muted">{data.account.email}</p>
	{#if data.account.phone}
		<p class="text-sm text-muted">{data.account.phone}</p>
	{/if}
</section>

{#if data.account.role === 'superuser'}
	<p class="mt-8 max-w-md border border-line px-4 py-3 text-sm">
		Superuser. This account is seeded and is not changed here.
	</p>
{:else}
	<form method="POST" action="?/role" class="mt-8 max-w-lg border border-line p-4">
		<label class="block text-sm">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Role</span>
			<select class={field} name="role" bind:value={role}>
				{#each data.roles as item (item.id)}
					<option value={item.id}>{item.label}</option>
				{/each}
			</select>
		</label>

		{#if role === 'place_manager'}
			<label class="mt-4 block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Their place</span>
				<select class={field} name="venueId">
					<option value="">Choose a place</option>
					{#each data.places as place (place.id)}
						<option value={place.id} selected={place.id === data.account.venueId}>
							{place.name} · {place.district}
						</option>
					{/each}
				</select>
			</label>
			<p class="mt-2 text-xs text-muted">One place. If it is not in a franchise yet, saving creates one for it.</p>
		{/if}

		{#if role === 'franchise_manager'}
			<label class="mt-4 block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Franchise</span>
				<select class={field} name="franchiseId">
					<option value="">Choose a franchise</option>
					{#each data.franchises as group (group.id)}
						<option value={group.id} selected={group.id === data.account.franchiseId}>{group.name}</option>
					{/each}
					<option value="new">New franchise…</option>
				</select>
			</label>
			<label class="mt-4 block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">New franchise name</span>
				<input class={field} name="franchiseName" placeholder="Only if you chose New franchise" />
			</label>
			<fieldset class="mt-4">
				<legend class="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Places in a new franchise</legend>
				<div class="mt-2 grid gap-2 text-sm sm:grid-cols-2">
					{#each data.places as place (place.id)}
						<label class="flex items-start gap-2">
							<input type="checkbox" name="venueIds" value={place.id} />
							<span>{place.name} <span class="text-muted">· {place.district}</span></span>
						</label>
					{/each}
				</div>
			</fieldset>
			<p class="mt-2 text-xs text-muted">They can see and edit every place in the franchise.</p>
		{/if}

		<button type="submit" class="mt-4 border border-ink bg-ink px-4 py-2 text-sm text-paper">Update role</button>
		{#if form?.error}
			<p class="mt-3 border border-accent px-3 py-2 text-sm text-accent">{form.error}</p>
		{/if}
		{#if saved && !form?.error}
			<p class="mt-3 text-sm text-open">Role updated.</p>
		{/if}
	</form>
{/if}

<section class="mt-10">
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
		Comments · {data.comments.length}
	</h3>
	{#if data.comments.length === 0}
		<p class="mt-3 text-sm text-muted">No comments.</p>
	{:else}
		<ul class="mt-3 divide-y divide-line border-y border-line">
			{#each data.comments as comment (comment.id)}
				<li class="py-4">
					<a href="/venues/{comment.venueSlug}#comments" class="text-sm font-medium underline decoration-line underline-offset-4">
						{comment.venueName}
					</a>
					<p class="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
						{formatMauritiusWhen(comment.createdAt)}
					</p>
					<p class="mt-2 text-sm leading-6">{comment.body}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
