import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	/** Base URL of the real backend, e.g. `http://localhost:8000`. Unset or empty: use the in-app mock. */
	PUBLIC_API_URL: {
		public: true,
		schema: (value) => value?.trim() || undefined
	},
	/** `true` makes the mock start with no customers, to see the empty state. */
	MOCK_EMPTY: {
		schema: (value) => value === 'true'
	}
});
