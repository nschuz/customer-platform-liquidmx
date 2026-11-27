import { describe, expect, it } from 'vitest';
import type { Customer } from '#lib/types/customer.ts';
import { countByStatus, filterCustomers, matchesCustomer, normalizeText } from './search';

const juan: Customer = {
	id: '1',
	name: 'Juan Pérez',
	email: 'juan.perez@liquidmx.com',
	status: 'ACTIVE',
	created_at: '2026-09-29T08:15:00.000Z'
};
const maria: Customer = {
	id: '2',
	name: 'María Fernández',
	email: 'maria.fernandez@liquidmx.com',
	status: 'ACTIVE',
	created_at: '2026-10-03T11:40:00.000Z'
};
const carlos: Customer = {
	id: '3',
	name: 'Carlos López',
	email: 'carlos.lopez@liquidmx.com',
	status: 'PENDING',
	created_at: '2026-10-08T16:05:00.000Z'
};
const luis: Customer = {
	id: '4',
	name: 'Luis García',
	email: 'luis.garcia@liquidmx.com',
	status: 'BLOCKED',
	created_at: '2026-10-19T18:20:00.000Z'
};
const customers = [juan, maria, carlos, luis];

describe('normalizeText', () => {
	it.each([
		['Juan Pérez', 'juan perez'],
		['MARÍA', 'maria'],
		['Ñandú', 'nandu'],
		['luis.garcia@LIQUIDMX.com', 'luis.garcia@liquidmx.com'],
		['a^b`c+d', 'a^b`c+d']
	])('normalizes %s to %s', (text, normalized) => {
		expect(normalizeText(text)).toBe(normalized);
	});
});

describe('matchesCustomer', () => {
	it.each([
		{ query: 'perez', customer: juan },
		{ query: 'JUAN', customer: juan },
		{ query: 'fernandez', customer: maria },
		{ query: 'garcia@liquidmx', customer: luis }
	])('"$query" matches $customer.name', ({ query, customer }) => {
		expect(matchesCustomer(customer, query)).toBe(true);
	});

	it.each([
		{ query: 'perez', customer: carlos },
		{ query: 'zzz', customer: juan },
		{ query: 'luis', customer: maria }
	])('"$query" does not match $customer.name', ({ query, customer }) => {
		expect(matchesCustomer(customer, query)).toBe(false);
	});

	it.each([[''], ['   ']])('matches everything when the query is %j', (query) => {
		for (const customer of customers) {
			expect(matchesCustomer(customer, query)).toBe(true);
		}
	});
});

describe('filterCustomers', () => {
	it('returns every customer without search or status filter', () => {
		expect(filterCustomers(customers, { query: '', status: 'ALL' })).toEqual(customers);
	});

	it('keeps the customers that match the search and the status', () => {
		expect(filterCustomers(customers, { query: 'a', status: 'BLOCKED' })).toEqual([luis]);
		expect(filterCustomers(customers, { query: 'perez', status: 'ACTIVE' })).toEqual([juan]);
	});

	it('returns nothing when search and status do not overlap', () => {
		expect(filterCustomers(customers, { query: 'perez', status: 'BLOCKED' })).toEqual([]);
	});

	it('returns nothing when nobody matches the search', () => {
		expect(filterCustomers(customers, { query: 'zzz', status: 'ALL' })).toEqual([]);
	});
});

describe('countByStatus', () => {
	it('counts every customer when the query is empty', () => {
		expect(countByStatus(customers, '')).toEqual({ ALL: 4, ACTIVE: 2, PENDING: 1, BLOCKED: 1 });
	});

	it('counts per status among the search results, whatever the active status filter is', () => {
		expect(countByStatus(customers, 'an')).toEqual({ ALL: 2, ACTIVE: 2, PENDING: 0, BLOCKED: 0 });
	});
});
