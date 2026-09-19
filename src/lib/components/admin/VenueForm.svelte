<script lang="ts">
	import { untrack } from 'svelte';
	import Field from '$lib/components/admin/Field.svelte';
	import {
		DISTRICTS,
		datetimeLocalToIso,
		emptyOpeningHours,
		isoToDatetimeLocal,
		orderedWeekdays,
		slugify,
		weekdayLabel,
		type Announcement,
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
		lat: venue?.lat?.toString() ?? '',
		lng: venue?.lng?.toString() ?? '',
		isFeatured: venue?.isFeatured ?? false,
		featuredPriority: String(venue?.featuredPriority ?? 0),
		wifi: venue?.workInfo.wifi ?? true,
		wifiQuality: venue?.workInfo.wifi_quality ?? 'ok',
		outlets: venue?.workInfo.outlets ?? true,
		outletAccess: venue?.workInfo.outlet_access ?? 'some',
		laptopFriendly: venue?.workInfo.laptop_friendly ?? true,
		noiseLevel: venue?.workInfo.noise_level ?? 'moderate',
		workNotes: venue?.workInfo.notes ?? '',
		hours: venue?.openingHours ?? emptyOpeningHours(),
		phone: venue?.contact.phone ?? '',
		instagram: venue?.contact.instagram ?? '',
		website: venue?.contact.website ?? '',
		email: venue?.contact.email ?? '',
		googleMaps: venue?.contact.google_maps ?? '',
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
	let lat = $state(seed.lat);
	let lng = $state(seed.lng);
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
	let googleMaps = $state(seed.googleMaps);
	let menu = $state<DraftCategory[]>(seed.menu);
	let specials = $state<DraftSpecial[]>(seed.specials);
	let announcements = $state<DraftAnnouncement[]>(seed.announcements);

	const payload = $derived(
		JSON.stringify({
			name,
			slug: slugTouched ? slug : slugify(name),
			district,
			lat: lat.trim() === '' ? null : Number(lat),
			lng: lng.trim() === '' ? null : Number(lng),
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
			openingHours: hours,
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

	function copyMonday() {
		const monday = hours.monday ?? { open: '08:00', close: '17:00', closed: false };
		const next: OpeningHours = { ...hours };
		for (const day of orderedWeekdays()) {
			next[day] = { ...monday };
		}
		hours = next;
	}

	function setDay(day: Weekday, patch: Partial<NonNullable<OpeningHours[Weekday]>>) {
		hours = { ...hours, [day]: { open: '08:00', close: '17:00', closed: false, ...hours[day], ...patch } };
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
			<Field label="Latitude">
				<input class={field} inputmode="decimal" bind:value={lat} placeholder="-20.01" />
			</Field>
			<Field label="Longitude">
				<input class={field} inputmode="decimal" bind:value={lng} placeholder="57.58" />
			</Field>
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
		<ul class="mt-4 divide-y divide-line border-y border-line">
			{#each orderedWeekdays() as day (day)}
				<li class="grid grid-cols-[4.5rem_auto_1fr_1fr] items-center gap-3 py-2 text-sm">
					<span>{weekdayLabel(day)}</span>
					<label class="flex items-center gap-2 text-muted">
						<input
							type="checkbox"
							checked={hours[day]?.closed ?? false}
							onchange={(event) => setDay(day, { closed: event.currentTarget.checked })}
						/>
						Closed
					</label>
					<input
						class={field}
						type="time"
						disabled={hours[day]?.closed}
						value={hours[day]?.open ?? '08:00'}
						onchange={(event) => setDay(day, { open: event.currentTarget.value })}
					/>
					<input
						class={field}
						type="time"
						disabled={hours[day]?.closed}
						value={hours[day]?.close ?? '17:00'}
						onchange={(event) => setDay(day, { close: event.currentTarget.value })}
					/>
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
			<div class="sm:col-span-2">
				<Field label="Google Maps URL"><input class={field} bind:value={googleMaps} /></Field>
			</div>
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
