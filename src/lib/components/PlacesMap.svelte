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
		const tone = place.open ? 'pin-dot-open' : 'pin-dot-closed';
		const pulse = place.specialPulse ? ` pin-pulse-${place.specialPulse}` : '';
		return leaflet?.divIcon({
			className: `pin-icon${pulse}`,
			html: `<span class="pin-ring"></span><span class="pin-ring pin-ring-late"></span><span class="pin-dot ${tone}"></span>`,
			iconSize: [48, 48],
			iconAnchor: [24, 24]
		});
	}

	function popup(place: MapPlace): HTMLElement {
		const card = document.createElement('div');
		card.className = 'pin-card';

		const link = document.createElement('a');
		link.href = `/venues/${place.slug}`;
		link.textContent = place.name;
		link.className = 'pin-card-name';

		const hours = document.createElement('p');
		hours.className = 'pin-card-line';
		hours.textContent = `${place.open ? 'Open' : 'Closed'} · ${place.hours} · ${place.wifi ?? 'No WiFi'}`;

		card.append(link, hours);

		if (place.noise) {
			const noise = document.createElement('p');
			noise.className = 'pin-card-line';
			noise.textContent = place.noise;
			card.append(noise);
		}

		const light = document.createElement('p');
		light.className = 'pin-card-line';
		light.textContent = place.lighting.length ? place.lighting.join(' · ') : 'Light not listed';

		const parking = document.createElement('p');
		parking.className = 'pin-card-line';
		parking.textContent = place.parking || 'Parking not listed';

		card.append(light, parking);
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
				.bindPopup(popup(place), { minWidth: 160, maxWidth: 240, autoPan: true })
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
		markers.get(id)?.openPopup();
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
				· {selected.wifi ?? 'No WiFi'}
			</p>
			{#if selected.noise}
				<ul class="mt-1.5 flex flex-wrap gap-1">
					<li class="border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
						{selected.noise}
					</li>
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
	:global(.pin-icon) {
		background: transparent;
		border: none;
	}

	:global(.pin-dot) {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 14px;
		height: 14px;
		margin: -7px 0 0 -7px;
		border: 2px solid var(--color-ink);
		border-radius: 999px;
		box-shadow: 2px 2px 0 0 var(--color-ink);
		cursor: pointer;
	}

	:global(.pin-dot-open) {
		background: var(--color-open);
	}

	:global(.pin-dot-closed) {
		background: #c2412d;
	}

	:global(.pin-ring) {
		display: none;
	}

	:global(.pin-pulse-ongoing .pin-ring),
	:global(.pin-pulse-ending .pin-ring),
	:global(.pin-pulse-upcoming .pin-ring) {
		display: block;
		position: absolute;
		top: 50%;
		left: 50%;
		width: 18px;
		height: 18px;
		margin: -9px 0 0 -9px;
		border-radius: 999px;
		pointer-events: none;
	}

	:global(.pin-pulse-ongoing .pin-ring) {
		border: 2px solid var(--color-open);
		animation: pin-pulse-ongoing 1.6s ease-out infinite;
	}

	:global(.pin-pulse-ongoing .pin-ring-late) {
		animation-delay: 0.8s;
	}

	:global(.pin-pulse-upcoming .pin-ring) {
		border: 2px dashed #c4841d;
		animation: pin-pulse-upcoming 2.2s ease-in-out infinite;
	}

	:global(.pin-pulse-upcoming .pin-ring-late) {
		display: none;
	}

	:global(.pin-pulse-ending .pin-ring) {
		border: 3px solid #c2412d;
		animation: pin-pulse-ending 0.55s ease-out infinite;
	}

	:global(.pin-pulse-ending .pin-ring-late) {
		animation-delay: 0.28s;
	}

	:global(.pin-card-name) {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-ink);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	:global(.pin-card-line) {
		margin-top: 2px;
		font-size: 12px;
		line-height: 1.3;
		color: var(--color-muted, #6b6458);
	}

	:global(.leaflet-popup-content-wrapper) {
		border-radius: 0;
		background: var(--color-paper);
		color: var(--color-ink);
		box-shadow: 3px 3px 0 0 var(--color-ink);
	}

	:global(.leaflet-popup-content) {
		margin: 8px 10px;
		font-family: var(--font-sans);
	}

	:global(.leaflet-popup-tip) {
		background: var(--color-paper);
	}

	:global(.leaflet-control-attribution) {
		background: color-mix(in srgb, var(--color-paper) 88%, transparent);
		font-size: 10px;
	}

	:global {
		@keyframes pin-pulse-ongoing {
			0% {
				transform: scale(0.7);
				opacity: 0.9;
			}
			100% {
				transform: scale(2.4);
				opacity: 0;
			}
		}

		@keyframes pin-pulse-upcoming {
			0% {
				transform: scale(0.8);
				opacity: 0.95;
			}
			100% {
				transform: scale(2);
				opacity: 0;
			}
		}

		@keyframes pin-pulse-ending {
			0% {
				transform: scale(0.6);
				opacity: 1;
			}
			100% {
				transform: scale(2.6);
				opacity: 0;
			}
		}
	}
</style>
