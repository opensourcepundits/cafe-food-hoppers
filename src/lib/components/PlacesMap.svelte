<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Circle, Map as LeafletMap, Marker, Popup } from 'leaflet';
	import {
		MEET_WALK_MINUTES,
		ratingLabel,
		ratingStars,
		type MapFrame,
		type MapPlace,
		type MeetWalkMinutes
	} from '$lib/venue';

	let {
		places,
		meet = null,
		onview,
		onselect,
		onmeet
	}: {
		places: MapPlace[];
		meet?: { lat: number; lng: number; meters: number; minutes: MeetWalkMinutes; ids: string[] } | null;
		onview?: (frame: MapFrame) => void;
		onselect?: (place: MapPlace | null) => void;
		onmeet?: (minutes: MeetWalkMinutes) => void;
	} = $props();

	let root: HTMLDivElement | undefined = $state();
	let map: LeafletMap | undefined = $state();
	const markers = new Map<string, Marker>();
	let leaflet: typeof import('leaflet') | undefined;
	let hereMarker: Marker | undefined;
	let hereCircle: Circle | undefined;
	let meetCircle: Circle | undefined;
	let radiusKey = '';
	let locateError = $state('');
	let fullscreen = $state(false);
	let reportView: ((frame: MapFrame) => void) | undefined;
	let reportSelect: ((place: MapPlace | null) => void) | undefined;
	let fittedKey = '';

	$effect(() => {
		reportView = onview;
		reportSelect = onselect;
	});

	function pinIcon(place: MapPlace, rangeIds: ReadonlySet<string> | null) {
		const tone = place.open ? 'pin-dot-open' : 'pin-dot-closed';
		const inRange = rangeIds?.has(place.id) ?? false;
		const pulse = inRange
			? ' pin-pulse-meet'
			: rangeIds
				? ' pin-muted'
				: place.alert
					? ' pin-pulse-alert'
					: place.specialPulse
						? ` pin-pulse-${place.specialPulse}`
						: '';
		return leaflet?.divIcon({
			className: `pin-icon${pulse}`,
			html: `<span class="pin-ring"></span><span class="pin-ring pin-ring-late"></span><span class="pin-dot ${tone}"></span>`,
			iconSize: [28, 28],
			iconAnchor: [14, 14],
			popupAnchor: [0, -12]
		});
	}

	function openOnly(id: string) {
		const marker = markers.get(id);
		if (!map || !marker) return;
		for (const [otherId, other] of markers) {
			if (otherId !== id) other.closePopup();
		}
		map.closePopup();
		marker.openPopup();
		const open = marker.getPopup()?.getElement() ?? null;
		if (!open) return;
		root?.querySelectorAll('.leaflet-popup').forEach((node) => {
			if (node !== open) node.remove();
		});
	}

	function line(className: string, text: string): HTMLElement {
		const node = document.createElement('p');
		node.className = className;
		node.textContent = text;
		return node;
	}

	function popup(place: MapPlace): HTMLElement {
		const card = document.createElement('div');
		card.className = 'pin-card';

		const head = document.createElement('div');
		head.className = 'pin-card-head';
		const name = document.createElement('p');
		name.className = 'pin-card-name';
		name.textContent = place.name;
		const status = document.createElement('span');
		status.className = place.open ? 'pin-status pin-status-open' : 'pin-status';
		status.textContent = place.open ? 'Open' : 'Closed';
		head.append(name, status);

		card.append(line('pin-card-kicker', place.district), head, ratingLine(place));
		for (const title of place.alertTitles) card.append(line('pin-card-alert', title));
		card.append(line('pin-card-meta', [place.hours, place.wifi ?? 'No WiFi'].join(' · ')));

		const labels = [place.noise, place.lighting.join(' · '), place.parking].filter(
			(label): label is string => Boolean(label)
		);
		if (labels.length) {
			const list = document.createElement('ul');
			list.className = 'pin-card-chips';
			for (const label of labels) {
				const item = document.createElement('li');
				item.textContent = label;
				list.append(item);
			}
			card.append(list);
		}

		const more = document.createElement('a');
		more.href = `/venues/${place.slug}`;
		more.className = 'pin-card-more';
		more.textContent = 'More info';
		card.append(more);
		return card;
	}

	function ratingLine(place: MapPlace): HTMLElement {
		const row = document.createElement('p');
		row.className = 'pin-card-rating';
		const stars = document.createElement('span');
		stars.className = 'pin-card-stars';
		stars.setAttribute('aria-hidden', 'true');
		const filled = ratingStars(place.ratingAverage);
		for (let star = 1; star <= 5; star += 1) {
			const mark = document.createElement('span');
			mark.className = star <= filled ? 'pin-star-on' : 'pin-star-off';
			mark.textContent = '★';
			stars.append(mark);
		}
		row.append(stars, document.createTextNode(ratingLabel(place.ratingAverage, place.ratingCount)));
		return row;
	}

	function sync(list: MapPlace[], rangeIds: ReadonlySet<string> | null) {
		if (!map || !leaflet) return;
		const nextIds = new Set(list.map((place) => place.id));

		for (const [id, marker] of markers) {
			if (nextIds.has(id)) continue;
			marker.remove();
			markers.delete(id);
		}

		for (const place of list) {
			const icon = pinIcon(place, rangeIds);
			if (!icon) continue;
			const highlighted = rangeIds?.has(place.id) ?? false;
			const existing = markers.get(place.id);
			if (existing) {
				existing.setLatLng([place.lat, place.lng]);
				existing.setIcon(icon);
				existing.setZIndexOffset(highlighted ? 700 : 0);
				existing.setPopupContent(popup(place));
				continue;
			}
			const marker = leaflet
				.marker([place.lat, place.lng], {
					icon,
					title: place.name,
					keyboard: true,
					bubblingMouseEvents: false,
					zIndexOffset: highlighted ? 700 : 0
				})
				.addTo(map)
				.bindPopup(popup(place), {
					minWidth: 220,
					maxWidth: 260,
					autoPan: false,
					autoClose: true,
					closeOnClick: true,
					className: 'pin-popup'
				})
				.on('click', (event) => {
					event.originalEvent?.stopPropagation();
					reportSelect?.(place);
					openOnly(place.id);
				});
			markers.set(place.id, marker);
		}

		if (rangeIds) {
			fittedKey = '';
			return;
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

	function applyRadius(area: { lat: number; lng: number; meters: number } | null) {
		if (!map || !leaflet) return;
		if (!area) {
			meetCircle?.remove();
			meetCircle = undefined;
			radiusKey = '';
			return;
		}

		const latlng = { lat: area.lat, lng: area.lng };
		const bounds = leaflet.latLng(latlng.lat, latlng.lng).toBounds(area.meters);
		if (map.getZoom() === undefined) {
			map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: false });
		}

		if (meetCircle) {
			meetCircle.setLatLng(latlng);
			meetCircle.setRadius(area.meters);
		} else {
			meetCircle = leaflet
				.circle(latlng, {
					radius: area.meters,
					color: '#b4532a',
					weight: 2,
					dashArray: '7 7',
					fillColor: '#b4532a',
					fillOpacity: 0.12,
					interactive: false,
					className: 'meet-radius'
				})
				.addTo(map);
		}
		meetCircle.bringToBack();
		showHere(latlng, 0);

		const key = `${area.lat.toFixed(5)}:${area.lng.toFixed(5)}:${area.meters}`;
		if (key === radiusKey) return;
		radiusKey = key;
		const fit = () => {
			if (!map) return;
			map.invalidateSize();
			map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: false });
		};
		fit();
		void tick().then(() => requestAnimationFrame(fit));
	}

	$effect(() => {
		const list = places;
		const area = meet;
		if (!map) return;
		applyRadius(area ? { lat: area.lat, lng: area.lng, meters: area.meters } : null);
		const rangeIds = area ? new Set(area.ids) : null;
		sync(list, rangeIds);
	});

	function showHere(latlng: { lat: number; lng: number }, accuracy: number) {
		if (!map || !leaflet) return;
		const icon = leaflet.divIcon({
			className: 'here-icon',
			html: '<span class="here-dot"></span>',
			iconSize: [18, 18],
			iconAnchor: [9, 9]
		});
		if (hereMarker) hereMarker.setLatLng(latlng);
		else {
			hereMarker = leaflet
				.marker(latlng, { icon, title: 'You are here', keyboard: false, zIndexOffset: 800 })
				.addTo(map);
		}
		if (accuracy > 0 && accuracy <= 1500) {
			if (hereCircle) {
				hereCircle.setLatLng(latlng);
				hereCircle.setRadius(accuracy);
			} else {
				hereCircle = leaflet
					.circle(latlng, {
						radius: accuracy,
						color: '#1d4ed8',
						weight: 1,
						fillColor: '#1d4ed8',
						fillOpacity: 0.12,
						interactive: false
					})
					.addTo(map);
			}
		} else {
			hereCircle?.remove();
			hereCircle = undefined;
		}
	}

	function goHere() {
		if (!map) return;
		locateError = '';
		if (hereMarker) {
			map.stop();
			map.setView(hereMarker.getLatLng(), Math.max(map.getZoom(), 15), { animate: false });
			return;
		}
		map.locate({ watch: true, setView: true, maxZoom: 15, enableHighAccuracy: true });
	}

	function center(id: string) {
		const marker = markers.get(id);
		if (!map || !marker) return;
		map.stop();
		const zoom = Math.max(map.getZoom(), 15);
		map.setView(marker.getLatLng(), zoom, { animate: false });
	}

	function toggleMap() {
		fullscreen = !fullscreen;
	}

	$effect(() => {
		const active = fullscreen;
		void tick().then(() => map?.invalidateSize());
		if (!active || typeof document === 'undefined') return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') fullscreen = false;
		};
		window.addEventListener('keydown', onKey);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener('keydown', onKey);
		};
	});

	export function focus(id: string) {
		const marker = markers.get(id);
		if (!map || !marker) return;
		center(id);
		openOnly(id);
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

			let viewTimer: ReturnType<typeof setTimeout> | undefined;
			const publish = () => {
				clearTimeout(viewTimer);
				viewTimer = setTimeout(() => {
					const bounds = next.getBounds();
					const point = next.getCenter();
					reportView?.({
						north: bounds.getNorth(),
						south: bounds.getSouth(),
						east: bounds.getEast(),
						west: bounds.getWest(),
						lat: point.lat,
						lng: point.lng
					});
				}, 250);
			};
			next.on('popupopen', (event) => {
				const opened = (event as typeof event & { popup?: Popup }).popup?.getElement() ?? null;
				if (!opened) return;
				root?.querySelectorAll('.leaflet-popup').forEach((node) => {
					if (node !== opened) node.remove();
				});
			});
			next.on('moveend', publish);
			next.on('locationfound', (event) => {
				const found = event as typeof event & { latlng: { lat: number; lng: number }; accuracy: number };
				locateError = '';
				showHere(found.latlng, found.accuracy);
			});
			next.on('locationerror', (event) => {
				const failed = event as typeof event & { code?: number };
				if (failed.code === 1) locateError = 'Allow location access to show where you are.';
			});

			map = next;
			void tick().then(() => {
				if (!cancelled) next.invalidateSize();
			});
			next.locate({ watch: true, setView: false, enableHighAccuracy: true, maximumAge: 15000 });
			publish();
			remove = () => {
				clearTimeout(viewTimer);
				next.stopLocate();
				markers.clear();
				hereMarker = undefined;
				hereCircle = undefined;
				meetCircle = undefined;
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

<div class="relative isolate {fullscreen ? 'fixed inset-0 z-30 bg-paper' : 'z-0'}">
	<div
		bind:this={root}
		class="relative z-0 w-full bg-paper-2 {fullscreen ? 'h-full' : 'h-[min(70vh,640px)] border border-line'}"
	></div>
	{#if meet}
		<div
			class="absolute top-3 left-3 z-20 flex gap-1"
			role="group"
			aria-label="Walk radius"
		>
			{#each MEET_WALK_MINUTES as minutes (minutes)}
				<button
					type="button"
					class="border px-2.5 py-1.5 text-xs shadow-[2px_2px_0_0_var(--color-ink)] {meet.minutes === minutes
						? 'border-ink bg-ink text-paper'
						: 'border-ink bg-paper'}"
					aria-pressed={meet.minutes === minutes}
					onclick={() => onmeet?.(minutes)}
				>
					{minutes} min
				</button>
			{/each}
		</div>
	{/if}
	<button
		type="button"
		class="absolute top-3 right-3 z-30 border border-ink bg-paper px-2.5 py-1.5 text-xs shadow-[2px_2px_0_0_var(--color-ink)]"
		onclick={goHere}
	>
		Your location
	</button>
	<button
		type="button"
		class="absolute right-3 z-30 border border-ink bg-paper px-2.5 py-1.5 text-xs shadow-[2px_2px_0_0_var(--color-ink)] {fullscreen
			? 'bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))]'
			: 'bottom-3'}"
		aria-pressed={fullscreen}
		onclick={toggleMap}
	>
		{fullscreen ? 'Regular' : 'Full screen'}
	</button>
	{#if locateError}
		<p class="absolute top-14 right-3 z-[500] max-w-56 border border-accent bg-paper px-3 py-2 text-xs text-accent">
			{locateError}
		</p>
	{/if}
</div>

<style>
	:global(.here-icon) {
		background: transparent;
		border: none;
	}

	:global(.here-dot) {
		display: block;
		width: 16px;
		height: 16px;
		border: 3px solid #fff;
		border-radius: 999px;
		background: #1d4ed8;
		box-shadow: 0 0 0 2px #1d4ed8;
	}

	:global(.pin-icon) {
		background: transparent;
		border: none;
		pointer-events: none;
	}

	:global(.pin-dot) {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 18px;
		height: 18px;
		margin: -9px 0 0 -9px;
		border: 2px solid #fff;
		pointer-events: auto;
		border-radius: 999px;
		box-shadow: 0 0 0 2px #111, 0 2px 8px rgba(0, 0, 0, 0.45);
		cursor: pointer;
	}

	:global(.pin-dot-open) {
		background: #128a52;
	}

	:global(.pin-dot-closed) {
		background: #e11d2e;
	}

	:global(.pin-ring) {
		display: none;
	}

	:global(.pin-pulse-ongoing .pin-ring),
	:global(.pin-pulse-ending .pin-ring),
	:global(.pin-pulse-upcoming .pin-ring),
	:global(.pin-pulse-alert .pin-ring),
	:global(.pin-pulse-meet .pin-ring) {
		display: block;
		position: absolute;
		top: 50%;
		left: 50%;
		width: 22px;
		height: 22px;
		margin: -11px 0 0 -11px;
		border-radius: 999px;
		pointer-events: none;
	}

	:global(.pin-pulse-ongoing .pin-ring) {
		border: 3px solid #128a52;
		animation: pin-pulse-ongoing 1.6s ease-out infinite;
	}

	:global(.pin-pulse-ongoing .pin-ring-late) {
		animation-delay: 0.8s;
	}

	:global(.pin-pulse-upcoming .pin-ring) {
		border: 3px dashed #e09a12;
		animation: pin-pulse-upcoming 2.2s ease-in-out infinite;
	}

	:global(.pin-pulse-upcoming .pin-ring-late) {
		display: none;
	}

	:global(.pin-pulse-ending .pin-ring) {
		border: 4px solid #e11d2e;
		animation: pin-pulse-ending 0.55s ease-out infinite;
	}

	:global(.pin-pulse-ending .pin-ring-late) {
		animation-delay: 0.28s;
	}

	:global(.pin-pulse-alert .pin-ring) {
		border: 3px solid #b4532a;
		animation: pin-pulse-ongoing 1.6s ease-out infinite;
	}

	:global(.pin-pulse-meet .pin-ring) {
		border: 4px solid #b4532a;
		animation: pin-pulse-meet 1.05s ease-out infinite;
	}

	:global(.pin-pulse-meet .pin-dot) {
		box-shadow:
			0 0 0 3px #b4532a,
			0 0 0 7px rgba(180, 83, 42, 0.35),
			0 2px 8px rgba(0, 0, 0, 0.45);
	}

	:global(.pin-muted) {
		opacity: 0.38;
	}

	:global(.pin-pulse-alert .pin-ring-late) {
		animation-delay: 0.8s;
	}

	:global(.pin-pulse-meet .pin-ring-late) {
		animation-delay: 0.5s;
	}

	:global(.pin-card-kicker) {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	:global(.pin-card-head) {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		margin-top: 2px;
	}

	:global(.pin-card-alert) {
		margin-top: 6px;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.35;
		color: var(--color-accent);
	}

	:global(.pin-card-name) {
		font-size: 15px;
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-ink);
	}

	:global(.pin-status) {
		flex: none;
		border: 1px solid var(--color-line);
		padding: 1px 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	:global(.pin-status-open) {
		border-color: var(--color-open);
		color: var(--color-open);
	}

	:global(.pin-card-rating) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 6px;
		font-size: 12px;
		line-height: 1.4;
		color: var(--color-muted);
	}

	:global(.pin-card-stars) {
		letter-spacing: 0.08em;
	}

	:global(.pin-star-on) {
		color: var(--color-accent);
	}

	:global(.pin-star-off) {
		color: var(--color-line);
	}

	:global(.pin-card-meta) {
		margin-top: 6px;
		font-size: 12px;
		line-height: 1.45;
		color: var(--color-muted);
	}

	:global(.pin-card-chips) {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 8px;
		padding: 0;
		list-style: none;
	}

	:global(.pin-card-chips li) {
		border: 1px solid var(--color-line);
		background: var(--color-paper-2);
		padding: 2px 6px;
		font-size: 11px;
		line-height: 1.3;
		color: var(--color-ink);
	}

	:global(.pin-card-more) {
		display: inline-flex;
		margin-top: 10px;
		border: 1px solid var(--color-ink);
		padding: 4px 8px;
		font-size: 12px;
		color: var(--color-ink);
		text-decoration: none;
	}

	:global(.pin-popup .leaflet-popup-content-wrapper) {
		border-radius: 2px;
		border: 1px solid var(--color-ink);
		background: var(--color-paper);
		color: var(--color-ink);
		box-shadow: 4px 4px 0 0 var(--color-ink);
	}

	:global(.pin-popup .leaflet-popup-content) {
		margin: 12px 14px 14px;
		font-family: var(--font-sans);
	}

	:global(.pin-popup .leaflet-popup-tip) {
		background: var(--color-paper);
		box-shadow: none;
	}

	:global(.pin-popup .leaflet-popup-close-button) {
		width: 22px;
		height: 22px;
		padding: 4px 0 0;
		font-size: 16px;
		color: var(--color-muted);
	}

	:global(.meet-active .leaflet-top.leaflet-left) {
		top: 3.25rem;
	}

	:global(.leaflet-bottom.leaflet-right) {
		margin-bottom: 2.5rem;
	}

	:global(.leaflet-control-attribution) {
		background: color-mix(in srgb, var(--color-paper) 88%, transparent);
		font-size: 10px;
	}

	:global {
		@keyframes pin-pulse-meet {
			0% {
				transform: scale(0.7);
				opacity: 1;
			}
			100% {
				transform: scale(3);
				opacity: 0;
			}
		}

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
