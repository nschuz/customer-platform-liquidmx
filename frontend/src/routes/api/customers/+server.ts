import type { RequestHandler } from './$types';
import {
	handle,
	invalidStatus,
	readJsonBody,
	validationError
} from '#lib/server/mockApi.ts';
import { createCustomer, listCustomers } from '#lib/server/mockCustomers.ts';
import { isCustomerStatus, type CreateCustomerInput, type ValidationErrorDetail } from '#lib/types/customer.ts';
import { asRecord } from '#lib/utils/guards.ts';

const NAME_MAX_LENGTH = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET: RequestHandler = ({ url }) =>
	handle(() => {
		const status = url.searchParams.get('status');
		if (status !== null && !isCustomerStatus(status)) throw invalidStatus();
		return Response.json(listCustomers(status));
	});

export const POST: RequestHandler = ({ request }) =>
	handle(async () => {
		const input = parseNewCustomer(await readJsonBody(request));
		return Response.json(createCustomer(input), { status: 201 });
	});

/** Mirrors the backend schema: `name` (1–120 chars) and `email` are required, the rest is ignored. */
function parseNewCustomer(body: unknown): CreateCustomerInput {
	const record = asRecord(body);
	const name = typeof record?.name === 'string' ? record.name.trim() : '';
	const email = typeof record?.email === 'string' ? record.email.trim() : '';

	const details: ValidationErrorDetail[] = [];
	if (name.length === 0 || name.length > NAME_MAX_LENGTH) {
		details.push({ field: 'name', message: 'Debe tener entre 1 y 120 caracteres.' });
	}
	if (!EMAIL_PATTERN.test(email)) {
		details.push({ field: 'email', message: 'Debe ser una dirección de email válida.' });
	}
	if (details.length > 0) throw validationError(details);
	return { name, email };
}
