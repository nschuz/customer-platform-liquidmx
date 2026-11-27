<script lang="ts">
	import { onMount, tick } from 'svelte';
	import CustomerCard from '#lib/components/CustomerCard.svelte';
	import CustomerDetailDrawer from '#lib/components/CustomerDetailDrawer.svelte';
	import CustomerFilters from '#lib/components/CustomerFilters.svelte';
	import CustomerTable from '#lib/components/CustomerTable.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorBanner from '#lib/components/ErrorBanner.svelte';
	import SearchInput from '#lib/components/SearchInput.svelte';
	import SkeletonLoader from '#lib/components/SkeletonLoader.svelte';
	import { customersStore } from '#lib/customers.svelte.ts';
	import { API_HOST, IS_MOCK_API } from '#lib/services/customerApi.ts';
	import type { Customer, StatusFilter } from '#lib/types/customer.ts';
	import { DISPLAY_TIME_ZONE } from '#lib/utils/formatters.ts';
	import { countByStatus, filterCustomers } from '#lib/utils/search.ts';

	const store = customersStore;

	// UI state: what the user typed, selected and opened. The data itself lives in the store.
	let searchText = $state('');
	let query = $state('');
	let activeStatus = $state<StatusFilter>('ALL');
	let selectedId = $state<string | null>(null);
	/** The "Ver detalle" button that opened the drawer. It gets the focus back when it closes. */
	let detailOpener: HTMLElement | null = null;

	// The counts follow the search only; the list also follows the status pill.
	const statusCounts = $derived(countByStatus(store.customers, query));
	const visibleCustomers = $derived(
		filterCustomers(store.customers, { query, status: activeStatus })
	);
	const selectedCustomer = $derived(
		store.customers.find((customer) => customer.id === selectedId) ?? null
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

	function openDetail(customer: Customer) {
		// Read now: once the page turns inert, the browser drops the focus from the button.
		detailOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		selectedId = customer.id;
	}

	async function closeDetail() {
		selectedId = null;
		await tick(); // only then is the page no longer inert and the button focusable again
		detailOpener?.focus();
	}
</script>

<svelte:head>
	<title>Customer Dashboard</title>
</svelte:head>

<!-- Inert while the drawer is open: the rest of the page is neither focusable nor read. -->
<div
	class="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8"
	inert={selectedCustomer !== null}
>
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
					<CustomerTable customers={visibleCustomers} onShowDetail={openDetail} />
				</div>
				<ul class="space-y-3 md:hidden">
					{#each visibleCustomers as customer (customer.id)}
						<CustomerCard {customer} onShowDetail={openDetail} />
					{/each}
				</ul>
			{/if}
		</section>
	</main>

	<footer class="mt-8 text-xs text-muted">
		Fuente de datos: {IS_MOCK_API ? 'API simulada' : API_HOST} · Fechas en {DISPLAY_TIME_ZONE}
	</footer>
</div>

{#if selectedCustomer}
	<CustomerDetailDrawer customer={selectedCustomer} onClose={closeDetail} />
{/if}
