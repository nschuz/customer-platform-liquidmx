import { MOCK_EMPTY } from '$app/env/private';
import type { CreateCustomerInput, Customer, CustomerStatus } from '#lib/types/customer.ts';
import { emailAlreadyExists, notFound } from './mockApi.ts';
import { SEED_CUSTOMERS } from './seedCustomers.ts';

/** The in-memory table of the mock. It lives for as long as the server process. */
let customers: Customer[] = MOCK_EMPTY ? [] : [...SEED_CUSTOMERS];

/** Newest first. A tie between identical timestamps is broken by id, the greatest first, as the
 * backend does (`created_at DESC, id DESC`). */
export function listCustomers(status: CustomerStatus | null): Customer[] {
	return customers
		.filter((customer) => status === null || customer.status === status)
		.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}

export function getCustomer(id: string): Customer {
	const customer = customers.find((candidate) => candidate.id === id);
	if (customer === undefined) throw notFound();
	return customer;
}

export function createCustomer(input: CreateCustomerInput): Customer {
	const email = input.email.trim().toLowerCase();
	if (customers.some((customer) => customer.email === email)) throw emailAlreadyExists();

	const customer: Customer = {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		email,
		status: 'PENDING',
		created_at: new Date().toISOString()
	};
	customers.push(customer);
	return customer;
}

export function updateCustomerStatus(id: string, status: CustomerStatus): Customer {
	const customer = getCustomer(id);
	customer.status = status;
	return customer;
}
