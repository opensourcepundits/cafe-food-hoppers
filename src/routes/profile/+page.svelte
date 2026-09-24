<script lang="ts">
	import { formatMauritiusWhen } from '$lib/venue';

	let { data, form } = $props();
	let passwordOpen = $state(false);
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';
</script>

<svelte:head>
	<title>{data.name} — Place</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mb-8 flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Profile</p>
		<h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{data.name}</h2>
	</div>
	<div class="flex flex-wrap gap-2">
		{#if data.canCreate || data.user?.canEdit}
			<a href="/admin" class="border border-line px-4 py-2 text-sm text-muted hover:border-ink hover:text-ink">
				Manage places
			</a>
		{/if}
		<button
			type="button"
			class="border border-ink px-4 py-2 text-sm"
			onclick={() => (passwordOpen = !passwordOpen)}
		>
			Change password
		</button>
	</div>
</section>

{#if passwordOpen}
	<form method="POST" action="?/password" class="mb-10 max-w-md space-y-4 border border-line p-4">
		{#if form?.error}
			<p class="border border-accent px-3 py-2 text-sm text-accent">{form.error}</p>
		{/if}
		{#if form?.saved}
			<p class="border border-open px-3 py-2 text-sm text-open">Password updated.</p>
		{/if}
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Current password</span>
			<input class={field} type="password" name="current" autocomplete="current-password" required />
		</label>
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">New password</span>
			<input class={field} type="password" name="next" autocomplete="new-password" minlength="8" required />
		</label>
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Confirm new password</span>
			<input class={field} type="password" name="confirm" autocomplete="new-password" minlength="8" required />
		</label>
		<button type="submit" class="border border-ink bg-ink px-4 py-2 text-sm text-paper">Save password</button>
	</form>
{/if}

<section class="mb-10">
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
		Favourite places · {data.favourites.length}
	</h3>
	{#if data.favourites.length === 0}
		<p class="mt-3 text-sm text-muted">No favourites yet. Save a place from its page.</p>
	{:else}
		<ul class="mt-3 divide-y divide-line border-y border-line text-sm">
			{#each data.favourites as place (place.id)}
				<li class="flex items-baseline justify-between gap-3 py-2">
					<a href="/venues/{place.slug}" class="underline decoration-line underline-offset-4 hover:text-ink">
						{place.name}
					</a>
					<span class="text-muted">{place.district}</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section>
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
		Comments · {data.comments.length}
	</h3>
	{#if data.comments.length === 0}
		<p class="mt-3 text-sm text-muted">You have not commented yet.</p>
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
