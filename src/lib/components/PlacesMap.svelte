<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map as LeafletMap, Marker } from 'leaflet';
	import type { MapFrame, MapPlace } from '$lib/venue';

	let {
		places,
		selected = null,
		onview,
		onselect
	}: {
		places: MapPlace[];
		selected?: MapPlace | null;
		onview?: (frame: MapFrame) => void;
		onselect?: (place: MapPlace | null) => void;
	} = $props();

	let root: HTMLDivElement | undefined = $state();
	let map: LeafletMap | undefined = $state();
	const markers = new Map<string, Marker>();
	let leaflet: typeof import('leaflet') | undefined;
	let reportView: ((frame: MapFrame) => void) | undefined;
	let reportSelect: ((place: MapPlace | null) => void) | undefined;
	let fittedKey = '';

	$effect(() => {
		reportView = onview;
		reportSelect = onselect;
	});

	function pinIcon(place: MapPlace) {
		return leaflet?.divIcon({
			className: place.open ? 'place-pin place-pin-open' : 'place-pin place-pin-closed',
			html: '',
			iconSize: [14, 14],
			iconAnchor: [7, 7]
		});
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
				continue;
			}
			const marker = leaflet
				.marker([place.lat, place.lng], { icon, title: place.name, keyboard: true })
				.addTo(map)
				.on('click', () => {
					center(place.id);
					reportSelect?.(place);
				});
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

	function center(id: string) {
		const marker = markers.get(id);
		if (!map || !marker) return;
		map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.45 });
	}

	export function focus(id: string) {
		center(id);
	}

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

</script>

<div class="relative">
	<div bind:this={root} class="h-[min(70vh,640px)] w-full border border-line bg-paper-2"></div>
	{#if selected}
		<div class="absolute bottom-3 left-3 z-20 max-w-xs border border-ink bg-paper px-3 py-2 shadow-[3px_3px_0_0_var(--color-ink)]">
			<div class="flex items-start justify-between gap-3">
				<a
					href="/venues/{selected.slug}"
					class="min-w-0 truncate text-sm font-medium underline decoration-line underline-offset-2"
				>
					{selected.name}
				</a>
				<button
					type="button"
					class="shrink-0 text-sm leading-none text-muted"
					aria-label="Close"
					onclick={() => onselect?.(null)}
				>
					×
				</button>
			</div>
			<p class="mt-1 text-xs text-muted">
				{selected.closes ? `Closes ${selected.closes}` : 'Closed today'}
			</p>
			{#if selected.wifi || selected.noise}
				<ul class="mt-1.5 flex flex-wrap gap-1">
					{#if selected.wifi}
						<li class="border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
							{selected.wifi}
						</li>
					{/if}
					{#if selected.noise}
						<li class="border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
							{selected.noise}
						</li>
					{/if}
				</ul>
			{/if}
			<p class="mt-1.5 text-xs text-muted">
				{selected.lighting.length ? selected.lighting.join(' · ') : 'Light not listed'}
			</p>
			<p class="text-xs text-muted">{selected.parking || 'Parking not listed'}</p>
		</div>
	{/if}
</div>

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

	:global(.leaflet-control-attribution) {
		background: color-mix(in srgb, var(--color-paper) 88%, transparent);
		font-size: 10px;
	}
</style>
