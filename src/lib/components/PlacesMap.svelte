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

	function popup(place: MapPlace): HTMLElement {
		const root = document.createElement('div');
		root.className = 'min-w-44';

		const link = document.createElement('a');
		link.href = `/venues/${place.slug}`;
		link.textContent = place.name;
		link.className = 'font-medium text-ink underline decoration-line underline-offset-4';

		const district = document.createElement('p');
		district.textContent = place.district;
		district.className = 'mt-1 text-xs text-muted';

		const status = document.createElement('p');
		status.className = 'mt-2 font-mono text-[10px] uppercase tracking-[0.16em]';
		status.textContent = place.alert ? 'Alert' : place.open ? 'Open' : 'Closed';
		status.classList.add(place.alert ? 'text-accent' : place.open ? 'text-open' : 'text-closed');

		const hours = document.createElement('p');
		hours.className = 'mt-1 text-xs text-muted';
		hours.textContent = place.openLate ? `${place.hours} · Late` : place.hours;

		root.append(link, district, status, hours);

		if (place.special) {
			const special = document.createElement('p');
			special.className = 'mt-2 border-l-2 border-accent pl-2 text-xs';
			special.textContent = place.special;
			root.append(special);
		}

		if (place.bits.length) {
			const bits = document.createElement('p');
			bits.className = 'mt-2 text-xs text-muted';
			bits.textContent = place.bits.join(' · ');
			root.append(bits);
		}

		return root;
	}

	function sync(list: MapPlace[]) {
		if (!map || !leaflet) return;
		const nextIds = new Set(list.map((place) => place.id));

		for (const [id, marker] of markers) {
			if (nextIds.has(id)) continue;
			marker.remove();
			markers.delete(id);
		}

		const icon = leaflet.divIcon({
			className: 'place-pin',
			html: '',
			iconSize: [14, 14],
			iconAnchor: [7, 7]
		});

		for (const place of list) {
			const existing = markers.get(place.id);
			if (existing) {
				existing.setLatLng([place.lat, place.lng]);
				existing.setPopupContent(popup(place));
				continue;
			}
			const marker = leaflet
				.marker([place.lat, place.lng], { icon, title: place.name, keyboard: true })
				.addTo(map)
				.bindPopup(popup(place));
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
		background: var(--color-accent);
		border: 2px solid var(--color-ink);
		border-radius: 999px;
		box-shadow: 2px 2px 0 0 var(--color-ink);
		cursor: pointer;
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
