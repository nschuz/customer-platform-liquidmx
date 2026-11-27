<script lang="ts">
	import { onMount } from 'svelte';
	import CustomerCard from '#lib/components/CustomerCard.svelte';
	import CustomerTable from '#lib/components/CustomerTable.svelte';
	import SkeletonLoader from '#lib/components/SkeletonLoader.svelte';
	import { customersStore } from '#lib/customers.svelte.ts';
	import { API_HOST, IS_MOCK_API } from '#lib/services/customerApi.ts';
	import { DISPLAY_TIME_ZONE } from '#lib/utils/formatters.ts';

	const store = customersStore;

	// Data is fetched in the browser, so the server only renders the shell with its skeletons.
	onMount(() => {
		void store.load();
	});
</script>

<svelte:head>
	<title>Customer Dashboard</title>
</svelte:head>

<div class="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
	<main class="flex-1">
		<header class="mb-6">
			<h1 class="text-2xl font-semibold text-ink">Customer Dashboard</h1>
			<p class="mt-1 text-muted">Consulta los clientes de la plataforma.</p>
		</header>

		<!-- Announces the loading to screen readers; it sits outside the busy region on purpose. -->
		<p class="sr-only" role="status">
			{store.loading ? 'Cargando clientes…' : 'Clientes cargados'}
		</p>
		<section aria-label="Clientes" aria-busy={store.loading}>
			{#if store.loading}
				<SkeletonLoader variant="table" />
				<SkeletonLoader variant="cards" />
			{:else}
				<div class="hidden md:block">
					<CustomerTable customers={store.customers} />
				</div>
				<ul class="space-y-3 md:hidden">
					{#each store.customers as customer (customer.id)}
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
