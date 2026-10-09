<script lang="ts">
	import { goto } from '$app/navigation';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Dialog from '$lib/components/admin/Dialog.svelte';

	let locating = $state(false);
	let locateError = $state('');
	let confirmOpen = $state(false);

	function askEmergency() {
		locateError = '';
		confirmOpen = true;
	}

	function findEmergencyPlace() {
		confirmOpen = false;
		locateError = '';
		if (!navigator.geolocation) {
			locateError = 'This browser cannot share your location.';
			return;
		}
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const params = new URLSearchParams({
					meet: '5',
					lat: String(position.coords.latitude),
					lng: String(position.coords.longitude)
				});
				locating = false;
				void goto(`/map?${params}`, { invalidateAll: true });
			},
			() => {
				locating = false;
				locateError = 'Allow location access to open the map around you.';
			},
			{ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
		);
	}
</script>

<button
	type="button"
	class="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full border border-ink bg-accent text-paper shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-60"
	aria-label="Emergency meeting"
	onclick={askEmergency}
	disabled={locating}
>
	<TriangleAlert class="size-6" />
</button>
{#if locateError}
	<p class="fixed right-4 bottom-24 z-40 max-w-xs border border-accent bg-paper px-3 py-2 text-sm text-accent">
		{locateError}
	</p>
{/if}
<Dialog
	open={confirmOpen}
	title="Emergency meeting"
	body="Do you have an emergency meeting? This opens the map and marks every place within a 5-minute walk. You can widen that to 10 or 15 minutes."
	confirmLabel="Find a place"
	danger
	busy={locating}
	oncancel={() => (confirmOpen = false)}
	onconfirm={findEmergencyPlace}
/>
