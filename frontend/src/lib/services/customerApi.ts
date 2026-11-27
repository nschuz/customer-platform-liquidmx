import { PUBLIC_API_URL } from '$app/env/public';
import {
	isCustomerStatus,
	type CreateCustomerInput,
	type Customer,
	type CustomerStatus,
	type UpdateCustomerStatusInput,
	type ValidationErrorDetail
} from '#lib/types/customer.ts';
import { asRecord } from '#lib/utils/guards.ts';

const MOCK_BASE_URL = '/api';
const CUSTOMERS_PATH = '/customers';
const REQUEST_TIMEOUT_MS = 10_000;

/** What the UI says when a request gets no answer. The error banner shows it as it is. */
export const CONNECTION_ERROR_MESSAGE =
	'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';

/** The one place the base URL is resolved: `PUBLIC_API_URL`, or the in-app mock without it. */
export const API_BASE_URL = PUBLIC_API_URL?.replace(/\/+$/, '') ?? MOCK_BASE_URL;
export const IS_MOCK_API = API_BASE_URL === MOCK_BASE_URL;
/** Host of the configured API, or the raw value when `PUBLIC_API_URL` is not absolute. */
export const API_HOST = hostOf(API_BASE_URL);

interface ApiErrorInit {
	status: number;
	code: string;
	message: string;
	requestId?: string;
	details?: ValidationErrorDetail[];
}

/** Every failure of the service layer. `status` is 0 when there was no HTTP response. */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly requestId?: string;
	readonly details?: ValidationErrorDetail[];

	constructor({ status, code, message, requestId, details }: ApiErrorInit) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.requestId = requestId;
		this.details = details;
	}
}

export function listCustomers(status?: CustomerStatus): Promise<Customer[]> {
	const query = status ? `?status=${encodeURIComponent(status)}` : '';
	return request(`${CUSTOMERS_PATH}${query}`, { method: 'GET' }, isCustomerList);
}

export function getCustomer(id: string): Promise<Customer> {
	return request(customerPath(id), { method: 'GET' }, isCustomer);
}

export function createCustomer(input: CreateCustomerInput): Promise<Customer> {
	return request(CUSTOMERS_PATH, { method: 'POST', body: JSON.stringify(input) }, isCustomer);
}

export function updateCustomerStatus(id: string, status: CustomerStatus): Promise<Customer> {
	const body = { status } satisfies UpdateCustomerStatusInput;
	const init = { method: 'PATCH', body: JSON.stringify(body) };
	return request(`${customerPath(id)}/status`, init, isCustomer);
}

function hostOf(baseUrl: string): string {
	try {
		return new URL(baseUrl).host;
	} catch {
		return baseUrl;
	}
}

function customerPath(id: string): string {
	return `${CUSTOMERS_PATH}/${encodeURIComponent(id)}`;
}

async function request<T>(
	path: string,
	init: RequestInit,
	isValid: (data: unknown) => data is T
): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(`${API_BASE_URL}${path}`, {
			...init,
			signal: controller.signal,
			headers: requestHeaders(init)
		});
		const body: unknown = await readBody(response, controller.signal);
		if (!response.ok) throw errorFromEnvelope(response.status, body);
		if (!isValid(body)) throw unexpectedResponse(response.status);
		return body;
	} catch (error) {
		throw toApiError(error, controller.signal);
	} finally {
		clearTimeout(timeout);
	}
}

function requestHeaders(init: RequestInit): Headers {
	const headers = new Headers(init.headers);
	headers.set('accept', 'application/json');
	if (init.body !== undefined) headers.set('content-type', 'application/json');
	return headers;
}

/** The parsed JSON body, or `undefined` when it is not JSON (an abort still propagates). */
async function readBody(response: Response, signal: AbortSignal): Promise<unknown> {
	try {
		return await response.json();
	} catch (error) {
		if (signal.aborted) throw error;
		return undefined;
	}
}

/** Builds the error from `{ "error": { "code", "message", "request_id", "details"? } }`. */
function errorFromEnvelope(status: number, body: unknown): ApiError {
	const error = asRecord(asRecord(body)?.error);
	if (!error || typeof error.code !== 'string' || typeof error.message !== 'string') {
		return new ApiError({
			status,
			code: 'HTTP_ERROR',
			message: `El servidor respondió con un error (HTTP ${status}).`
		});
	}
	const listed: unknown[] = Array.isArray(error.details) ? error.details : [];
	return new ApiError({
		status,
		code: error.code,
		message: error.message,
		requestId: typeof error.request_id === 'string' ? error.request_id : undefined,
		details: listed.filter(isValidationErrorDetail)
	});
}

function unexpectedResponse(status: number): ApiError {
	return new ApiError({
		status,
		code: 'INVALID_RESPONSE',
		message: 'El servidor devolvió una respuesta inesperada.'
	});
}

/** Guarantees that a failed request always rejects with an `ApiError`. */
function toApiError(error: unknown, signal: AbortSignal): ApiError {
	if (error instanceof ApiError) return error;
	if (signal.aborted) {
		return new ApiError({
			status: 0,
			code: 'TIMEOUT',
			message: 'La petición tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.'
		});
	}
	return new ApiError({
		status: 0,
		code: 'NETWORK_ERROR',
		message: CONNECTION_ERROR_MESSAGE
	});
}

function isValidationErrorDetail(value: unknown): value is ValidationErrorDetail {
	const detail = asRecord(value);
	return detail !== undefined && typeof detail.field === 'string' && typeof detail.message === 'string';
}

function isCustomer(value: unknown): value is Customer {
	const customer = asRecord(value);
	return (
		customer !== undefined &&
		typeof customer.id === 'string' &&
		typeof customer.name === 'string' &&
		typeof customer.email === 'string' &&
		isCustomerStatus(customer.status) &&
		typeof customer.created_at === 'string'
	);
}

function isCustomerList(value: unknown): value is Customer[] {
	return Array.isArray(value) && value.every(isCustomer);
}
