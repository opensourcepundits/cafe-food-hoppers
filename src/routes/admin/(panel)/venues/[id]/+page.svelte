<script lang="ts">
	import VenueForm from '$lib/components/admin/VenueForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Edit {data.venue.name} — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<p class="mb-6 text-sm text-muted">
	Public page:
	<a href="/venues/{data.venue.slug}" class="underline decoration-line underline-offset-4 hover:text-ink">
		/venues/{data.venue.slug}
	</a>
</p>

<VenueForm venue={data.venue} error={form?.error} saved={data.saved && !form?.error} />

<form method="POST" action="?/delete" class="mt-8 border-t border-line pt-6">
	<button
		type="submit"
		class="font-mono text-[11px] uppercase tracking-[0.16em] text-accent hover:underline"
		onclick={(event) => {
			if (!confirm(`Delete ${data.venue.name}? This cannot be undone.`)) event.preventDefault();
		}}
	>
		Delete this place
	</button>
</form>
