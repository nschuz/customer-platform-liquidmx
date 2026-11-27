import { describe, expect, it } from 'vitest';
import { formatDateTime } from './formatters';

describe('formatDateTime', () => {
	it('formats an ISO date in Spanish with its UTC time zone', () => {
		expect(formatDateTime('2026-11-27T14:30:00Z')).toBe('27 nov 2026, 14:30 UTC');
	});

	it.each([
		['2026-01-01T00:05:00Z', '01 ene 2026, 00:05 UTC'],
		['2026-09-29T08:00:00.000Z', '29 sept 2026, 08:00 UTC']
	])('formats %s as %s', (iso, formatted) => {
		expect(formatDateTime(iso)).toBe(formatted);
	});

	it('converts to the given time zone and names it', () => {
		expect(formatDateTime('2026-11-27T14:30:00Z', 'Europe/Madrid')).toBe(
			'27 nov 2026, 15:30 Europe/Madrid'
		);
		expect(formatDateTime('2026-03-15T23:59:00Z', 'America/Argentina/Buenos_Aires')).toBe(
			'15 mar 2026, 20:59 America/Argentina/Buenos_Aires'
		);
	});

	it('shows the raw value when it is not a valid date', () => {
		expect(formatDateTime('yesterday')).toBe('yesterday');
	});
});
