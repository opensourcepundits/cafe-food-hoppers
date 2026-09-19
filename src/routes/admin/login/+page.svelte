<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head>
	<title>Admin sign in — Place</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto max-w-md py-6">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Admin</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight">Sign in</h2>
	<p class="mt-3 text-sm leading-6 text-muted">Edit places, menus, hours, and specials.</p>

	{#if !data.configured}
		<p class="mt-6 border border-accent px-4 py-3 text-sm text-accent">
			Set <code class="font-mono">ADMIN_PASSWORD</code> in <code class="font-mono">.env</code> (and on Vercel), then
			restart.
		</p>
	{:else}
		<form method="POST" class="mt-8 space-y-4">
			{#if form?.error}
				<p class="border border-accent px-4 py-3 text-sm text-accent">{form.error}</p>
			{/if}
			<label class="block">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Password</span>
				<input
					class="w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
					type="password"
					name="password"
					autocomplete="current-password"
					required
				/>
			</label>
			<button type="submit" class="border border-ink bg-ink px-4 py-2 text-sm text-paper">Enter</button>
		</form>
	{/if}
</section>
