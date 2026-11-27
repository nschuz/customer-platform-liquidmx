import type { RequestHandler } from './$types';
import { handle, invalidUuid, isUuid } from '#lib/server/mockApi.ts';
import { getCustomer } from '#lib/server/mockCustomers.ts';

export const GET: RequestHandler = ({ params }) =>
	handle(() => {
		if (!isUuid(params.customer_id)) throw invalidUuid();
		return Response.json(getCustomer(params.customer_id));
	});
