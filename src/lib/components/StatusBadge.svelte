<script lang="ts">
	let { status, alert }: { status: 'open' | 'closed'; alert?: boolean } = $props();
</script>

<span
	class="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em]"
	class:text-open={status === 'open' && !alert}
	class:text-accent={alert}
	class:text-closed={status === 'closed' && !alert}
>
	<span class="size-1.5 rounded-full bg-current"></span>
	{alert ? 'Alert' : status === 'open' ? 'Open' : 'Closed'}
</span>
