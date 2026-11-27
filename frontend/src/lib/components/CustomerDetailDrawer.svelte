<script lang="ts">
	import {
		STATUS_LABELS,
		type Customer,
		type CustomerStatus
	} from '#lib/types/customer.ts';
	import { focusableControls, trapTabKey } from '#lib/utils/focus.ts';
	import { formatDateTime } from '#lib/utils/formatters.ts';
	import { describeApiError } from '#lib/utils/messages.ts';
	import CustomerStatusControl from './CustomerStatusControl.svelte';
	import StatusBadge from './StatusBadge.svelte';

	let { customer, onClose, onStatusChange }: {
		customer: Customer;
		onClose: () => void;
		/** Saves the status of the customer shown; rejects when the server did not accept it. */
		onStatusChange: (status: CustomerStatus) => Promise<void>;
	} = $props();

	/** The outcome of the last change, and the customer it belongs to. */
	let outcome = $state<{ customerId: string; notice: string; error: string | null } | null>(null);
	let pendingStatus = $state<CustomerStatus | null>(null);
	/** Null when the outcome belongs to a customer that is no longer shown. */
	const feedback = $derived(outcome?.customerId === customer.id ? outcome : null);

	/** Not optimistic: the drawer shows the new status when `customer` comes back with it. */
	async function changeStatus(status: CustomerStatus) {
		const { id: customerId } = customer; // the customer shown may be another one by the time of the answer
		pendingStatus = status;
		outcome = null;
		try {
			await onStatusChange(status);
			outcome = { customerId, notice: `Estado actualizado a ${STATUS_LABELS[status]}.`, error: null };
		} catch (cause) {
			outcome = { customerId, notice: '', error: describeApiError(cause) };
		} finally {
			pendingStatus = null;
		}
	}

	let closeButton = $state<HTMLButtonElement>();
	let panel = $state<HTMLDivElement>();

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

	// A Tab that reaches the window means that nothing in the drawer has the focus: while a change
	// is being saved the browser drops it to <body>, because the option that became disabled is
	// blurred. Left alone, that Tab would leave the page, so it is taken back into the drawer.
	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onClose();
		if (event.key === 'Tab' && document.activeElement === document.body) {
			event.preventDefault();
			const controls = panel ? focusableControls(panel) : [];
			(event.shiftKey ? controls[controls.length - 1] : controls[0])?.focus();
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
		bind:this={panel}
		class="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface shadow-xl motion-safe:animate-slide-in"
		onkeydown={trapTabKey}
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

		<div class="border-t border-line px-6 py-4">
			<CustomerStatusControl
				status={customer.status}
				pending={pendingStatus}
				onChange={changeStatus}
			/>
			{#if feedback?.error}
				<p role="alert" class="mt-3 text-sm text-red-900">{feedback.error}</p>
			{/if}
			<!-- Always in the DOM and empty when there is nothing to say, so that its changes are spoken. -->
			<p class="sr-only" aria-live="polite">{feedback?.notice ?? ''}</p>
		</div>
	</div>
</div>
