import { describe, expect, it } from 'vitest';
import { asRecord } from './guards';

describe('asRecord', () => {
	it('returns an object so its properties can be read safely', () => {
		expect(asRecord({ id: 'abc' })).toEqual({ id: 'abc' });
	});

	it.each([null, undefined, 'text', 42, true])('returns undefined for %s', (value) => {
		expect(asRecord(value)).toBeUndefined();
	});
});
