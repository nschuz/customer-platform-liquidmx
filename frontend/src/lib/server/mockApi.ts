import type { ApiErrorBody, ValidationErrorDetail } from '#lib/types/customer.ts';
import { simulateLatency } from './mockLatency.ts';

/** A failure of a mock route. `handle` turns it into the backend's error envelope. */
export class MockApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly details?: ValidationErrorDetail[]
	) {
		super(message);
		this.name = 'MockApiError';
	}
}

type MockRoute = () => Response | Promise<Response>;

/** Behaviour shared by every mock route: the simulated latency and the error envelope. */
export async function handle(route: MockRoute): Promise<Response> {
	await simulateLatency();
	try {
		return await route();
	} catch (error) {
		if (error instanceof MockApiError) return errorResponse(error);
		throw error;
	}
}

export function notFound(): MockApiError {
	return new MockApiError(404, 'CUSTOMER_NOT_FOUND', 'Cliente no encontrado.');
}

export function emailAlreadyExists(): MockApiError {
	return new MockApiError(409, 'EMAIL_ALREADY_EXISTS', 'Ya existe un cliente con ese email.');
}

export function invalidUuid(): MockApiError {
	return validationError([{ field: 'customer_id', message: 'Debe ser un UUID.' }]);
}

export function invalidStatus(): MockApiError {
	return validationError([{ field: 'status', message: 'Debe ser ACTIVE, PENDING o BLOCKED.' }]);
}

export function validationError(details: ValidationErrorDetail[]): MockApiError {
	return new MockApiError(422, 'VALIDATION_ERROR', 'Los datos de la petición no son válidos.', details);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
	return UUID_PATTERN.test(value);
}

/** Reads the JSON body of a request, or `undefined` when there is none or it is not JSON. */
export async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		return undefined;
	}
}

function errorResponse({ status, code, message, details }: MockApiError): Response {
	const body: ApiErrorBody = { error: { code, message, request_id: crypto.randomUUID(), details } };
	return Response.json(body, { status });
}
