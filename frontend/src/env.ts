import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Normalises `PUBLIC_API_URL`: trims it, maps a blank value to the mock and assumes `https://`
 * for a bare host, which is how deployment blueprints reference other services (Render's
 * `fromService` passes the host without scheme).
 */
export function normalizeApiUrl(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;
	return trimmed.includes('://') ? trimmed : `https://${trimmed}`;
}

export const variables = defineEnvVars({
	/** Base URL of the real backend, e.g. `http://localhost:8000`. Unset or empty: use the in-app mock. */
	PUBLIC_API_URL: {
		public: true,
		schema: normalizeApiUrl
	},
	/** `true` makes the mock start with no customers, to see the empty state. */
	MOCK_EMPTY: {
		schema: (value) => value === 'true'
	}
});
