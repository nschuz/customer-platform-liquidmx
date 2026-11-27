import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '#lib/types/customer.ts';
import { ApiError, createCustomer, getCustomer, listCustomers, updateCustomerStatus } from './customerApi';

const publicEnv = vi.hoisted(() => ({ PUBLIC_API_URL: undefined as string | undefined }));

vi.mock('$app/env/public', () => publicEnv);

const customer: Customer = {
	id: '57c15356-e1b1-4b35-9653-aa4c937e4606',
	name: 'Juan Pérez',
	email: 'juan.perez@liquidmx.com',
	status: 'ACTIVE',
	created_at: '2026-09-29T08:00:00.000Z'
};

const notFoundEnvelope = {
	error: {
		code: 'CUSTOMER_NOT_FOUND',
		message: 'Cliente no encontrado',
		request_id: '6e0b9f2c-5b0f-4d6b-9d0e-9f3c0f3b4c1a'
	}
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

function respondWith(body: unknown, status = 200): void {
	fetchMock.mockResolvedValue(Response.json(body, { status }));
}

/** Runs the request and returns the `ApiError` it must reject with. */
async function rejectionOf(promise: Promise<unknown>): Promise<ApiError> {
	const error: unknown = await promise.catch((cause: unknown) => cause);
	expect(error).toBeInstanceOf(ApiError);
	return error as ApiError;
}

describe('customerApi', () => {
	describe('base URL', () => {
		it('calls the in-app mock when PUBLIC_API_URL is not set', async () => {
			respondWith([customer]);

			await listCustomers();

			const [url, init] = fetchMock.mock.calls[0] ?? [];
			expect(url).toBe('/api/customers');
			expect(new Headers(init?.headers).get('accept')).toBe('application/json');
		});

		it('uses PUBLIC_API_URL as base URL, without its trailing slash', async () => {
			publicEnv.PUBLIC_API_URL = 'http://localhost:8000/';
			vi.resetModules();
			try {
				const api = await import('./customerApi');
				respondWith([]);

				await api.listCustomers();

				expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/customers');
				expect(api.IS_MOCK_API).toBe(false);
				expect(api.API_HOST).toBe('localhost:8000');
			} finally {
				publicEnv.PUBLIC_API_URL = undefined;
				vi.resetModules();
			}
		});
	});

	describe('listCustomers', () => {
		it('returns the customers of the list response', async () => {
			respondWith([customer]);

			await expect(listCustomers()).resolves.toEqual([customer]);
		});

		it('sends the status filter as a query string', async () => {
			respondWith([]);

			await listCustomers('BLOCKED');

			expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/customers?status=BLOCKED');
		});

		it('rejects a customer whose shape is not the contract', async () => {
			respondWith([{ ...customer, status: 'DISABLED' }]);

			const error = await rejectionOf(listCustomers());

			expect(error).toMatchObject({ status: 200, code: 'INVALID_RESPONSE' });
		});

		it('rejects a response that is not JSON', async () => {
			fetchMock.mockResolvedValue(new Response('<html>proxy error</html>'));

			const error = await rejectionOf(listCustomers());

			expect(error.code).toBe('INVALID_RESPONSE');
		});
	});

	describe('getCustomer', () => {
		it('requests one customer by id', async () => {
			respondWith(customer);

			await expect(getCustomer(customer.id)).resolves.toEqual(customer);

			expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/customers/${customer.id}`);
		});

		it('maps the error envelope to an ApiError', async () => {
			respondWith(notFoundEnvelope, 404);

			const error = await rejectionOf(getCustomer(customer.id));

			expect(error).toMatchObject({
				status: 404,
				code: 'CUSTOMER_NOT_FOUND',
				message: 'Cliente no encontrado',
				requestId: '6e0b9f2c-5b0f-4d6b-9d0e-9f3c0f3b4c1a'
			});
		});

		it('keeps the field details of a validation error', async () => {
			respondWith(
				{
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Datos de entrada inválidos',
						request_id: 'abc-1',
						details: [
							{ field: 'customer_id', message: 'Value error, badly formed id' },
							'not a field detail'
						]
					}
				},
				422
			);

			const error = await rejectionOf(getCustomer('not-a-uuid'));

			expect(error.details).toEqual([
				{ field: 'customer_id', message: 'Value error, badly formed id' }
			]);
		});
	});

	describe('createCustomer', () => {
		it('posts the new customer as JSON', async () => {
			const created: Customer = { ...customer, id: '3f3fc070-e756-470b-87ce-5e22114e371e', status: 'PENDING' };
			respondWith(created, 201);

			const result = await createCustomer({ name: 'Lucía Díaz', email: 'lucia.diaz@liquidmx.com' });

			expect(result).toEqual(created);
			const [url, init] = fetchMock.mock.calls[0] ?? [];
			expect(url).toBe('/api/customers');
			expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ name: 'Lucía Díaz', email: 'lucia.diaz@liquidmx.com' }) });
			expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
		});
	});

	describe('updateCustomerStatus', () => {
		it('patches the status as JSON', async () => {
			const updated: Customer = { ...customer, status: 'BLOCKED' };
			respondWith(updated);

			const result = await updateCustomerStatus(customer.id, 'BLOCKED');

			expect(result).toEqual(updated);
			const [url, init] = fetchMock.mock.calls[0] ?? [];
			expect(url).toBe(`/api/customers/${customer.id}/status`);
			expect(init).toMatchObject({ method: 'PATCH', body: JSON.stringify({ status: 'BLOCKED' }) });
			expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
		});
	});

	describe('transport failures', () => {
		it('turns a network failure into an ApiError with status 0', async () => {
			fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

			const error = await rejectionOf(listCustomers());

			expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
			expect(error.message).not.toBe('');
		});

		it('aborts a request that takes longer than 10 seconds', async () => {
			vi.useFakeTimers();
			fetchMock.mockImplementation((_input, init) => {
				const { signal } = init ?? {};
				if (!signal) throw new Error('the request must send an abort signal');
				return new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () => reject(signal.reason));
				});
			});

			const request = listCustomers();
			let settled = false;
			void request.then(
				() => {
					settled = true;
				},
				() => {
					settled = true;
				}
			);

			await vi.advanceTimersByTimeAsync(9_999);
			expect(settled).toBe(false);

			await vi.advanceTimersByTimeAsync(1);
			const error = await rejectionOf(request);
			expect(error).toMatchObject({ status: 0, code: 'TIMEOUT' });
			expect(error.message).not.toBe('');
		});

		it('falls back to a generic ApiError when the error body is not the envelope', async () => {
			fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

			const error = await rejectionOf(listCustomers());

			expect(error).toMatchObject({ status: 502, code: 'HTTP_ERROR' });
			expect(error.message).not.toBe('');
		});
	});
});
