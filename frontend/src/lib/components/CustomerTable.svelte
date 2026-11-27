<script lang="ts">
	import type { Customer } from '#lib/types/customer.ts';
	import { formatDateTime } from '#lib/utils/formatters.ts';
	import StatusBadge from './StatusBadge.svelte';

	let { customers, onShowDetail }: {
		customers: Customer[];
		onShowDetail: (customer: Customer) => void;
	} = $props();
</script>

<div class="overflow-hidden rounded-xl border border-line bg-surface">
	<!-- Fixed layout with column widths: the table can never grow past its container. -->
	<table class="w-full table-fixed text-left text-sm">
		<caption class="sr-only">Clientes</caption>
		<colgroup>
			<col class="w-[18%]" />
			<col class="w-[28%]" />
			<col class="w-[15%]" />
			<col class="w-[23%]" />
			<col class="w-[16%]" />
		</colgroup>
		<thead class="border-b border-line text-xs text-muted uppercase tracking-wide">
			<tr>
				<th scope="col" class="px-1.5 py-3 font-medium lg:px-4">Nombre</th>
				<th scope="col" class="px-1.5 py-3 font-medium lg:px-4">Email</th>
				<th scope="col" class="px-1.5 py-3 font-medium lg:px-4">Estado</th>
				<th scope="col" class="px-1.5 py-3 font-medium lg:px-4">Fecha de registro</th>
				<th scope="col" class="px-1.5 py-3 text-right font-medium lg:px-4">Acciones</th>
			</tr>
		</thead>
		<tbody>
			{#each customers as customer (customer.id)}
				<tr class="border-b border-line transition-colors last:border-b-0 hover:bg-page">
					<td
						class="truncate px-1.5 py-3 font-medium text-ink lg:px-4"
						title={customer.name}
					>
						{customer.name}
					</td>
					<!-- Email and date shrink one step below lg, where five columns share little room. -->
					<td class="truncate px-1.5 py-3 text-xs text-muted lg:px-4 lg:text-sm" title={customer.email}>
						{customer.email}
					</td>
					<td class="px-1.5 py-3 lg:px-4"><StatusBadge status={customer.status} /></td>
					<td class="truncate px-1.5 py-3 text-xs text-muted lg:px-4 lg:text-sm">
						<time datetime={customer.created_at}>{formatDateTime(customer.created_at)}</time>
					</td>
					<td class="px-1.5 py-3 text-right lg:px-4">
						<button
							type="button"
							class="rounded-lg border border-line px-2.5 py-1 text-sm font-medium whitespace-nowrap text-accent transition-colors hover:bg-page lg:px-3"
							aria-label="Ver detalle de {customer.name}"
							onclick={() => onShowDetail(customer)}
						>
							Ver detalle
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
