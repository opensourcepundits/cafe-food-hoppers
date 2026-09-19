<script lang="ts">
	import VenueForm from '$lib/components/admin/VenueForm.svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>New place — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<VenueForm error={form?.error} />
