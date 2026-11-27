import { ApiError, listCustomers, updateCustomerStatus } from '#lib/services/customerApi.ts';
import type { Customer, CustomerStatus } from '#lib/types/customer.ts';

/** The part of the API client the store depends on. Injected, so tests use plain functions. */
export interface CustomersApi {
	list(): Promise<Customer[]>;
	updateStatus(id: string, status: CustomerStatus): Promise<Customer>;
}

/** The customers held by the app. The single owner of the data that comes from the API. */
export class CustomersStore {
	customers = $state<Customer[]>([]);
	/** True until the first load ends: the page shows skeletons meanwhile, also in SSR. */
	loading = $state(true);
	error = $state<ApiError | null>(null);

	#api: CustomersApi;

	constructor(api: CustomersApi) {
		this.#api = api;
	}

	/** Fetches the list. A failure is kept in `error` for the UI to show; it is never thrown. */
	async load(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			this.customers = await this.#api.list();
		} catch (error) {
			this.error = toApiError(error);
		} finally {
			this.loading = false;
		}
	}

	/** Not optimistic: the row is replaced once the server answers. Rejects if the request fails. */
	async updateStatus(id: string, status: CustomerStatus): Promise<Customer> {
		const updated = await this.#api.updateStatus(id, status);
		this.customers = this.customers.map((customer) => (customer.id === id ? updated : customer));
		return updated;
	}
}

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error;
	return new ApiError({
		status: 0,
		code: 'UNKNOWN_ERROR',
		message: 'Error inesperado al cargar los clientes.'
	});
}

/** The store the dashboard uses. */
export const customersStore = new CustomersStore({
	list: listCustomers,
	updateStatus: updateCustomerStatus
});
