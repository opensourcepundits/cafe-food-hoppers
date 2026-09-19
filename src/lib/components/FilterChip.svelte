<script lang="ts">
	let {
		name,
		checked,
		children
	}: {
		name: string;
		checked: boolean;
		children: import('svelte').Snippet;
	} = $props();
</script>

<label class="cursor-pointer">
	<input
		type="checkbox"
		{name}
		value="1"
		{checked}
		onchange={(event) => event.currentTarget.form?.requestSubmit()}
		class="peer sr-only"
	/>
	<span
		class="inline-block border border-line bg-paper px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper"
	>
		{@render children()}
	</span>
</label>
