<script lang="ts">
	const ROWS = 5;
	const bar = 'motion-safe:animate-pulse rounded bg-line';

	let { variant }: { variant: 'table' | 'cards' } = $props();
</script>

{#if variant === 'table'}
	<!-- The same shape as CustomerTable: a header row and five data rows. -->
	<div
		class="hidden overflow-hidden rounded-xl border border-line bg-surface md:block"
		aria-hidden="true"
	>
		<div
			class="grid grid-cols-[19fr_28fr_16fr_23fr_14fr] items-center gap-4 border-b border-line px-2 py-3.5 lg:px-4"
		>
			<span class="{bar} h-3"></span>
			<span class="{bar} h-3"></span>
			<span class="{bar} h-3 w-2/3"></span>
			<span class="{bar} h-3"></span>
			<span class="{bar} ml-auto h-3 w-2/3"></span>
		</div>
		{#each { length: ROWS } as _}
			<div
				class="grid grid-cols-[19fr_28fr_16fr_23fr_14fr] items-center gap-4 border-b border-line px-2 py-3.5 last:border-b-0 lg:px-4"
			>
				<span class="{bar} h-4 w-5/6"></span>
				<span class="{bar} h-4"></span>
				<span class="{bar} h-4 w-3/4 rounded-full"></span>
				<span class="{bar} h-4 w-11/12"></span>
				<span class="{bar} ml-auto h-6 w-3/4 rounded-lg"></span>
			</div>
		{/each}
	</div>
{:else}
	<ul class="space-y-3 md:hidden" aria-hidden="true">
		{#each { length: ROWS } as _}
			<li class="rounded-xl border border-line bg-surface p-4">
				<div class="flex items-center justify-between gap-3">
					<span class="{bar} h-4 w-2/5"></span>
					<span class="{bar} h-5 w-20 rounded-full"></span>
				</div>
				<span class="{bar} mt-1 block h-3 w-3/5"></span>
				<div class="mt-3 flex items-end justify-between gap-3">
					<span class="{bar} block h-3 w-2/5"></span>
					<span class="{bar} h-6 w-24 rounded-lg"></span>
				</div>
			</li>
		{/each}
	</ul>
{/if}
