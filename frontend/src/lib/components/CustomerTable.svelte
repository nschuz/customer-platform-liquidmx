<script lang="ts">
	import type { Customer } from '#lib/types/customer.ts';
	import { formatDateTime } from '#lib/utils/formatters.ts';
	import StatusBadge from './StatusBadge.svelte';

	let { customers }: { customers: Customer[] } = $props();
</script>

<div class="overflow-hidden rounded-xl border border-line bg-surface">
	<!-- Fixed layout with column widths: the table can never grow past its container. -->
	<table class="w-full table-fixed text-left text-sm">
		<caption class="sr-only">Clientes</caption>
		<colgroup>
			<col class="w-[22%]" />
			<col class="w-[33%]" />
			<col class="w-[18%]" />
			<col class="w-[27%]" />
		</colgroup>
		<thead class="border-b border-line text-xs text-muted uppercase tracking-wide">
			<tr>
				<th scope="col" class="px-2 py-3 font-medium lg:px-4">Nombre</th>
				<th scope="col" class="px-2 py-3 font-medium lg:px-4">Email</th>
				<th scope="col" class="px-2 py-3 font-medium lg:px-4">Estado</th>
				<th scope="col" class="px-2 py-3 font-medium lg:px-4">Fecha de registro</th>
			</tr>
		</thead>
		<tbody>
			{#each customers as customer (customer.id)}
				<tr class="border-b border-line transition-colors last:border-b-0 hover:bg-page">
					<td class="truncate px-2 py-3 font-medium text-ink lg:px-4">{customer.name}</td>
					<td class="truncate px-2 py-3 text-muted lg:px-4" title={customer.email}>
						{customer.email}
					</td>
					<td class="px-2 py-3 lg:px-4"><StatusBadge status={customer.status} /></td>
					<td class="truncate px-2 py-3 text-muted lg:px-4">
						<time datetime={customer.created_at}>{formatDateTime(customer.created_at)}</time>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
