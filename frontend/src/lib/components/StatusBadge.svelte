<script lang="ts">
	import { STATUS_LABELS, type CustomerStatus } from '#lib/types/customer.ts';

	let { status }: { status: CustomerStatus } = $props();

	// Spelled out per status so that Tailwind can see each class.
	const BADGE_TONES: Record<CustomerStatus, string> = {
		ACTIVE: 'bg-status-active/10 text-status-active',
		PENDING: 'bg-status-pending/10 text-status-pending',
		BLOCKED: 'bg-status-blocked/10 text-status-blocked'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap {BADGE_TONES[status]}"
>
	<span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
	{STATUS_LABELS[status]}
</span>
