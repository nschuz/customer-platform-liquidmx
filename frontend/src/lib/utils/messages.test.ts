import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, listCustomers } from '#lib/services/customerApi.ts';
import { describeApiError } from './messages.ts';

// The client module reads PUBLIC_API_URL from SvelteKit's env, which only exists inside the app.
vi.mock('$app/env/public', () => ({ PUBLIC_API_URL: undefined }));

/** What the error banner says when a request got no answer. */
const CONNECTION_MESSAGE =
	'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';

const cases: [name: string, error: unknown, expected: string][] = [
	[
		'a network failure',
		new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Failed to fetch' }),
		CONNECTION_MESSAGE
	],
	[
		'a timeout',
		new ApiError({ status: 0, code: 'TIMEOUT', message: 'La petición tardó demasiado.' }),
		CONNECTION_MESSAGE
	],
	[
		'any other failure with no HTTP response',
		new ApiError({ status: 0, code: 'UNKNOWN_ERROR', message: 'Error inesperado al cargar.' }),
		CONNECTION_MESSAGE
	],
	[
		'a customer that no longer exists',
		new ApiError({
			status: 404,
			code: 'CUSTOMER_NOT_FOUND',
			message: 'Customer 6a25261c-… not found.',
			requestId: 'req-47'
		}),
		'El cliente ya no existe.'
	],
	[
		'a rejected status',
		new ApiError({ status: 422, code: 'VALIDATION_ERROR', message: 'Invalid request.' }),
		'El estado indicado no es válido.'
	],
	[
		'a duplicate email',
		new ApiError({ status: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'A customer with this email already exists.' }),
		'Ya existe un cliente con ese email.'
	],
	[
		'another 4xx, keeping what the server said',
		new ApiError({ status: 405, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' }),
		'No se pudo guardar el cambio. Method not allowed.'
	],
	[
		'another 4xx that says nothing',
		new ApiError({ status: 403, code: 'FORBIDDEN', message: '  ' }),
		'No se pudo guardar el cambio.'
	],
	[
		'a server error, without its internals',
		new ApiError({ status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' }),
		'No se pudo guardar el cambio. Inténtalo de nuevo.'
	],
	[
		'a bad gateway',
		new ApiError({ status: 502, code: 'HTTP_ERROR', message: 'El servidor respondió con un error (HTTP 502).' }),
		'No se pudo guardar el cambio. Inténtalo de nuevo.'
	],
	[
		'an answer that is not the contract',
		new ApiError({ status: 200, code: 'INVALID_RESPONSE', message: 'El servidor devolvió una respuesta inesperada.' }),
		'No se pudo guardar el cambio. Inténtalo de nuevo.'
	],
	['an error that is not an ApiError', new TypeError('x is not a function'), 'Ha ocurrido un error inesperado.'],
	['a rejection without an error', 'boom', 'Ha ocurrido un error inesperado.']
];

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('describeApiError', () => {
	it.each(cases)('describes %s', (_name, error, expected) => {
		expect(describeApiError(error)).toBe(expected);
	});

	it('says what the error banner says when the server cannot be reached', async () => {
		// The banner shows `error.message`: the description must be those very words.
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		try {
			await listCustomers();
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			expect(describeApiError(error)).toBe((error as ApiError).message);
			return;
		}
		throw new Error('listCustomers should have rejected');
	});
});
