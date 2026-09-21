<script lang="ts">
	import { mapsEmbedUrl, parseMapsPin, type Venue } from '$lib/venue';

	let { venue }: { venue: Pick<Venue, 'lat' | 'lng' | 'contact' | 'name'> } = $props();

	const pin = $derived(
		venue.lat !== null && venue.lng !== null
			? { lat: venue.lat, lng: venue.lng }
			: parseMapsPin(venue.contact.google_maps ?? '')
	);
</script>

{#if pin}
	<iframe
		title="Map of {venue.name}"
		class="h-64 w-full border border-line lg:h-72"
		src={mapsEmbedUrl(pin.lat, pin.lng)}
		loading="lazy"
		referrerpolicy="no-referrer-when-downgrade"
	></iframe>
{/if}
