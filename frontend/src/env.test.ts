import { describe, expect, it } from 'vitest';

import { normalizeApiUrl } from './env.ts';

describe('normalizeApiUrl', () => {
	it('returns undefined for an unset or blank value (mock mode)', () => {
		expect(normalizeApiUrl(undefined)).toBeUndefined();
		expect(normalizeApiUrl('')).toBeUndefined();
		expect(normalizeApiUrl('   ')).toBeUndefined();
	});

	it('keeps a full URL, trimming spaces and trailing slashes are kept to the client', () => {
		expect(normalizeApiUrl('http://localhost:8000')).toBe('http://localhost:8000');
		expect(normalizeApiUrl('  https://api.example.com  ')).toBe('https://api.example.com');
	});

	it('assumes https for a bare host (deployment blueprints pass the host without scheme)', () => {
		expect(normalizeApiUrl('customer-platform-api.onrender.com')).toBe(
			'https://customer-platform-api.onrender.com'
		);
	});
});
