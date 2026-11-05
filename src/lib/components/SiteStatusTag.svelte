<script lang="ts">
	import { onMount } from 'svelte';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { siteSeverityStyle, type SiteSeverity } from '$lib/site-status';

	let {
		text,
		severity,
		persist = true
	}: { text: string; severity: SiteSeverity; persist?: boolean } = $props();

	let collapsed = $state(false);
	let collapseTimer = 0;
	const look = $derived(siteSeverityStyle(severity));
	const fingerprint = $derived(`${severity}\n${text}`);

	onMount(() => {
		const key = 'place-status-seen';
		if (persist && sessionStorage.getItem(key) === fingerprint) {
			collapsed = true;
			return;
		}
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		collapseTimer = window.setTimeout(() => {
			collapsed = true;
			if (persist) sessionStorage.setItem(key, fingerprint);
		}, 4000);
		return () => window.clearTimeout(collapseTimer);
	});

	function toggle() {
		window.clearTimeout(collapseTimer);
		collapsed = !collapsed;
		if (persist) sessionStorage.setItem('place-status-seen', fingerprint);
	}
</script>

<button
	type="button"
	class="inline-flex h-10 max-w-full shrink-0 items-center gap-2 overflow-hidden border px-2.5 text-sm transition-[max-width,padding,background-color] duration-300 ease-out {collapsed
		? 'w-10 justify-center px-0'
		: 'w-auto pr-3'}"
	style="color:{look.color};border-color:{look.color};background:{look.tint}"
	aria-expanded={!collapsed}
	aria-label={collapsed ? `Show status: ${text}` : `Collapse status: ${text}`}
	title={text}
	onclick={toggle}
>
	<TriangleAlert class="size-4 shrink-0" strokeWidth={2.25} />
	{#if !collapsed}
		<span class="truncate">{text}</span>
	{/if}
</button>
