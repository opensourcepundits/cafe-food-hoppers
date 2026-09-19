<script lang="ts">
	let { form } = $props();
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';
</script>

<svelte:head>
	<title>Register — Place admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto max-w-md py-6">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Admin</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight">Register</h2>
	<p class="mt-3 text-sm leading-6 text-muted">Email, phone, and a password. Sign in later with either email or phone.</p>

	<form method="POST" class="mt-8 space-y-4">
		{#if form?.error}
			<p class="border border-accent px-4 py-3 text-sm text-accent">{form.error}</p>
		{/if}
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Email</span>
			<input class={field} type="email" name="email" value={form?.email ?? ''} autocomplete="email" required />
		</label>
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Phone</span>
			<input
				class={field}
				type="tel"
				name="phone"
				value={form?.phone ?? ''}
				autocomplete="tel"
				placeholder="+230 5xxx xxxx"
				required
			/>
		</label>
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Password</span>
			<input class={field} type="password" name="password" autocomplete="new-password" minlength="8" required />
		</label>
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Confirm password</span>
			<input class={field} type="password" name="confirm" autocomplete="new-password" minlength="8" required />
		</label>
		<button type="submit" class="border border-ink bg-ink px-4 py-2 text-sm text-paper">Create account</button>
	</form>

	<p class="mt-6 text-sm text-muted">
		Already registered?
		<a href="/admin/login" class="underline decoration-line underline-offset-4 hover:text-ink">Sign in</a>
	</p>
</section>
