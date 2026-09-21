<script lang="ts">
	let {
		open = false,
		title,
		body,
		confirmLabel = 'Confirm',
		danger = false,
		busy = false,
		oncancel,
		onconfirm
	}: {
		open?: boolean;
		title: string;
		body: string;
		confirmLabel?: string;
		danger?: boolean;
		busy?: boolean;
		oncancel: () => void;
		onconfirm: () => void;
	} = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
		<div class="w-full max-w-sm border border-ink bg-paper p-5 shadow-[4px_4px_0_0_var(--color-ink)]">
			<p class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{title}</p>
			<p class="mt-3 text-sm leading-6">{body}</p>
			<div class="mt-5 flex justify-end gap-2">
				<button
					type="button"
					class="border border-line px-4 py-2 text-sm text-muted hover:text-ink"
					disabled={busy}
					onclick={oncancel}
				>
					Cancel
				</button>
				<button
					type="button"
					class="border px-4 py-2 text-sm {danger
						? 'border-accent bg-accent text-paper'
						: 'border-ink bg-ink text-paper'}"
					disabled={busy}
					onclick={onconfirm}
				>
					{busy ? 'Working…' : confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
