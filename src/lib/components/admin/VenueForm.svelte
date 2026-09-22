<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Field from '$lib/components/admin/Field.svelte';
	import Dialog from '$lib/components/admin/Dialog.svelte';
	import BusyOverlay from '$lib/components/BusyOverlay.svelte';
	import ImageCarousel from '$lib/components/ImageCarousel.svelte';
	import {
		DISTRICTS,
		datetimeLocalToIso,
		emptyOpeningHours,
		isoToDatetimeLocal,
		mapsEmbedUrl,
		normalizeDayHours,
		normalizeOpeningHours,
		orderedWeekdays,
		parseMapsPin,
		slugify,
		weekdayLabel,
		type Announcement,
		type DayHours,
		type HourSpan,
		type MenuCategory,
		type MenuItem,
		type OpeningHours,
		type Special,
		type Venue,
		type VenueImage,
		type Weekday
	} from '$lib/venue';

	type DraftItem = MenuItem & { key: string };
	type DraftCategory = { key: string; category: string; items: DraftItem[] };
	type DraftSpecial = Special & { key: string; startsLocal: string; endsLocal: string };
	type DraftAnnouncement = Announcement & { key: string; startsLocal: string; endsLocal: string };

	let {
		venue = null,
		error = '',
		saved = false
	}: {
		venue?: Venue | null;
		error?: string;
		saved?: boolean;
	} = $props();

	const seed = untrack(() => ({
		slugTouched: Boolean(venue?.slug),
		name: venue?.name ?? '',
		slug: venue?.slug ?? '',
		district: venue?.district ?? DISTRICTS[0],
		googleMaps: venue?.contact.google_maps ?? '',
		isFeatured: venue?.isFeatured ?? false,
		featuredPriority: String(venue?.featuredPriority ?? 0),
		wifi: venue?.workInfo.wifi ?? true,
		wifiQuality: venue?.workInfo.wifi_quality ?? 'ok',
		outlets: venue?.workInfo.outlets ?? true,
		outletAccess: venue?.workInfo.outlet_access ?? 'some',
		laptopFriendly: venue?.workInfo.laptop_friendly ?? true,
		noiseLevel: venue?.workInfo.noise_level ?? 'moderate',
		niceView: venue?.workInfo.nice_view ?? false,
		ocean: venue?.workInfo.close_to_ocean ?? false,
		airConditioning: venue?.workInfo.air_conditioning ?? false,
		indoor: venue?.workInfo.indoor_seating ?? false,
		outdoor: venue?.workInfo.outdoor_seating ?? false,
		workNotes: venue?.workInfo.notes ?? '',
		hours: normalizeOpeningHours(venue?.openingHours ?? emptyOpeningHours()),
		phone: venue?.contact.phone ?? '',
		instagram: venue?.contact.instagram ?? '',
		website: venue?.contact.website ?? '',
		email: venue?.contact.email ?? '',
		menu: toMenu(venue?.menu),
		specials: toSpecials(venue?.specials),
		announcements: toAnnouncements(venue?.announcements),
		images: venue?.images ?? []
	}));

	const field =
		'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink disabled:opacity-50';
	const fieldCompact =
		'h-8 w-[6.75rem] border border-line bg-paper px-1.5 text-xs outline-none focus:border-ink disabled:opacity-50';
	const btnGhost =
		'border border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:border-ink hover:text-ink';
	const btnGhostSm =
		'border border-line bg-paper px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted hover:border-ink hover:text-ink';

	let slugTouched = $state(seed.slugTouched);
	let name = $state(seed.name);
	let slug = $state(seed.slug);
	let district = $state(seed.district);
	let googleMaps = $state(seed.googleMaps);
	let isFeatured = $state(seed.isFeatured);
	let featuredPriority = $state(seed.featuredPriority);
	let wifi = $state(seed.wifi);
	let wifiQuality = $state(seed.wifiQuality);
	let outlets = $state(seed.outlets);
	let outletAccess = $state(seed.outletAccess);
	let laptopFriendly = $state(seed.laptopFriendly);
	let noiseLevel = $state(seed.noiseLevel);
	let niceView = $state(seed.niceView);
	let ocean = $state(seed.ocean);
	let airConditioning = $state(seed.airConditioning);
	let indoor = $state(seed.indoor);
	let outdoor = $state(seed.outdoor);
	let workNotes = $state(seed.workNotes);
	let hours = $state<OpeningHours>(seed.hours);
	let phone = $state(seed.phone);
	let instagram = $state(seed.instagram);
	let website = $state(seed.website);
	let email = $state(seed.email);
	let menu = $state<DraftCategory[]>(seed.menu);
	let specials = $state<DraftSpecial[]>(seed.specials);
	let announcements = $state<DraftAnnouncement[]>(seed.announcements);
	let images = $state<VenueImage[]>(seed.images);
	let photoFiles = $state<File[]>([]);
	let fileInput = $state<HTMLInputElement | undefined>();
	let confirmSave = $state(false);
	let allowSubmit = $state(false);
	let saving = $state(false);
	let hideToast = $state(false);
	let formEl = $state<HTMLFormElement | undefined>();

	const photoSlots = $derived(images.length + photoFiles.length);
	const gallery = $derived<VenueImage[]>([
		...images,
		...photoFiles.map((file, index) => ({
			id: `draft-${index}`,
			url: previewUrl(file),
			path: ''
		}))
	]);

	const payload = $derived(
		JSON.stringify({
			name,
			slug: slugTouched ? slug : slugify(name),
			district,
			lat: parseMapsPin(googleMaps)?.lat ?? venue?.lat ?? null,
			lng: parseMapsPin(googleMaps)?.lng ?? venue?.lng ?? null,
			isFeatured,
			featuredPriority: Number(featuredPriority) || 0,
			workInfo: {
				wifi,
				wifi_quality: wifiQuality,
				outlets,
				outlet_access: outletAccess,
				laptop_friendly: laptopFriendly,
				noise_level: noiseLevel,
				nice_view: niceView,
				close_to_ocean: ocean,
				air_conditioning: airConditioning,
				indoor_seating: indoor,
				outdoor_seating: outdoor,
				notes: workNotes
			},
			openingHours: normalizeOpeningHours(hours),
			contact: { phone, instagram, website, email, google_maps: googleMaps },
			menu: menu.map((category) => ({
				category: category.category,
				items: category.items.map((item) => ({
					name: item.name,
					description: item.description,
					price_mur: Number(item.price_mur) || 0,
					tags: item.tags
				}))
			})),
			specials: specials.map((item) => ({
				id: item.id,
				title: item.title,
				body: item.body,
				starts_at: datetimeLocalToIso(item.startsLocal) ?? item.starts_at,
				ends_at: datetimeLocalToIso(item.endsLocal)
			})),
			announcements: announcements.map((item) => ({
				id: item.id,
				type: item.type,
				title: item.title,
				body: item.body,
				starts_at: datetimeLocalToIso(item.startsLocal) ?? item.starts_at,
				ends_at: datetimeLocalToIso(item.endsLocal)
			})),
			images
		})
	);

	function nid(): string {
		return crypto.randomUUID();
	}

	function toMenu(categories: MenuCategory[] | undefined): DraftCategory[] {
		if (!categories?.length) {
			return [{ key: nid(), category: 'Coffee', items: [emptyItem()] }];
		}
		return categories.map((category) => ({
			key: nid(),
			category: category.category,
			items: category.items.map((item) => ({ ...item, key: nid() }))
		}));
	}

	function toSpecials(items: Special[] | undefined): DraftSpecial[] {
		return (items ?? []).map((item) => ({
			...item,
			key: nid(),
			startsLocal: isoToDatetimeLocal(item.starts_at),
			endsLocal: isoToDatetimeLocal(item.ends_at)
		}));
	}

	function toAnnouncements(items: Announcement[] | undefined): DraftAnnouncement[] {
		return (items ?? []).map((item) => ({
			...item,
			key: nid(),
			startsLocal: isoToDatetimeLocal(item.starts_at),
			endsLocal: isoToDatetimeLocal(item.ends_at)
		}));
	}

	function emptyItem(): DraftItem {
		return { key: nid(), name: '', price_mur: 0, description: '', tags: [] };
	}

	function addCategory() {
		menu = [...menu, { key: nid(), category: '', items: [emptyItem()] }];
	}

	function removeCategory(key: string) {
		menu = menu.filter((category) => category.key !== key);
	}

	function addItem(key: string) {
		menu = menu.map((category) =>
			category.key === key ? { ...category, items: [...category.items, emptyItem()] } : category
		);
	}

	function removeItem(categoryKey: string, itemKey: string) {
		menu = menu.map((category) =>
			category.key === categoryKey
				? { ...category, items: category.items.filter((item) => item.key !== itemKey) }
				: category
		);
	}

	function addSpecial() {
		specials = [
			...specials,
			{
				key: nid(),
				id: nid(),
				title: '',
				body: '',
				starts_at: '',
				ends_at: null,
				startsLocal: '',
				endsLocal: ''
			}
		];
	}

	function addAnnouncement() {
		announcements = [
			...announcements,
			{
				key: nid(),
				id: nid(),
				type: 'notice',
				title: '',
				body: '',
				starts_at: '',
				ends_at: null,
				startsLocal: '',
				endsLocal: ''
			}
		];
	}

	const pin = $derived(
		parseMapsPin(googleMaps) ??
			(venue?.lat !== null && venue?.lat !== undefined && venue?.lng !== null && venue?.lng !== undefined
				? { lat: venue.lat, lng: venue.lng }
				: null)
	);

	function dayHours(day: Weekday): DayHours {
		return normalizeDayHours(hours[day]);
	}

	function setDayHours(day: Weekday, next: DayHours) {
		hours = { ...hours, [day]: normalizeDayHours(next) };
	}

	function copyMonday() {
		const monday = dayHours('monday');
		const next: OpeningHours = { ...hours };
		for (const weekday of orderedWeekdays()) {
			next[weekday] = { ...monday, spans: monday.spans?.map((span) => ({ ...span })) };
		}
		hours = next;
	}

	function setClosed(day: Weekday, closed: boolean) {
		setDayHours(day, { ...dayHours(day), closed });
	}

	function setSpan(day: Weekday, index: number, patch: Partial<HourSpan>) {
		const current = dayHours(day);
		const spans = (current.spans ?? []).map((span, spanIndex) =>
			spanIndex === index ? { ...span, ...patch } : span
		);
		setDayHours(day, { ...current, spans });
	}

	function addSpan(day: Weekday) {
		const current = dayHours(day);
		const last = current.spans?.[current.spans.length - 1];
		setDayHours(day, {
			...current,
			closed: false,
			spans: [...(current.spans ?? []), { open: last ? '18:00' : '08:00', close: last ? '21:00' : '17:00' }]
		});
	}

	function removeSpan(day: Weekday, index: number) {
		const current = dayHours(day);
		const spans = (current.spans ?? []).filter((_, spanIndex) => spanIndex !== index);
		setDayHours(day, { ...current, spans });
	}

	function addPhotos(list: FileList | null) {
		if (!list) return;
		const room = Math.max(0, 5 - photoSlots);
		photoFiles = [...photoFiles, ...Array.from(list).slice(0, room)];
		if (fileInput) fileInput.value = '';
	}

	function removeKept(id: string) {
		images = images.filter((image) => image.id !== id);
	}

	function removeFile(index: number) {
		photoFiles = photoFiles.filter((_, fileIndex) => fileIndex !== index);
	}

	function removeGallery(id: string) {
		if (id.startsWith('draft-')) {
			removeFile(Number(id.slice('draft-'.length)));
			return;
		}
		removeKept(id);
	}

	function previewUrl(file: File): string {
		return URL.createObjectURL(file);
	}

	function tagsValue(item: DraftItem): string {
		return item.tags?.join(', ') ?? '';
	}

	function setTags(categoryKey: string, itemKey: string, value: string) {
		menu = menu.map((category) =>
			category.key === categoryKey
				? {
						...category,
						items: category.items.map((item) =>
							item.key === itemKey
								? {
										...item,
										tags: value
											.split(',')
											.map((tag) => tag.trim())
											.filter(Boolean)
									}
								: item
						)
					}
				: category
		);
	}
</script>

{#if error}
	<p class="mb-6 border border-accent bg-paper px-4 py-3 text-sm text-accent">{error}</p>
{/if}

{#if saved && !hideToast}
	<div class="fixed right-4 bottom-4 z-30 border border-open bg-paper px-4 py-3 text-sm text-open shadow-[4px_4px_0_0_var(--color-ink)]">
		Place saved.
		<button type="button" class="ml-3 text-muted hover:text-ink" onclick={() => (hideToast = true)}>Close</button>
	</div>
{/if}

<BusyOverlay show={saving} label="Saving place…" />

<Dialog
	open={confirmSave}
	title="Save place"
	body="Save these changes to the directory?"
	confirmLabel="Save"
	oncancel={() => (confirmSave = false)}
	onconfirm={() => {
		allowSubmit = true;
		confirmSave = false;
		formEl?.requestSubmit();
	}}
/>

<form
	bind:this={formEl}
	method="POST"
	action="?/save"
	enctype="multipart/form-data"
	class="space-y-10"
	use:enhance={({ formData, cancel }) => {
		if (!allowSubmit) {
			cancel();
			confirmSave = true;
			return;
		}
		for (const file of photoFiles) formData.append('photos', file);
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
			allowSubmit = false;
		};
	}}
>
	<input type="hidden" name="payload" value={payload} />

	<section>
		<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Place</h3>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<Field label="Name">
				<input
					class={field}
					value={name}
					oninput={(event) => {
						name = event.currentTarget.value;
						if (!slugTouched) slug = slugify(name);
					}}
					required
				/>
			</Field>
			<Field label="Slug">
				<input
					class={field}
					value={slug}
					oninput={(event) => {
						slugTouched = true;
						slug = event.currentTarget.value;
					}}
				/>
			</Field>
			<Field label="District">
				<input class={field} list="districts" bind:value={district} />
				<datalist id="districts">
					{#each DISTRICTS as item (item)}
						<option value={item}></option>
					{/each}
				</datalist>
			</Field>
			<Field label="Featured priority">
				<input class={field} type="number" bind:value={featuredPriority} />
			</Field>
			<div class="sm:col-span-2">
				<Field label="Google Maps pin">
					<input
						class={field}
						bind:value={googleMaps}
						placeholder="Paste a Google Maps place or pin link"
					/>
				</Field>
				<p class="mt-1 text-xs text-muted">
					Open the place in Google Maps, copy the share link, and paste it here.
				</p>
				{#if pin}
					<iframe
						title="Map pin"
						class="mt-3 h-56 w-full border border-line"
						src={mapsEmbedUrl(pin.lat, pin.lng)}
						loading="lazy"
						referrerpolicy="no-referrer-when-downgrade"
					></iframe>
				{:else if googleMaps.trim()}
					<p class="mt-2 text-xs text-muted">
						Link saved. If the pin preview is missing, open the place and copy the full Maps URL instead of a short link.
					</p>
				{/if}
			</div>
		</div>
		<label class="mt-4 flex cursor-pointer items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={isFeatured} />
			Featured placement
		</label>
	</section>

	<section>
		<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Work setup</h3>
		<div class="mt-4 flex flex-wrap gap-4 text-sm">
			<label class="flex items-center gap-2"><input type="checkbox" bind:checked={wifi} /> WiFi</label>
			<label class="flex items-center gap-2"><input type="checkbox" bind:checked={outlets} /> Outlets</label>
			<label class="flex items-center gap-2"
				><input type="checkbox" bind:checked={laptopFriendly} /> Laptop friendly</label
			>
		</div>
		<div class="mt-4 flex flex-wrap gap-4 text-sm">
			<label class="flex items-center gap-2"><input type="checkbox" bind:checked={niceView} /> Nice view</label>
			<label class="flex items-center gap-2"><input type="checkbox" bind:checked={ocean} /> Close to ocean</label>
			<label class="flex items-center gap-2"><input type="checkbox" bind:checked={airConditioning} /> A/C</label>
			<label class="flex items-center gap-2"><input type="checkbox" bind:checked={indoor} /> Indoor seating</label>
			<label class="flex items-center gap-2"><input type="checkbox" bind:checked={outdoor} /> Outdoor seating</label>
		</div>
		<div class="mt-4 grid gap-4 sm:grid-cols-3">
			<Field label="WiFi quality">
				<select class={field} bind:value={wifiQuality}>
					<option value="fast">Fast</option>
					<option value="ok">OK</option>
					<option value="slow">Slow</option>
				</select>
			</Field>
			<Field label="Outlet access">
				<select class={field} bind:value={outletAccess}>
					<option value="plenty">Plenty</option>
					<option value="some">Some</option>
					<option value="none">None</option>
				</select>
			</Field>
			<Field label="Noise">
				<select class={field} bind:value={noiseLevel}>
					<option value="quiet">Quiet</option>
					<option value="moderate">Moderate</option>
					<option value="loud">Loud</option>
				</select>
			</Field>
		</div>
		<div class="mt-4">
			<Field label="Notes">
				<textarea class="{field} min-h-20" bind:value={workNotes}></textarea>
			</Field>
		</div>
	</section>

	<section>
		<div class="flex items-end justify-between gap-4">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Hours</h3>
			<button type="button" class={btnGhost} onclick={copyMonday}>Copy Monday to all days</button>
		</div>
		<p class="mt-2 text-xs text-muted">
			Add hours for a second sitting, for example 09:00–14:00 then 18:00–21:00.
		</p>
		<ul class="mt-3 w-fit max-w-full divide-y divide-line border-y border-line">
			{#each orderedWeekdays() as day (day)}
				{@const slot = dayHours(day)}
				<li class="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 pr-2 text-xs">
					<span class="w-8 shrink-0 font-medium">{weekdayLabel(day)}</span>
					<label class="flex items-center gap-1 text-muted">
						<input
							class="size-3.5"
							type="checkbox"
							checked={slot.closed ?? false}
							onchange={(event) => setClosed(day, event.currentTarget.checked)}
						/>
						Closed
					</label>
					{#if !slot.closed}
						{#each slot.spans ?? [] as span, index (index)}
							<input
								class={fieldCompact}
								type="time"
								value={span.open}
								onchange={(event) => setSpan(day, index, { open: event.currentTarget.value })}
							/>
							<span class="text-muted">–</span>
							<input
								class={fieldCompact}
								type="time"
								value={span.close}
								onchange={(event) => setSpan(day, index, { close: event.currentTarget.value })}
							/>
							{#if (slot.spans?.length ?? 0) > 1}
								<button type="button" class={btnGhostSm} onclick={() => removeSpan(day, index)}>×</button>
							{/if}
						{/each}
						<button type="button" class={btnGhostSm} onclick={() => addSpan(day)}>+ hours</button>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<section>
		<div class="flex items-end justify-between gap-4">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Photos</h3>
			<span class="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{photoSlots} / 5</span>
		</div>
		<p class="mt-2 text-xs text-muted">JPEG, PNG, WebP, or GIF. Max 5 images, 4 MB each. Stored under the place slug in the venue-images bucket.</p>
		<div class="mt-4 max-w-xl">
			<ImageCarousel images={gallery} alt={name || 'Place'} onremove={removeGallery} />
		</div>
		{#if photoSlots < 5}
			<label class="{btnGhost} mt-3 inline-flex cursor-pointer items-center">
				Add photos
				<input
					bind:this={fileInput}
					class="sr-only"
					type="file"
					accept="image/jpeg,image/png,image/webp,image/gif"
					multiple
					onchange={(event) => addPhotos(event.currentTarget.files)}
				/>
			</label>
		{/if}
	</section>

	<section>
		<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Contact</h3>
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<Field label="Phone"><input class={field} bind:value={phone} /></Field>
			<Field label="Instagram"><input class={field} bind:value={instagram} placeholder="handle" /></Field>
			<Field label="Website"><input class={field} bind:value={website} /></Field>
			<Field label="Email"><input class={field} type="email" bind:value={email} /></Field>
		</div>
	</section>

	<section>
		<div class="flex items-end justify-between gap-4">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Menu</h3>
			<button type="button" class={btnGhost} onclick={addCategory}>Add category</button>
		</div>
		<div class="mt-4 space-y-6">
			{#each menu as category (category.key)}
				<div class="border border-line p-4">
					<div class="flex items-end gap-3">
						<div class="flex-1">
							<Field label="Category">
								<input class={field} bind:value={category.category} />
							</Field>
						</div>
						<button type="button" class={btnGhost} onclick={() => removeCategory(category.key)}>Remove</button>
					</div>
					<ul class="mt-4 space-y-3">
						{#each category.items as item (item.key)}
							<li class="grid gap-2 border border-line p-3 sm:grid-cols-[1fr_1fr_6rem_auto]">
								<input class={field} placeholder="Item" bind:value={item.name} />
								<input class={field} placeholder="Description" bind:value={item.description} />
								<input
									class={field}
									type="number"
									min="0"
									step="1"
									placeholder="Rs"
									bind:value={item.price_mur}
								/>
								<button type="button" class={btnGhost} onclick={() => removeItem(category.key, item.key)}
									>Remove</button
								>
								<div class="sm:col-span-4">
									<input
										class={field}
										placeholder="Tags, comma separated"
										value={tagsValue(item)}
										oninput={(event) => setTags(category.key, item.key, event.currentTarget.value)}
									/>
								</div>
							</li>
						{/each}
					</ul>
					<button type="button" class="{btnGhost} mt-3" onclick={() => addItem(category.key)}>Add item</button>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<div class="flex items-end justify-between gap-4">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Specials</h3>
			<button type="button" class={btnGhost} onclick={addSpecial}>Add special</button>
		</div>
		<ul class="mt-4 space-y-3">
			{#each specials as special (special.key)}
				<li class="grid gap-3 border border-line p-4">
					<input class={field} placeholder="Title" bind:value={special.title} />
					<textarea class="{field} min-h-20" placeholder="Details" bind:value={special.body}></textarea>
					<div class="grid gap-3 sm:grid-cols-2">
						<Field label="Starts">
							<input class={field} type="datetime-local" bind:value={special.startsLocal} />
						</Field>
						<Field label="Ends">
							<input class={field} type="datetime-local" bind:value={special.endsLocal} />
						</Field>
					</div>
					<button
						type="button"
						class="{btnGhost} w-fit"
						onclick={() => (specials = specials.filter((item) => item.key !== special.key))}>Remove</button
					>
				</li>
			{/each}
		</ul>
	</section>

	<section>
		<div class="flex items-end justify-between gap-4">
			<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Alerts</h3>
			<button type="button" class={btnGhost} onclick={addAnnouncement}>Add alert</button>
		</div>
		<ul class="mt-4 space-y-3">
			{#each announcements as alert (alert.key)}
				<li class="grid gap-3 border border-line p-4">
					<select class={field} bind:value={alert.type}>
						{#each ['notice', 'event', 'closure', 'alert'] as type (type)}
							<option value={type}>{type}</option>
						{/each}
					</select>
					<input class={field} placeholder="Title" bind:value={alert.title} />
					<textarea class="{field} min-h-20" placeholder="Details" bind:value={alert.body}></textarea>
					<div class="grid gap-3 sm:grid-cols-2">
						<Field label="Starts">
							<input class={field} type="datetime-local" bind:value={alert.startsLocal} />
						</Field>
						<Field label="Ends">
							<input class={field} type="datetime-local" bind:value={alert.endsLocal} />
						</Field>
					</div>
					<button
						type="button"
						class="{btnGhost} w-fit"
						onclick={() => (announcements = announcements.filter((item) => item.key !== alert.key))}
						>Remove</button
					>
				</li>
			{/each}
		</ul>
	</section>

	<div class="sticky bottom-0 flex gap-3 border-t border-line bg-paper py-4">
		<button type="submit" class="border border-ink bg-ink px-5 py-2 text-sm text-paper">Save place</button>
		<a href="/admin" class="border border-line px-5 py-2 text-sm text-muted hover:text-ink">Cancel</a>
	</div>
</form>
