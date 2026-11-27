<script lang="ts">
	import type { Customer } from '#lib/types/customer.ts';
	import { formatDateTime } from '#lib/utils/formatters.ts';
	import StatusBadge from './StatusBadge.svelte';

	let { customer, onShowDetail }: {
		customer: Customer;
		onShowDetail: (customer: Customer) => void;
	} = $props();
</script>

<li class="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-gray-300">
	<div class="flex items-center justify-between gap-3">
		<p class="truncate font-semibold text-ink" title={customer.name}>{customer.name}</p>
		<StatusBadge status={customer.status} />
	</div>
	<p class="mt-1 truncate text-muted" title={customer.email}>{customer.email}</p>
	<div class="mt-3 flex items-end justify-between gap-3">
		<div class="min-w-0">
			<p class="text-xs text-muted">Fecha de registro</p>
			<time class="text-sm text-ink" datetime={customer.created_at}>
				{formatDateTime(customer.created_at)}
			</time>
		</div>
		<button
			type="button"
			class="shrink-0 rounded-lg border border-line px-2.5 py-1 text-sm font-medium text-accent transition-colors hover:bg-page"
			aria-label="Ver detalle de {customer.name}"
			onclick={() => onShowDetail(customer)}
		>
			Ver detalle
		</button>
	</div>
</li>
