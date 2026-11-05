<script lang="ts">
	import SiteStatusTag from '$lib/components/SiteStatusTag.svelte';
	import { SITE_SEVERITIES, type SiteSeverity } from '$lib/site-status';

	let { data, form } = $props();

	let active = $state(Boolean(form?.active ?? data.status.active));
	let text = $state(String(form?.text ?? data.status.text));
	let severity = $state<SiteSeverity>(
		SITE_SEVERITIES.some((item) => item.id === form?.severity) ? (form?.severity as SiteSeverity) : data.status.severity
	);

	const field = 'w-full border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink';
	const previewSeverity = $derived(
		SITE_SEVERITIES.some((item) => item.id === severity) ? severity : data.status.severity
	);
</script>

<svelte:head>
	<title>Status — Admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="max-w-xl">
	<h3 class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Site status</h3>
	<p class="mt-3 text-sm text-muted">
		Shown on every page. The message stays open for a few seconds, then collapses into the warning sign. People can open it again. Change the message for anything other than a curfew.
	</p>
	{#if data.saved}
		<p class="mt-3 text-sm">Status saved.</p>
	{/if}
	{#if form?.error}
		<p class="mt-3 text-sm text-accent">{form.error}</p>
	{/if}

	<form method="POST" action="?/save" class="mt-5 grid gap-4">
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" name="active" bind:checked={active} />
			Show on the site
		</label>
		<label class="block">
			<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Message</span>
			<input class={field} name="text" bind:value={text} maxlength="80" required />
		</label>
		<fieldset>
			<legend class="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Severity</legend>
			<div class="grid gap-2">
				{#each SITE_SEVERITIES as item (item.id)}
					<label class="flex items-center gap-3 border border-line px-3 py-2 text-sm">
						<input type="radio" name="severity" value={item.id} bind:group={severity} />
						<span class="size-3 shrink-0 border" style="background:{item.color};border-color:{item.color}"></span>
						<span>{item.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<div>
			<p class="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Preview</p>
			{#if text.trim()}
				{#key previewSeverity + text}
					<SiteStatusTag text={text.trim()} severity={previewSeverity} persist={false} />
				{/key}
			{/if}
		</div>
		<button type="submit" class="w-fit border border-ink bg-ink px-4 py-2 text-sm text-paper">Save status</button>
	</form>
</section>
