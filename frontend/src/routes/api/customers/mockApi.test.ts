import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '#lib/types/customer.ts';

// The mock sleeps 300–600 ms per request so the loading state is visible. Not in tests.
vi.mock('#lib/server/mockLatency.ts', () => ({ simulateLatency: () => Promise.resolve() }));

const JUAN_ID = '57c15356-e1b1-4b35-9653-aa4c937e4606';
const UNKNOWN_ID = '0b9d5a3e-6c1f-4e2b-9d7a-2f4c8e1a3b5c';
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const SEED_EMAILS_NEWEST_FIRST = [
	'lucia.diaz@example.com',
	'javier.moreno@example.com',
	'carmen.ruiz@example.com',
	'pedro.gomez@example.com',
	'laura.sanchez@example.com',
	'luis.garcia@example.com',
	'ana.martinez@example.com',
	'carlos.lopez@example.com',
	'maria.fernandez@example.com',
	'juan.perez@example.com'
];

interface ErrorEnvelope {
	code: string;
	message: string;
	request_id: string;
	details?: { field: string; message: string }[];
}

interface CallOptions {
	url?: string;
	method?: string;
	params?: Record<string, string>;
	body?: unknown;
	/** Sent as-is, for requests whose body is not JSON. */
	rawBody?: string;
}

/** A route handler of any of the mock routes, whatever params its event carries. */
type MockHandler = (event: never) => Response | Promise<Response>;

/** Imports the route modules afresh, so that every test starts from the seed data. */
async function loadRoutes() {
	return {
		collection: await import('./+server'),
		member: await import('./[customer_id]/+server'),
		status: await import('./[customer_id]/status/+server')
	};
}

/** Calls a handler the way SvelteKit would, with only the event fields the mock reads. */
function call<H extends MockHandler>(handler: H, options: CallOptions = {}): Promise<Response> {
	const url = new URL(options.url ?? 'http://localhost/api/customers');
	const request = new Request(url, {
		method: options.method ?? 'GET',
		headers: { 'content-type': 'application/json' },
		body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body))
	});
	const event = { params: options.params ?? {}, url, request };
	return Promise.resolve(handler(event as Parameters<H>[0]));
}

async function customersIn(response: Response): Promise<Customer[]> {
	return response.json() as Promise<Customer[]>;
}

async function emailsIn(response: Response): Promise<string[]> {
	return (await customersIn(response)).map((customer) => customer.email);
}

/** Asserts the status and returns the error envelope, checked for what every error must carry. */
async function errorOf(response: Response, status: number, code: string): Promise<ErrorEnvelope> {
	expect(response.status).toBe(status);
	const { error } = (await response.json()) as { error: ErrorEnvelope };
	expect(error.code).toBe(code);
	expect(typeof error.request_id).toBe('string');
	return error;
}

beforeEach(() => {
	vi.resetModules();
});

describe('GET /api/customers', () => {
	it('returns the ten seeded customers, newest first', async () => {
		const { collection } = await loadRoutes();

		const response = await call(collection.GET);

		expect(response.status).toBe(200);
		const customers = await customersIn(response);
		expect(customers.map((customer) => customer.email)).toEqual(SEED_EMAILS_NEWEST_FIRST);
		expect(customers[0]).toEqual({
			id: '3f3fc070-e756-470b-87ce-5e22114e371e',
			name: 'Lucía Díaz',
			email: 'lucia.diaz@example.com',
			status: 'PENDING',
			created_at: '2026-11-23T19:50:00.000Z'
		});
	});

	it.each([
		[
			'ACTIVE',
			[
				'javier.moreno@example.com',
				'laura.sanchez@example.com',
				'ana.martinez@example.com',
				'maria.fernandez@example.com',
				'juan.perez@example.com'
			]
		],
		['PENDING', ['lucia.diaz@example.com', 'pedro.gomez@example.com', 'carlos.lopez@example.com']],
		['BLOCKED', ['carmen.ruiz@example.com', 'luis.garcia@example.com']]
	])('filters by status=%s', async (status, emails) => {
		const { collection } = await loadRoutes();

		const response = await call(collection.GET, {
			url: `http://localhost/api/customers?status=${status}`
		});

		expect(response.status).toBe(200);
		expect(await emailsIn(response)).toEqual(emails);
	});

	it('rejects an unknown status with a 422 in the error envelope', async () => {
		const { collection } = await loadRoutes();

		const response = await call(collection.GET, {
			url: 'http://localhost/api/customers?status=NOPE'
		});

		const error = await errorOf(response, 422, 'VALIDATION_ERROR');
		expect(error.details).toEqual([{ field: 'status', message: expect.any(String) }]);
	});
});

describe('POST /api/customers', () => {
	const newCustomer = { name: 'Sofía Romero', email: 'sofia.romero@example.com' };

	it('creates the customer as PENDING and returns it with a 201', async () => {
		const { collection } = await loadRoutes();

		const response = await call(collection.POST, { method: 'POST', body: newCustomer });

		expect(response.status).toBe(201);
		const created = (await response.json()) as Customer;
		expect(created).toMatchObject({ ...newCustomer, status: 'PENDING' });
		expect(created.id).toMatch(UUID_V4_PATTERN);
		expect(created.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);

		const list = await call(collection.GET);
		expect(await emailsIn(list)).toEqual(['sofia.romero@example.com', ...SEED_EMAILS_NEWEST_FIRST]);
	});

	it('ignores unknown fields and normalizes the email', async () => {
		const { collection } = await loadRoutes();

		const response = await call(collection.POST, {
			method: 'POST',
			body: { ...newCustomer, email: ' SOFIA.Romero@Example.com ', status: 'ACTIVE', id: JUAN_ID }
		});

		expect(response.status).toBe(201);
		expect(((await response.json()) as Customer).email).toBe('sofia.romero@example.com');
	});

	it('rejects a duplicate email, whatever the case, with a 409', async () => {
		const { collection } = await loadRoutes();

		const response = await call(collection.POST, {
			method: 'POST',
			body: { name: 'Otro Juan', email: 'JUAN.PEREZ@EXAMPLE.COM' }
		});

		await errorOf(response, 409, 'EMAIL_ALREADY_EXISTS');
	});

	it('rejects an invalid customer with a 422 naming the fields', async () => {
		const { collection } = await loadRoutes();

		const response = await call(collection.POST, {
			method: 'POST',
			body: { name: '   ', email: 'not-an-email', status: 'ACTIVE' }
		});

		const error = await errorOf(response, 422, 'VALIDATION_ERROR');
		expect(error.details?.map((detail) => detail.field).sort()).toEqual(['email', 'name']);
	});

	it('rejects a body that is not JSON with a 422', async () => {
		const { collection } = await loadRoutes();

		const response = await call(collection.POST, { method: 'POST', rawBody: 'name=Juan' });

		const error = await errorOf(response, 422, 'VALIDATION_ERROR');
		expect(error.details?.map((detail) => detail.field).sort()).toEqual(['email', 'name']);
	});

	it('creates a customer even when the mock started empty', async () => {
		vi.resetModules();
		vi.doMock('$app/env/private', () => ({ MOCK_EMPTY: true }));
		try {
			const { collection } = await loadRoutes();

			expect(await emailsIn(await call(collection.GET))).toEqual([]);

			const response = await call(collection.POST, {
				method: 'POST',
				body: { name: 'Sofía Romero', email: 'sofia.romero@example.com' }
			});

			expect(response.status).toBe(201);
			expect(await emailsIn(await call(collection.GET))).toEqual(['sofia.romero@example.com']);
		} finally {
			vi.doUnmock('$app/env/private');
			vi.resetModules();
		}
	});
});

describe('GET /api/customers/{customer_id}', () => {
	it('returns the customer', async () => {
		const { member } = await loadRoutes();

		const response = await call(member.GET, { params: { customer_id: JUAN_ID } });

		expect(response.status).toBe(200);
		expect(((await response.json()) as Customer).name).toBe('Juan Pérez');
	});

	it('returns a 404 in the error envelope for an unknown id', async () => {
		const { member } = await loadRoutes();

		const response = await call(member.GET, { params: { customer_id: UNKNOWN_ID } });

		await errorOf(response, 404, 'CUSTOMER_NOT_FOUND');
	});

	it('returns a 422 for a malformed id', async () => {
		const { member } = await loadRoutes();

		const response = await call(member.GET, { params: { customer_id: 'not-a-uuid' } });

		const error = await errorOf(response, 422, 'VALIDATION_ERROR');
		expect(error.details).toEqual([{ field: 'customer_id', message: expect.any(String) }]);
	});
});

describe('PATCH /api/customers/{customer_id}/status', () => {
	function patchStatus(id: string, status: unknown): Promise<Response> {
		return loadRoutes().then(({ status: route }) =>
			call(route.PATCH, { method: 'PATCH', params: { customer_id: id }, body: { status } })
		);
	}

	it('updates the status, returns the customer and persists the change', async () => {
		const { status, member } = await loadRoutes();

		const response = await call(status.PATCH, {
			method: 'PATCH',
			params: { customer_id: JUAN_ID },
			body: { status: 'BLOCKED' }
		});

		expect(response.status).toBe(200);
		expect(((await response.json()) as Customer).status).toBe('BLOCKED');

		const stored = await call(member.GET, { params: { customer_id: JUAN_ID } });
		expect(((await stored.json()) as Customer).status).toBe('BLOCKED');
	});

	it('accepts setting the status a customer already has', async () => {
		const response = await patchStatus(JUAN_ID, 'ACTIVE');

		expect(response.status).toBe(200);
	});

	it('returns a 404 for an unknown id', async () => {
		const response = await patchStatus(UNKNOWN_ID, 'ACTIVE');

		await errorOf(response, 404, 'CUSTOMER_NOT_FOUND');
	});

	it('returns a 422 for an invalid status', async () => {
		const response = await patchStatus(JUAN_ID, 'DISABLED');

		const error = await errorOf(response, 422, 'VALIDATION_ERROR');
		expect(error.details).toEqual([{ field: 'status', message: expect.any(String) }]);
	});

	it('returns a 422 for a malformed id', async () => {
		const response = await patchStatus('not-a-uuid', 'ACTIVE');

		const error = await errorOf(response, 422, 'VALIDATION_ERROR');
		expect(error.details).toEqual([{ field: 'customer_id', message: expect.any(String) }]);
	});
});
