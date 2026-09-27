<script lang="ts">
	import { menuPriceColumns, mur, priceForLabel, type MenuCategory, type MenuItem } from '$lib/venue';

	let { menu }: { menu: MenuCategory[] } = $props();
</script>

{#snippet menuItemText(item: MenuItem)}
	<p class="text-sm">{item.name}</p>
	{#if item.description}
		<p class="mt-0.5 text-xs leading-5 text-muted">{item.description}</p>
	{/if}
	{#if item.tags?.length}
		<p class="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
			{item.tags.join(' · ')}
		</p>
	{/if}
{/snippet}

{#if menu.length === 0}
	<p class="mt-4 text-sm text-muted">No menu listed yet.</p>
{:else}
	<div class="mt-4 space-y-8">
		{#each menu as category (category.category)}
			{@const columns = menuPriceColumns(category)}
			<div>
				<h4 class="text-base font-medium">{category.category}</h4>
				{#if columns}
					<div class="mt-3 overflow-x-auto border-y border-line">
						<table class="w-full border-collapse">
							<thead>
								<tr class="border-b border-line">
									<th class="py-2 pr-4 text-left font-normal"><span class="sr-only">Item</span></th>
									{#each columns as label (label || 'price')}
										<th
											class="px-3 py-2 text-right font-mono text-[10px] font-normal tracking-[0.14em] whitespace-nowrap text-muted"
										>
											{label || 'Price'}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each category.items as item (item.name)}
									<tr class="border-t border-line first:border-t-0">
										<td class="py-3 pr-4 align-baseline">{@render menuItemText(item)}</td>
										{#each columns as label (label || 'price')}
											{@const amount = priceForLabel(item, label)}
											<td class="px-3 py-3 text-right align-baseline font-mono text-sm whitespace-nowrap tabular-nums">
												{#if amount !== null}{mur(amount)}{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<ul class="mt-3 divide-y divide-line border-y border-line">
						{#each category.items as item (item.name)}
							<li class="flex items-baseline justify-between gap-4 py-3">
								<div>
									{@render menuItemText(item)}
								</div>
								<p class="shrink-0 font-mono text-sm tabular-nums">{mur(item.price_mur)}</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</div>
{/if}
