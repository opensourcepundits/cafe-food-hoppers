<script lang="ts">
	import { untrack } from 'svelte';
	import type { AccountKind, CreatedPlace, RegisteredAccount } from '$lib/server/auth';

	let {
		person,
		places,
		error = ''
	}: {
		person: RegisteredAccount;
		places: CreatedPlace[];
		error?: string;
	} = $props();

	let kind = $state<AccountKind>(untrack(() => person.kind));
	let venueId = $state(untrack(() => person.venueId ?? ''));

	const assigned = $derived(
		person.kind === 'shop'
			? places.filter((place) => person.managedVenueIds.includes(place.id))
			: person.kind === 'placement'
				? places.filter((place) => place.id === person.venueId)
				: person.places
	);
	const listLabel = $derived(person.kind === 'standard' ? 'Places created' : 'Placements');
</script>

<li class="border border-line">
	<form method="POST" action="?/access" class="border-b border-line px-4 py-4">
		<input type="hidden" name="userId" value={person.id} />
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="font-medium">{person.email}</p>
				<p class="mt-1 text-sm text-muted">{person.phone ?? 'No phone'}</p>
				<p class="mt-1 font-mono text-[11px] text-muted">
					Joined {person.joinedAt}
					· Last sign-in {person.lastSeenAt ?? '—'}
				</p>
			</div>
			<label class="block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Account</span>
				<select
					name="kind"
					bind:value={kind}
					class="border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
				>
					<option value="standard">Standard</option>
					<option value="shop">Shop</option>
					<option value="placement">Placement</option>
				</select>
			</label>
		</div>

		{#if kind === 'standard'}
			<div class="mt-4 flex flex-wrap items-center gap-4 text-sm">
				<label class="flex items-center gap-2">
					<input type="checkbox" name="canCreate" value="1" checked={person.canCreate} />
					Creator
				</label>
				<label class="flex items-center gap-2">
					<input type="checkbox" name="canEdit" value="1" checked={person.canEdit} />
					Editor
				</label>
			</div>
		{:else if kind === 'shop'}
			<fieldset class="mt-4">
				<legend class="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Placements this shop can edit</legend>
				{#if places.length === 0}
					<p class="mt-2 text-sm text-muted">No places exist yet.</p>
				{:else}
					<div class="mt-2 grid max-h-48 gap-2 overflow-y-auto text-sm sm:grid-cols-2">
						{#each places as place (place.id)}
							<label class="flex items-start gap-2">
								<input
									type="checkbox"
									name="venueIds"
									value={place.id}
									checked={person.managedVenueIds.includes(place.id)}
								/>
								<span>{place.name} <span class="text-muted">· {place.district}</span></span>
							</label>
						{/each}
					</div>
				{/if}
			</fieldset>
		{:else}
			<label class="mt-4 block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Their placement</span>
				<select
					name="venueId"
					bind:value={venueId}
					class="w-full max-w-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
				>
					<option value="">Choose a place</option>
					{#each places as place (place.id)}
						<option value={place.id}>{place.name} · {place.district}</option>
					{/each}
				</select>
			</label>
		{/if}

		<button type="submit" class="mt-4 border border-ink bg-ink px-3 py-1.5 text-sm text-paper">Save access</button>
		{#if error}
			<p class="mt-3 border border-accent px-3 py-2 text-sm text-accent">{error}</p>
		{/if}
	</form>
	<div class="px-4 py-3">
		<p class="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
			{listLabel} · {assigned.length}
		</p>
		{#if assigned.length === 0}
			<p class="mt-2 text-sm text-muted">{person.kind === 'standard' ? 'No places yet.' : 'None assigned.'}</p>
		{:else}
			<ul class="mt-2 divide-y divide-line border-y border-line text-sm">
				{#each assigned as place (place.id)}
					<li class="flex items-baseline justify-between gap-3 py-2">
						<a href="/admin/venues/{place.id}" class="underline decoration-line underline-offset-4 hover:text-ink">
							{place.name}
						</a>
						<span class="text-muted">{place.district}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</li>
