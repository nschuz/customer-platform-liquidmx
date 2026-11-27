<script lang="ts">
	import { onMount } from 'svelte';
	import CustomerCard from '#lib/components/CustomerCard.svelte';
	import CustomerFilters from '#lib/components/CustomerFilters.svelte';
	import CustomerTable from '#lib/components/CustomerTable.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorBanner from '#lib/components/ErrorBanner.svelte';
	import SearchInput from '#lib/components/SearchInput.svelte';
	import SkeletonLoader from '#lib/components/SkeletonLoader.svelte';
	import { customersStore } from '#lib/customers.svelte.ts';
	import { API_HOST, IS_MOCK_API } from '#lib/services/customerApi.ts';
	import type { StatusFilter } from '#lib/types/customer.ts';
	import { DISPLAY_TIME_ZONE } from '#lib/utils/formatters.ts';
	import { countByStatus, filterCustomers } from '#lib/utils/search.ts';

	const store = customersStore;

	// UI state: what the user typed and selected. The data itself lives in the store.
	let searchText = $state('');
	let query = $state('');
	let activeStatus = $state<StatusFilter>('ALL');

	// The counts follow the search only; the list also follows the status pill.
	const statusCounts = $derived(countByStatus(store.customers, query));
	const visibleCustomers = $derived(
		filterCustomers(store.customers, { query, status: activeStatus })
	);

	// Data is fetched in the browser, so the server only renders the shell with its skeletons.
	onMount(() => {
		void store.load();
	});

	function setStatusFilter(status: StatusFilter) {
		activeStatus = status;
	}

	function setQuery(value: string) {
		query = value;
	}

	function clearFilters() {
		activeStatus = 'ALL';
		searchText = ''; // the search box then reports the emptied query by itself
	}

	function retry() {
		void store.load();
	}
</script>

<svelte:head>
	<title>Customer Dashboard</title>
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
	<main class="flex-1">
		<header class="mb-6">
			<h1 class="text-2xl font-semibold text-ink">Customer Dashboard</h1>
			<p class="mt-1 text-muted">Consulta, filtra y busca los clientes de la plataforma.</p>
		</header>

		{#if !store.loading && !store.error}
			<section
				class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
				aria-label="Filtros y búsqueda"
			>
				<CustomerFilters active={activeStatus} counts={statusCounts} onChange={setStatusFilter} />
				<div class="w-full shrink-0 md:w-80">
					<SearchInput bind:text={searchText} onSearch={setQuery} />
				</div>
			</section>
		{/if}

		<!-- Announces changes to screen readers; it sits outside the busy region on purpose. -->
		<p class="sr-only" role="status">
			{#if store.loading}
				Cargando clientes…
			{:else if store.error}
				No se pudieron cargar los clientes.
			{:else}
				Clientes cargados
			{/if}
		</p>
		<section aria-label="Clientes" aria-busy={store.loading}>
			{#if store.loading}
				<SkeletonLoader variant="table" />
				<SkeletonLoader variant="cards" />
			{:else if store.error}
				<ErrorBanner error={store.error} onRetry={retry} />
			{:else if store.customers.length === 0}
				<EmptyState variant="no-customers" />
			{:else if visibleCustomers.length === 0}
				<EmptyState variant="no-results" onClearFilters={clearFilters} />
			{:else}
				<div class="hidden md:block">
					<CustomerTable customers={visibleCustomers} />
				</div>
				<ul class="space-y-3 md:hidden">
					{#each visibleCustomers as customer (customer.id)}
						<CustomerCard {customer} />
					{/each}
				</ul>
			{/if}
		</section>
	</main>

	<footer class="mt-8 text-xs text-muted">
		Fuente de datos: {IS_MOCK_API ? 'API simulada' : API_HOST} · Fechas en {DISPLAY_TIME_ZONE}
	</footer>
</div>
