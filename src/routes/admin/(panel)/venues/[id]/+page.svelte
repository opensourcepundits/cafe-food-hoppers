<script lang="ts">
	import { enhance } from '$app/forms';
	import { isoToDatetimeLocal } from '$lib/venue';
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

{#if data.canVerify}
	<form method="POST" action="?/badges" class="mb-8 border border-line bg-paper-2 p-4">
		<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Verification</h3>
		<p class="mt-2 text-sm text-muted">Only a superuser can mark badges and record a Wi-Fi speed test.</p>
		{#if data.badgesSaved}
			<p class="mt-3 text-sm">Verification saved.</p>
		{/if}
		<div class="mt-4 flex flex-wrap gap-4 text-sm">
			<label class="flex items-center gap-2">
				<input type="checkbox" name="speedVerified" value="1" checked={data.venue.speedVerified} />
				Internet speed test verified
			</label>
			<label class="flex items-center gap-2">
				<input type="checkbox" name="noiseVerified" value="1" checked={data.venue.noiseVerified} />
				Decibel test verified
			</label>
		</div>
		<div class="mt-4 grid gap-4 sm:grid-cols-3">
			<label class="block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Wi-Fi tested</span>
				<input
					class="w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
					type="datetime-local"
					name="wifiTestedAt"
					value={isoToDatetimeLocal(data.venue.wifiTestedAt)}
				/>
			</label>
			<label class="block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Download Mbps</span>
				<input
					class="w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
					type="number"
					name="wifiDownloadMbps"
					min="0"
					step="0.1"
					value={data.venue.wifiDownloadMbps ?? ''}
				/>
			</label>
			<label class="block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Upload Mbps</span>
				<input
					class="w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
					type="number"
					name="wifiUploadMbps"
					min="0"
					step="0.1"
					value={data.venue.wifiUploadMbps ?? ''}
				/>
			</label>
		</div>
		<button type="submit" class="mt-4 border border-ink bg-ink px-3 py-1.5 text-sm text-paper">Save verification</button>
	</form>
{/if}

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
