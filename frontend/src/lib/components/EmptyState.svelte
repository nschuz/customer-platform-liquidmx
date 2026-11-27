<script lang="ts">
	const COPY = {
		'no-customers': {
			title: 'No hay clientes registrados',
			hint: 'Todavía no se ha dado de alta ningún cliente.'
		},
		'no-results': {
			title: 'Sin resultados',
			hint: 'Ningún cliente coincide con la búsqueda o el filtro actuales.'
		}
	} as const;

	let { variant, onClearFilters }: {
		variant: keyof typeof COPY;
		onClearFilters?: () => void;
	} = $props();
</script>

<div class="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
	<h2 class="text-lg font-semibold text-ink">{COPY[variant].title}</h2>
	<p class="mt-1 text-sm text-muted">{COPY[variant].hint}</p>
	{#if onClearFilters}
		<button
			type="button"
			class="mt-5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-page"
			onclick={onClearFilters}
		>
			Limpiar filtros
		</button>
	{/if}
</div>
