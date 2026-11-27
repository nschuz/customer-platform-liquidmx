<script lang="ts">
	import { CUSTOMER_STATUSES, STATUS_LABELS, type CustomerStatus } from '#lib/types/customer.ts';

	let { status, pending = null, onChange }: {
		/** The status the server has for the customer: the pressed option. */
		status: CustomerStatus;
		/** The status being saved, while its request is in flight. */
		pending?: CustomerStatus | null;
		onChange: (status: CustomerStatus) => void;
	} = $props();

	/** What the option being saved says meanwhile. */
	const PENDING_LABEL = 'Guardando…';

	/** Nothing is asked while a status is being saved, nor for the status the customer already has. */
	function choose(option: CustomerStatus) {
		if (pending === null && option !== status) onChange(option);
	}

	/** The button of each status, to be able to give the focus back to one of them. */
	const optionButtons: Partial<Record<CustomerStatus, HTMLButtonElement>> = $state({});

	// A button that becomes disabled is blurred and the focus falls to <body>. Once the options are
	// enabled again it goes back to the one that was saved, unless the user moved it meanwhile.
	let savedOption: CustomerStatus | null = null;
	$effect(() => {
		if (pending !== null) {
			savedOption = pending;
		} else if (savedOption !== null) {
			if (document.activeElement === document.body) optionButtons[savedOption]?.focus();
			savedOption = null;
		}
	});
</script>

<fieldset class="min-w-0" aria-busy={pending !== null}>
	<legend class="text-xs font-medium tracking-wide text-muted uppercase">Cambiar estado</legend>
	<div class="flex flex-wrap gap-2">
		{#each CUSTOMER_STATUSES as option (option)}
			<button
				type="button"
				bind:this={optionButtons[option]}
				aria-pressed={status === option}
				disabled={pending !== null}
				class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors {status ===
				option
					? 'border-ink bg-ink text-white'
					: 'border-line bg-surface text-ink enabled:hover:bg-page'}"
				onclick={() => choose(option)}
			>
				{#if pending === option}
					<svg
						class="motion-safe:animate-spin size-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="9" stroke-opacity="0.25" />
						<path d="M21 12a9 9 0 0 0-9-9" stroke-linecap="round" />
					</svg>
					{PENDING_LABEL}
				{:else}
					{STATUS_LABELS[option]}
				{/if}
			</button>
		{/each}
	</div>
</fieldset>

<!-- A status region, so polite: it says that the saving is under way. It sits outside the busy
     group, which holds back what changes inside it, and is always in the DOM, empty when idle: a
     region that only appears with its text is often not announced. -->
<p class="sr-only" role="status">{pending !== null ? PENDING_LABEL : ''}</p>
