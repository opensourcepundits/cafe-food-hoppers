<script lang="ts">
	let { show = false, label = 'Saving…' }: { show?: boolean; label?: string } = $props();
</script>

{#if show}
	<div class="fixed inset-0 z-40 flex items-center justify-center bg-paper/80">
		<div class="flex items-center gap-3 border border-ink bg-paper px-4 py-3">
			<span class="loader" aria-hidden="true"></span>
			<span class="font-mono text-[11px] uppercase tracking-[0.16em]">{label}</span>
		</div>
	</div>
{/if}
