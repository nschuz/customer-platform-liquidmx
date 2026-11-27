<script lang="ts">
	const DEBOUNCE_MS = 200;

	let { text = $bindable(''), onSearch }: {
		text?: string;
		onSearch: (query: string) => void;
	} = $props();

	// The effect runs again on every change of `text` and cancels the timer it set before,
	// which is the debounce. An emptied search is reported at once so the list is restored.
	let lastQuery = text;
	$effect(() => {
		const query = text.trim();
		if (query === lastQuery) return;
		if (query === '') {
			lastQuery = '';
			onSearch('');
			return;
		}
		const timer = setTimeout(() => {
			lastQuery = query;
			onSearch(query);
		}, DEBOUNCE_MS);
		return () => clearTimeout(timer);
	});
</script>

<search class="relative block">
	<label class="sr-only" for="customer-search">Buscar cliente</label>
	<svg
		class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		aria-hidden="true"
	>
		<circle cx="11" cy="11" r="7" />
		<path d="m20 20-3.5-3.5" />
	</svg>
	<input
		id="customer-search"
		type="text"
		role="searchbox"
		autocomplete="off"
		placeholder="Buscar por nombre o email"
		class="w-full rounded-lg border border-line bg-surface py-1.5 pr-9 pl-9 text-sm text-ink placeholder:text-muted"
		bind:value={text}
	/>
	{#if text !== ''}
		<button
			type="button"
			class="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-muted hover:text-ink"
			aria-label="Limpiar búsqueda"
			onclick={() => (text = '')}
		>
			<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
		</button>
	{/if}
</search>
