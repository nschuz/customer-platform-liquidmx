import type { RequestHandler } from './$types';
import { handle, invalidStatus, invalidUuid, isUuid, readJsonBody } from '#lib/server/mockApi.ts';
import { updateCustomerStatus } from '#lib/server/mockCustomers.ts';
import { isCustomerStatus } from '#lib/types/customer.ts';
import { asRecord } from '#lib/utils/guards.ts';

export const PATCH: RequestHandler = ({ params, request }) =>
	handle(async () => {
		if (!isUuid(params.customer_id)) throw invalidUuid();
		const body = asRecord(await readJsonBody(request));
		if (!isCustomerStatus(body?.status)) throw invalidStatus();
		return Response.json(updateCustomerStatus(params.customer_id, body.status));
	});
