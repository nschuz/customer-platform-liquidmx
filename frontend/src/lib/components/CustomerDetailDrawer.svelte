<script lang="ts">
	import { STATUS_LABELS, type Customer } from '#lib/types/customer.ts';
	import { formatDateTime } from '#lib/utils/formatters.ts';
	import StatusBadge from './StatusBadge.svelte';

	const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

	let { customer, onClose }: { customer: Customer; onClose: () => void } = $props();

	let closeButton = $state<HTMLButtonElement>();

	// On open: take the focus and lock the scroll of the page. On close: give the scroll back.
	// The focus itself is returned by the page, once the rest of it is no longer inert.
	$effect(() => {
		const { overflow } = document.body.style;
		document.body.style.overflow = 'hidden';
		closeButton?.focus();
		return () => {
			document.body.style.overflow = overflow;
		};
	});

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
	}

	/** Tab and Shift+Tab wrap around inside the drawer instead of leaving it. */
	function handlePanelKeydown(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		if (event.key !== 'Tab') return;
		const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (!first || !last) return;

		// The panel itself (tabindex -1) holds the focus after a click on its content; leaving it
		// would be leaving the drawer too.
		const active = document.activeElement;
		const leaves =
			active === event.currentTarget || (event.shiftKey ? active === first : active === last);
		if (leaves) {
			event.preventDefault();
			(event.shiftKey ? last : first).focus();
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="fixed inset-0 z-40 flex justify-end">
	<div class="absolute inset-0 bg-ink/40" aria-hidden="true" onclick={onClose}></div>
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="customer-detail-title"
		tabindex="-1"
		class="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface shadow-xl motion-safe:animate-slide-in"
		onkeydown={handlePanelKeydown}
	>
		<header class="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
			<div class="min-w-0">
				<p class="text-xs font-medium tracking-wide text-muted uppercase">Detalle del cliente</p>
				<h2 id="customer-detail-title" class="mt-1 truncate text-xl font-semibold text-ink">
					{customer.name}
				</h2>
			</div>
			<button
				bind:this={closeButton}
				type="button"
				class="shrink-0 rounded-md p-1.5 text-muted hover:bg-page hover:text-ink"
				aria-label="Cerrar detalle"
				onclick={onClose}
			>
				<svg
					class="size-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>
		</header>

		<dl class="divide-y divide-line px-6">
			<div class="py-4">
				<dt class="text-xs font-medium tracking-wide text-muted uppercase">Email</dt>
				<dd class="mt-1 break-all text-ink">{customer.email}</dd>
			</div>
			<div class="py-4">
				<dt class="text-xs font-medium tracking-wide text-muted uppercase">Estado</dt>
				<dd class="mt-2 flex flex-wrap items-center gap-2">
					<StatusBadge status={customer.status} />
					<code class="font-mono text-xs text-muted">{customer.status}</code>
				</dd>
			</div>
			<div class="py-4">
				<dt class="text-xs font-medium tracking-wide text-muted uppercase">Fecha de registro</dt>
				<dd class="mt-1 text-ink">
					<time datetime={customer.created_at}>{formatDateTime(customer.created_at)}</time>
				</dd>
				<dd class="mt-1 font-mono text-xs break-all text-muted">{customer.created_at}</dd>
			</div>
			<div class="py-4">
				<dt class="text-xs font-medium tracking-wide text-muted uppercase">ID</dt>
				<dd class="mt-1 font-mono text-xs break-all text-ink select-all">{customer.id}</dd>
			</div>
		</dl>
	</div>
</div>
