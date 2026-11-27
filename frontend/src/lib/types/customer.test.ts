import { describe, expect, it } from 'vitest';
import { isCustomerStatus } from './customer';

describe('isCustomerStatus', () => {
	it.each(['ACTIVE', 'PENDING', 'BLOCKED'])('accepts %s', (status) => {
		expect(isCustomerStatus(status)).toBe(true);
	});

	it.each([null, undefined, '', 'active', 'DISABLED', 42])('rejects %s', (value) => {
		expect(isCustomerStatus(value)).toBe(false);
	});
});
