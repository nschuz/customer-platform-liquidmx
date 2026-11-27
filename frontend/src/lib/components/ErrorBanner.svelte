<script lang="ts">
	import type { ApiError } from '#lib/services/customerApi.ts';

	let { error, onRetry }: { error: ApiError; onRetry: () => void } = $props();
</script>

<div
	role="alert"
	class="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
>
	<div class="min-w-0">
		<p class="font-medium text-red-900">{error.message}</p>
		{#if error.requestId}
			<p class="mt-1 text-xs text-red-800">
				Id de la solicitud: <code class="font-mono">{error.requestId}</code>
			</p>
		{/if}
	</div>
	<button
		type="button"
		class="inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 sm:self-auto"
		onclick={onRetry}
	>
		<svg
			class="size-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12a9 9 0 1 1-2.64-6.36" />
			<path d="M21 3v6h-6" />
		</svg>
		Reintentar
	</button>
</div>
