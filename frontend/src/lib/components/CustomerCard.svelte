<script lang="ts">
	import type { Customer } from '#lib/types/customer.ts';
	import { formatDateTime } from '#lib/utils/formatters.ts';
	import StatusBadge from './StatusBadge.svelte';

	let { customer }: { customer: Customer } = $props();
</script>

<li class="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-gray-300">
	<div class="flex items-center justify-between gap-3">
		<p class="truncate font-semibold text-ink">{customer.name}</p>
		<StatusBadge status={customer.status} />
	</div>
	<p class="mt-1 truncate text-muted" title={customer.email}>{customer.email}</p>
	<div class="mt-3">
		<p class="text-xs text-muted">Fecha de registro</p>
		<time class="text-sm text-ink" datetime={customer.created_at}>
			{formatDateTime(customer.created_at)}
		</time>
	</div>
</li>
