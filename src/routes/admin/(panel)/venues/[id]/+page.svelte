<script lang="ts">
	import { enhance } from '$app/forms';
	import VenueForm from '$lib/components/admin/VenueForm.svelte';
	import Dialog from '$lib/components/admin/Dialog.svelte';
	import BusyOverlay from '$lib/components/BusyOverlay.svelte';

	let { data, form } = $props();
	let confirmDelete = $state(false);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | undefined = $state();
	let allowDelete = $state(false);
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

{#if data.canDelete}
	<BusyOverlay show={deleting} label="Deleting place…" />

	<Dialog
		open={confirmDelete}
		title="Delete place"
		body={`Delete ${data.venue.name}? This cannot be undone.`}
		confirmLabel="Delete"
		danger
		oncancel={() => (confirmDelete = false)}
		onconfirm={() => {
			allowDelete = true;
			confirmDelete = false;
			deleteForm?.requestSubmit();
		}}
	/>

	<form
		bind:this={deleteForm}
		method="POST"
		action="?/delete"
		class="mt-8 border-t border-line pt-6"
		use:enhance={({ cancel }) => {
			if (!allowDelete) {
				cancel();
				confirmDelete = true;
				return;
			}
			deleting = true;
			return async ({ update }) => {
				await update();
				deleting = false;
				allowDelete = false;
			};
		}}
	>
		<button type="submit" class="font-mono text-[11px] uppercase tracking-[0.16em] text-accent hover:underline">
			Delete this place
		</button>
	</form>
{/if}
