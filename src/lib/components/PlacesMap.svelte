<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import type { MapPlace } from '$lib/venue';

	let { places }: { places: MapPlace[] } = $props();

	let root: HTMLDivElement | undefined = $state();
	let map: LeafletMap | undefined;
	const markers = new Map<string, Marker>();

	onMount(() => {
		let cancelled = false;
		let remove = () => {};

		(async () => {
			const leaflet = await import('leaflet');
			await import('leaflet/dist/leaflet.css');
			if (cancelled || !root) return;

			const L = leaflet.default;
			const next = L.map(root, { scrollWheelZoom: true });
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
				maxZoom: 19
			}).addTo(next);

			const icon = L.divIcon({
				className: 'place-pin',
				html: '',
				iconSize: [14, 14],
				iconAnchor: [7, 7]
			});

			for (const place of places) {
				const popup = document.createElement('div');
				const link = document.createElement('a');
				link.href = `/venues/${place.slug}`;
				link.textContent = place.name;
				link.className = 'font-medium text-ink underline decoration-line underline-offset-4';
				const district = document.createElement('p');
				district.textContent = place.district;
				district.className = 'mt-1 text-xs text-muted';
				popup.append(link, district);

				const marker = L.marker([place.lat, place.lng], { icon, title: place.name })
					.addTo(next)
					.bindPopup(popup);
				markers.set(place.id, marker);
			}

			if (places.length) {
				next.fitBounds(
					L.latLngBounds(places.map((place) => [place.lat, place.lng])),
					{ padding: [36, 36], maxZoom: 14 }
				);
			} else {
				next.setView([-20.25, 57.55], 10);
			}

			map = next;
			remove = () => {
				markers.clear();
				next.remove();
				map = undefined;
			};
		})();

		return () => {
			cancelled = true;
			remove();
		};
	});

	export function focus(id: string) {
		const marker = markers.get(id);
		if (!map || !marker) return;
		const point = marker.getLatLng();
		map.flyTo(point, Math.max(map.getZoom(), 15), { duration: 0.6 });
		marker.openPopup();
	}
</script>

<div bind:this={root} class="h-[min(70vh,640px)] w-full border border-line bg-paper-2"></div>

<style>
	:global(.place-pin) {
		background: var(--color-accent);
		border: 2px solid var(--color-ink);
		border-radius: 999px;
		box-shadow: 2px 2px 0 0 var(--color-ink);
	}

	:global(.leaflet-popup-content-wrapper) {
		border-radius: 0;
		background: var(--color-paper);
		color: var(--color-ink);
		box-shadow: 3px 3px 0 0 var(--color-ink);
	}

	:global(.leaflet-popup-content) {
		margin: 10px 12px;
		font-family: var(--font-sans);
	}

	:global(.leaflet-popup-tip) {
		background: var(--color-paper);
		box-shadow: none;
	}

	:global(.leaflet-control-attribution) {
		background: color-mix(in srgb, var(--color-paper) 88%, transparent);
		font-size: 10px;
	}
</style>
