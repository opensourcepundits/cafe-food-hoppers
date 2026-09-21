<script lang="ts">
	import { untrack } from 'svelte';
	import Field from '$lib/components/admin/Field.svelte';
	import {
		DISTRICTS,
		datetimeLocalToIso,
		emptyOpeningHours,
		isoToDatetimeLocal,
		mapsEmbedUrl,
		mapsPinForVenue,
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
		googleMaps: venue ? mapsPinForVenue(venue) : '',
		isFeatured: venue?.isFeatured ?? false,
		featuredPriority: String(venue?.featuredPriority ?? 0),
		wifi: venue?.workInfo.wifi ?? true,
		wifiQuality: venue?.workInfo.wifi_quality ?? 'ok',
		outlets: venue?.workInfo.outlets ?? true,
		outletAccess: venue?.workInfo.outlet_access ?? 'some',
		laptopFriendly: venue?.workInfo.laptop_friendly ?? true,
		noiseLevel: venue?.workInfo.noise_level ?? 'moderate',
		workNotes: venue?.workInfo.notes ?? '',
		hours: normalizeOpeningHours(venue?.openingHours ?? emptyOpeningHours()),
		phone: venue?.contact.phone ?? '',
		instagram: venue?.contact.instagram ?? '',
		website: venue?.contact.website ?? '',
		email: venue?.contact.email ?? '',
		menu: toMenu(venue?.menu),
		specials: toSpecials(venue?.specials),
		announcements: toAnnouncements(venue?.announcements)
	}));

	const field =
		'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink disabled:opacity-50';
	const btnGhost =
		'border border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:border-ink hover:text-ink';

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
	let workNotes = $state(seed.workNotes);
	let hours = $state<OpeningHours>(seed.hours);
	let phone = $state(seed.phone);
	let instagram = $state(seed.instagram);
	let website = $state(seed.website);
	let email = $state(seed.email);
	let menu = $state<DraftCategory[]>(seed.menu);
	let specials = $state<DraftSpecial[]>(seed.specials);
	let announcements = $state<DraftAnnouncement[]>(seed.announcements);

	const payload = $derived(
		JSON.stringify({
			name,
			slug: slugTouched ? slug : slugify(name),
			district,
			lat: googleMaps.trim() ? (parseMapsPin(googleMaps)?.lat ?? venue?.lat ?? null) : null,
			lng: googleMaps.trim() ? (parseMapsPin(googleMaps)?.lng ?? venue?.lng ?? null) : null,
			isFeatured,
			featuredPriority: Number(featuredPriority) || 0,
			workInfo: {
				wifi,
				wifi_quality: wifiQuality,
				outlets,
				outlet_access: outletAccess,
				laptop_friendly: laptopFriendly,
				noise_level: noiseLevel,
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
			}))
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

	const pin = $derived(parseMapsPin(googleMaps));

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
{#if saved}
	<p class="mb-6 border border-open px-4 py-3 text-sm text-open">Saved.</p>
{/if}

<form method="POST" class="space-y-10">
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
		<ul class="mt-4 divide-y divide-line border-y border-line">
			{#each orderedWeekdays() as day (day)}
				{@const slot = dayHours(day)}
				<li class="grid gap-3 py-3 text-sm sm:grid-cols-[4.5rem_1fr]">
					<span class="pt-2">{weekdayLabel(day)}</span>
					<div>
						<label class="flex items-center gap-2 text-muted">
							<input
								type="checkbox"
								checked={slot.closed ?? false}
								onchange={(event) => setClosed(day, event.currentTarget.checked)}
							/>
							Closed
						</label>
						{#if !slot.closed}
							<ul class="mt-2 space-y-2">
								{#each slot.spans ?? [] as span, index (index)}
									<li class="flex flex-wrap items-center gap-2">
										<input
											class="{field} w-[8.5rem]"
											type="time"
											value={span.open}
											onchange={(event) => setSpan(day, index, { open: event.currentTarget.value })}
										/>
										<span class="text-muted">to</span>
										<input
											class="{field} w-[8.5rem]"
											type="time"
											value={span.close}
											onchange={(event) => setSpan(day, index, { close: event.currentTarget.value })}
										/>
										{#if (slot.spans?.length ?? 0) > 1}
											<button type="button" class={btnGhost} onclick={() => removeSpan(day, index)}
												>Remove</button
											>
										{/if}
									</li>
								{/each}
							</ul>
							<button type="button" class="{btnGhost} mt-2" onclick={() => addSpan(day)}>Add hours</button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
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
