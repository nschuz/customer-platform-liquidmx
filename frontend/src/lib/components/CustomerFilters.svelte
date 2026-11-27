<script lang="ts">
	import { STATUS_FILTERS, STATUS_FILTER_LABELS, type StatusFilter } from '#lib/types/customer.ts';
	import type { StatusCounts } from '#lib/utils/search.ts';

	let { active, counts, onChange }: {
		active: StatusFilter;
		counts: StatusCounts;
		onChange: (status: StatusFilter) => void;
	} = $props();
</script>

<div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
	{#each STATUS_FILTERS as filter (filter)}
		<button
			type="button"
			aria-pressed={active === filter}
			class="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors {active ===
			filter
				? 'border-ink bg-ink text-white'
				: 'border-line bg-surface text-ink hover:bg-page'}"
			onclick={() => onChange(filter)}
		>
			{STATUS_FILTER_LABELS[filter]}
			<span
				class="ml-1.5 rounded-full px-1.5 text-xs {active === filter ? 'bg-white/15 text-white' : 'bg-page text-muted'}"
			>
				{counts[filter]}
			</span>
		</button>
	{/each}
</div>
