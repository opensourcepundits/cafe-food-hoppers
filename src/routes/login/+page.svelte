<script lang="ts">
	let { form } = $props();
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';
</script>

<svelte:head>
	<title>Sign in — Place</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto max-w-md py-6">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Account</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight">Sign in</h2>
	<p class="mt-3 text-sm leading-6 text-muted">Use your email or phone number, plus password.</p>

	<form method="POST" class="mt-8 space-y-4">
		{#if form?.error}
			<p class="border border-accent px-4 py-3 text-sm text-accent">{form.error}</p>
		{/if}
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Email or phone</span>
			<input
				class={field}
				name="identifier"
				value={form?.identifier ?? ''}
				autocomplete="username"
				required
			/>
		</label>
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Password</span>
			<input
				class={field}
				type="password"
				name="password"
				autocomplete="current-password"
				required
			/>
		</label>
		<button type="submit" class="border border-ink bg-ink px-4 py-2 text-sm text-paper">Enter</button>
	</form>

	<p class="mt-6 text-sm text-muted">
		No account?
		<a href="/admin/register" class="underline decoration-line underline-offset-4 hover:text-ink">Register</a>
	</p>
</section>
