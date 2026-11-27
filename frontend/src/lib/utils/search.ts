import type { Customer, StatusFilter } from '#lib/types/customer.ts';

export interface CustomerFilter {
	query: string;
	status: StatusFilter;
}

export type StatusCounts = Record<StatusFilter, number>;

/** Lower-cases and strips the accents, so that "perez" matches "Pérez". */
export function normalizeText(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase();
}

/** True when the name or the email contains the query. An empty query matches everything. */
export function matchesCustomer(customer: Customer, query: string): boolean {
	const needle = normalizeText(query.trim());
	return (
		needle === '' ||
		normalizeText(customer.name).includes(needle) ||
		normalizeText(customer.email).includes(needle)
	);
}

/** Search first, then status: a customer must satisfy both. */
export function filterCustomers(customers: readonly Customer[], filter: CustomerFilter): Customer[] {
	return customers.filter(
		(customer) =>
			matchesCustomer(customer, filter.query) &&
			(filter.status === 'ALL' || customer.status === filter.status)
	);
}

/** Customers per status among the search results, `ALL` being their total. */
export function countByStatus(customers: readonly Customer[], query: string): StatusCounts {
	const counts: StatusCounts = { ALL: 0, ACTIVE: 0, PENDING: 0, BLOCKED: 0 };
	for (const customer of customers) {
		if (!matchesCustomer(customer, query)) continue;
		counts.ALL += 1;
		counts[customer.status] += 1;
	}
	return counts;
}
