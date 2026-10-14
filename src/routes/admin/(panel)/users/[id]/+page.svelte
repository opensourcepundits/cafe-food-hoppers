<script lang="ts">
	import { page } from '$app/state';
	import { formatMauritiusWhen } from '$lib/venue';

	let { data, form } = $props();
	let role = $state(form?.role || (data.account.role === 'superuser' ? 'user' : data.account.role));
	let venueId = $state(form ? form.venueId : (data.account.venueId ?? ''));
	let franchiseChoice = $state(form ? form.franchiseId : (data.account.franchiseId ?? ''));
	let franchiseName = $state(form?.franchiseName ?? '');
	let selectedPlaces = $state<string[]>(form?.placeIds ?? []);
	let placeQuery = $state('');
	const saved = $derived(page.url.searchParams.get('saved') === '1');
	const creatingFranchise = $derived(franchiseChoice === 'new');
	const placeNeedle = $derived(placeQuery.trim().toLowerCase());
	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';

	function placeMatches(place: { name: string; district: string; franchiseName: string | null }) {
		if (!placeNeedle) return true;
		return `${place.name} ${place.district} ${place.franchiseName ?? ''}`.toLowerCase().includes(placeNeedle);
	}

	const memberPlaces = $derived(
		creatingFranchise
			? []
			: data.places.filter((place) => place.franchiseId === franchiseChoice && placeMatches(place))
	);
	const availablePlaces = $derived(
		data.places.filter((place) => {
			if (!creatingFranchise && place.franchiseId === franchiseChoice) return false;
			return placeMatches(place) || selectedPlaces.includes(place.id);
		})
	);
</script>

<svelte:head>
	<title>{data.account.name} — Users</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a href="/admin/users" class="text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink">
	All users
</a>

<section class="mt-6">
	<p class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Account</p>
	<h3 class="mt-2 text-3xl font-semibold tracking-tight">{data.account.name}</h3>
	<p class="mt-2 text-sm text-muted">{data.account.email}</p>
	{#if data.account.phone}
		<p class="text-sm text-muted">{data.account.phone}</p>
	{/if}
	<p class="mt-3 text-sm">
		{#if data.account.role === 'place_manager'}
			Place manager{data.account.placeName ? ` · ${data.account.placeName}` : ''}
		{:else if data.account.role === 'franchise_manager'}
			Franchise manager{data.account.franchiseName ? ` · ${data.account.franchiseName}` : ''}
		{:else if data.account.role === 'superuser'}
			Superuser
		{:else}
			User
		{/if}
	</p>
</section>

{#if data.account.role === 'superuser'}
	<p class="mt-8 max-w-md border border-line px-4 py-3 text-sm">
		Superuser. This account is seeded and is not changed here.
	</p>
{:else}
	<form method="POST" action="?/role" class="mt-8 max-w-lg border border-line p-4">
		<label class="block text-sm">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Role</span>
			<select class={field} name="role" bind:value={role}>
				{#each data.roles as item (item.id)}
					<option value={item.id}>{item.label}</option>
				{/each}
			</select>
		</label>

		{#if role === 'place_manager'}
			<label class="mt-4 block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Their place</span>
				<select class={field} name="venueId" bind:value={venueId} required>
					<option value="">Choose a place</option>
					{#each data.places as place (place.id)}
						<option value={place.id}>{place.name} · {place.district}</option>
					{/each}
				</select>
			</label>
		{/if}

		{#if role === 'franchise_manager'}
			<label class="mt-4 block text-sm">
				<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Franchise</span>
				<select
					class={field}
					name="franchiseId"
					bind:value={franchiseChoice}
					required
					onchange={() => {
						selectedPlaces = [];
						placeQuery = '';
					}}
				>
					<option value="">Choose a franchise</option>
					<option value="new">Create a franchise</option>
					{#each data.franchises as group (group.id)}
						<option value={group.id}>{group.name}</option>
					{/each}
				</select>
			</label>

			{#if creatingFranchise || franchiseChoice}
				{#if creatingFranchise}
					<label class="mt-4 block text-sm">
						<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Franchise name</span>
						<input
							class={field}
							name="franchiseName"
							bind:value={franchiseName}
							maxlength="80"
							autocomplete="off"
							required
						/>
					</label>
				{/if}

				<fieldset class="mt-4">
					<legend class="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Places</legend>
					<p class="mt-1 text-sm text-muted">
						{creatingFranchise
							? 'Add existing places to this franchise.'
							: 'Add existing places. Ones already in this franchise stay checked.'}
					</p>
					{#if data.places.length > 6}
						<input
							class="{field} mt-3"
							type="search"
							placeholder="Filter places"
							bind:value={placeQuery}
							autocomplete="off"
							onkeydown={(event) => {
								if (event.key === 'Enter') event.preventDefault();
							}}
						/>
					{/if}
					{#if memberPlaces.length > 0 || availablePlaces.length > 0}
						<ul class="mt-3 max-h-64 divide-y divide-line overflow-y-auto border border-line">
							{#each memberPlaces as place (place.id)}
								<li>
									<label class="flex items-start gap-3 px-3 py-2 text-sm">
										<input type="checkbox" checked disabled />
										<span>
											<span class="block">{place.name}</span>
											<span class="text-muted">{place.district} · already in this franchise</span>
										</span>
									</label>
								</li>
							{/each}
							{#each availablePlaces as place (place.id)}
								<li>
									<label class="flex items-start gap-3 px-3 py-2 text-sm">
										<input type="checkbox" name="placeIds" value={place.id} bind:group={selectedPlaces} />
										<span>
											<span class="block">{place.name}</span>
											<span class="text-muted">
												{place.district}{place.franchiseName ? ` · currently ${place.franchiseName}` : ''}
											</span>
										</span>
									</label>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="mt-3 text-sm text-muted">
							{data.places.length === 0 ? 'No places yet.' : 'No places match.'}
						</p>
					{/if}
				</fieldset>
			{/if}
		{/if}

		<button type="submit" class="mt-4 border border-ink bg-ink px-4 py-2 text-sm text-paper">Update role</button>
		{#if form?.error}
			<p class="mt-3 border border-accent px-3 py-2 text-sm text-accent">{form.error}</p>
		{/if}
		{#if saved && !form?.error}
			<p class="mt-3 text-sm text-open">Role updated.</p>
		{/if}
	</form>
{/if}

<section class="mt-10">
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
		Comments · {data.comments.length}
	</h3>
	{#if data.comments.length === 0}
		<p class="mt-3 text-sm text-muted">No comments.</p>
	{:else}
		<ul class="mt-3 divide-y divide-line border-y border-line">
			{#each data.comments as comment (comment.id)}
				<li class="py-4">
					<a href="/venues/{comment.venueSlug}#comments" class="text-sm font-medium underline decoration-line underline-offset-4">
						{comment.venueName}
					</a>
					<p class="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
						{formatMauritiusWhen(comment.createdAt)}
					</p>
					<p class="mt-2 text-sm leading-6">{comment.body}</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
