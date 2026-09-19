<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} — Place</title>
</svelte:head>

<section class="max-w-lg py-12">
	<p class="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">{page.status}</p>
	<h2 class="mt-2 text-3xl font-semibold tracking-tight">{page.error?.message ?? 'Something broke.'}</h2>
	<p class="mt-4">
		<a href="/" class="text-sm underline decoration-line underline-offset-4 hover:text-ink">
			Back to the directory
		</a>
	</p>
</section>
