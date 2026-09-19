<script lang="ts">
	let { label, children }: { label: string; children: import('svelte').Snippet } = $props();
</script>

<label class="block">
	<span class="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</span>
	{@render children()}
</label>
