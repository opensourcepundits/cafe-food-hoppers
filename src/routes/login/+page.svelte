<script lang="ts">
	import { page } from '$app/state';

	let { data, form } = $props();
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';
	const googleHref = $derived.by(() => {
		const next = page.url.searchParams.get('next');
		return next ? `/auth/google?next=${encodeURIComponent(next)}` : '/auth/google';
	});
</script>

<svelte:head>
	<title>Sign in — Place</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto max-w-md py-6">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Account</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight">Sign in</h2>
	<p class="mt-3 text-sm leading-6 text-muted">Use Google, or your email or phone number plus a password.</p>

	{#if form?.error || data.error}
		<p class="mt-8 border border-accent px-4 py-3 text-sm text-accent">{form?.error ?? data.error}</p>
	{/if}

	<a href={googleHref} class="mt-8 flex w-full items-center justify-center gap-3 border border-ink px-4 py-2 text-sm">
		<svg viewBox="0 0 18 18" class="size-4" aria-hidden="true">
			<path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
			<path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
			<path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
			<path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
		</svg>
		Continue with Google
	</a>

	<p class="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted">or</p>

	<form method="POST" class="mt-6 space-y-4">
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
