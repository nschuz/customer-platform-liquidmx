import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/services/customerApi.ts';
import type { Customer } from '#lib/types/customer.ts';
import { CustomersStore, type CustomersApi } from './customers.svelte';

vi.mock('$app/env/public', () => ({ PUBLIC_API_URL: undefined }));

const juan: Customer = {
	id: '57c15356-e1b1-4b35-9653-aa4c937e4606',
	name: 'Juan Pérez',
	email: 'juan.perez@example.com',
	status: 'ACTIVE',
	created_at: '2026-09-29T08:15:00.000Z'
};
const lucia: Customer = {
	id: '3f3fc070-e756-470b-87ce-5e22114e371e',
	name: 'Lucía Díaz',
	email: 'lucia.diaz@example.com',
	status: 'PENDING',
	created_at: '2026-11-23T19:50:00.000Z'
};
const blockedJuan: Customer = { ...juan, status: 'BLOCKED' };

function createStore(overrides: Partial<CustomersApi> = {}): CustomersStore {
	return new CustomersStore({
		list: vi.fn().mockResolvedValue([lucia, juan]),
		updateStatus: vi.fn().mockResolvedValue(blockedJuan),
		...overrides
	});
}

describe('CustomersStore', () => {
	it('starts loading, with no customers and no error', () => {
		const store = createStore();

		expect(store.loading).toBe(true);
		expect(store.customers).toEqual([]);
		expect(store.error).toBeNull();
	});

	it('loads the customers and stops loading', async () => {
		const store = createStore();

		await store.load();

		expect(store.customers).toEqual([lucia, juan]);
		expect(store.loading).toBe(false);
		expect(store.error).toBeNull();
	});

	it('keeps the ApiError of a failed load instead of throwing', async () => {
		const apiError = new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sin conexión' });
		const store = createStore({ list: vi.fn().mockRejectedValue(apiError) });

		await store.load();

		expect(store.error).toBe(apiError);
		expect(store.loading).toBe(false);
		expect(store.customers).toEqual([]);
	});

	it('clears the previous error when the load is retried', async () => {
		const list = vi
			.fn()
			.mockRejectedValueOnce(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sin conexión' }))
			.mockResolvedValueOnce([lucia, juan]);
		const store = createStore({ list });

		await store.load();
		await store.load();

		expect(store.error).toBeNull();
		expect(store.customers).toEqual([lucia, juan]);
	});

	it('replaces the customer with the server response, not optimistically', async () => {
		let answer: (customer: Customer) => void = () => {
			throw new Error('the request has not started');
		};
		const updateStatus = vi.fn(
			() =>
				new Promise<Customer>((resolve) => {
					answer = resolve;
				})
		);
		const store = createStore({ updateStatus });
		await store.load();

		const update = store.updateStatus(juan.id, 'BLOCKED');
		expect(store.customers).toEqual([lucia, juan]);

		answer(blockedJuan);
		await update;

		expect(updateStatus).toHaveBeenCalledWith(juan.id, 'BLOCKED');
		expect(store.customers).toEqual([lucia, blockedJuan]);
	});

	it('leaves the list untouched when the status update fails', async () => {
		const apiError = new ApiError({ status: 404, code: 'CUSTOMER_NOT_FOUND', message: 'No' });
		const store = createStore({ updateStatus: vi.fn().mockRejectedValue(apiError) });
		await store.load();

		await expect(store.updateStatus(juan.id, 'BLOCKED')).rejects.toBe(apiError);

		expect(store.customers).toEqual([lucia, juan]);
	});
});
