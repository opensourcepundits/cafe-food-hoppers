<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import type { MapFrame, MapPlace } from '$lib/venue';

	let {
		places,
		onview
	}: {
		places: MapPlace[];
		onview?: (frame: MapFrame) => void;
	} = $props();

	let root: HTMLDivElement | undefined = $state();
	let map: LeafletMap | undefined = $state();
	const markers = new Map<string, Marker>();
	let leaflet: typeof import('leaflet') | undefined;
	let reportView: ((frame: MapFrame) => void) | undefined;
	let fittedKey = '';

	$effect(() => {
		reportView = onview;
	});

	function pinIcon(place: MapPlace) {
		return leaflet?.divIcon({
			className: place.open ? 'place-pin place-pin-open' : 'place-pin place-pin-closed',
			html: '',
			iconSize: [14, 14],
			iconAnchor: [7, 7]
		});
	}

	function popup(place: MapPlace): HTMLElement {
		const card = document.createElement('div');

		const link = document.createElement('a');
		link.href = `/venues/${place.slug}`;
		link.textContent = place.name;
		link.className = 'text-sm font-medium text-ink underline decoration-line underline-offset-2';

		const detail = document.createElement('p');
		detail.className = 'text-xs text-muted';
		const status = place.open ? 'Open' : 'Closed';
		const hours = place.openLate ? `${place.hours} · Late` : place.hours;
		detail.textContent = `${place.district} · ${status} · ${hours}`;

		card.append(link, detail);
		return card;
	}

	function sync(list: MapPlace[]) {
		if (!map || !leaflet) return;
		const nextIds = new Set(list.map((place) => place.id));

		for (const [id, marker] of markers) {
			if (nextIds.has(id)) continue;
			marker.remove();
			markers.delete(id);
		}

		for (const place of list) {
			const icon = pinIcon(place);
			if (!icon) continue;
			const existing = markers.get(place.id);
			if (existing) {
				existing.setLatLng([place.lat, place.lng]);
				existing.setIcon(icon);
				existing.setPopupContent(popup(place));
				continue;
			}
			const marker = leaflet
				.marker([place.lat, place.lng], { icon, title: place.name, keyboard: true })
				.addTo(map)
				.bindPopup(popup(place), { minWidth: 0, maxWidth: 220 });
			markers.set(place.id, marker);
		}

		const key = list.map((place) => place.id).join('\0');
		if (key === fittedKey) return;
		fittedKey = key;
		if (list.length) {
			map.fitBounds(
				leaflet.latLngBounds(list.map((place) => [place.lat, place.lng])),
				{ padding: [36, 36], maxZoom: 14 }
			);
		} else {
			map.setView([-20.25, 57.55], 10);
		}
	}

	$effect(() => {
		const list = places;
		if (!map) return;
		sync(list);
	});

	onMount(() => {
		let cancelled = false;
		let remove = () => {};

		(async () => {
			const loaded = await import('leaflet');
			await import('leaflet/dist/leaflet.css');
			if (cancelled || !root) return;

			leaflet = 'default' in loaded ? loaded.default : loaded;
			const next = leaflet.map(root, { scrollWheelZoom: true });
			leaflet
				.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
					maxZoom: 19
				})
				.addTo(next);

			const publish = () => {
				const bounds = next.getBounds();
				const center = next.getCenter();
				reportView?.({
					north: bounds.getNorth(),
					south: bounds.getSouth(),
					east: bounds.getEast(),
					west: bounds.getWest(),
					lat: center.lat,
					lng: center.lng
				});
			};
			next.on('moveend', publish);

			map = next;
			publish();
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
		border: 2px solid var(--color-ink);
		border-radius: 999px;
		box-shadow: 2px 2px 0 0 var(--color-ink);
		cursor: pointer;
	}

	:global(.place-pin-open) {
		background: var(--color-open);
	}

	:global(.place-pin-closed) {
		background: #c2412d;
	}

	:global(.leaflet-popup-content-wrapper) {
		border-radius: 0;
		background: var(--color-paper);
		color: var(--color-ink);
		box-shadow: 3px 3px 0 0 var(--color-ink);
	}

	:global(.leaflet-popup-content) {
		margin: 6px 8px;
		line-height: 1.25;
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
