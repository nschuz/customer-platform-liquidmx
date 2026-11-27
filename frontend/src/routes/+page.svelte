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
	import { focusFirstButton } from '#lib/utils/focus.ts';
	import { DISPLAY_TIME_ZONE } from '#lib/utils/formatters.ts';
	import { countByStatus, filterCustomers } from '#lib/utils/search.ts';

	const store = customersStore;

	// UI state: what the user typed, selected and opened. The data itself lives in the store.
	let searchText = $state('');
	let query = $state('');
	let activeStatus = $state<StatusFilter>('ALL');
	let selectedId = $state<string | null>(null);
	// The "Ver detalle" button that opened the drawer: it gets the focus back when it closes. It is
	// the button the click reports, not `document.activeElement`: some browsers do not focus a
	// button on a mouse click.
	let detailOpener: HTMLButtonElement | null = null;
	let listSection = $state<HTMLElement>();
	let searchBox = $state<HTMLDivElement>();

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
		searchBox?.querySelector('input')?.focus(); // the button removes itself, so the focus stays here
	}

	function retry() {
		void store.load();
	}

	function openDetail(customer: Customer, opener: HTMLButtonElement) {
		detailOpener = opener;
		selectedId = customer.id;
	}

	async function closeDetail() {
		selectedId = null;
		await tick(); // only then is the page no longer inert and the button focusable again
		// The opener is gone when its row left the list meanwhile (a status change that no longer
		// matches the filter): the focus goes to the first row that is shown, instead of to <body>.
		if (detailOpener?.isConnected) detailOpener.focus();
		else focusFirstButton(listSection);
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
				class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
				aria-label="Filtros y búsqueda"
			>
				<CustomerFilters active={activeStatus} counts={statusCounts} onChange={setStatusFilter} />
				<div class="w-full shrink-0 lg:w-80" bind:this={searchBox}>
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
		<section aria-label="Clientes" aria-busy={store.loading} bind:this={listSection}>
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
	<CustomerDetailDrawer
		customer={selectedCustomer}
		onClose={closeDetail}
		onStatusChange={async (status) => {
			await store.updateStatus(selectedCustomer.id, status);
		}}
	/>
{/if}
