import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { customersStore } from '#lib/customers.svelte.ts';
import type { Customer } from '#lib/types/customer.ts';
import Page from './+page.svelte';

// The page imports the store, which imports the API client, which reads SvelteKit's env.
vi.mock('$app/env/public', () => ({ PUBLIC_API_URL: undefined }));

const customers: Customer[] = [
	{
		id: '6a25261c-26e6-4bc1-b4ba-fd12643c1150',
		name: 'Carmen Ruiz',
		email: 'carmen.ruiz@example.com',
		status: 'BLOCKED',
		created_at: '2026-11-09T15:55:00.000Z'
	},
	{
		id: '57c15356-e1b1-4b35-9653-aa4c937e4606',
		name: 'Juan Pérez',
		email: 'juan.perez@example.com',
		status: 'ACTIVE',
		created_at: '2026-09-29T08:15:00.000Z'
	}
];
const [carmen, juan] = customers;

/** Serves the list, and answers a status change with the customer already updated. */
function serveApi() {
	const fetchMock = vi.fn<typeof fetch>((_input, init) => {
		const body = init?.method === 'PATCH' ? { ...juan, status: 'BLOCKED' } : customers;
		return Promise.resolve(Response.json(body));
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('Customer Dashboard page', () => {
	it('returns the focus to the Ver detalle button that opened the drawer', async () => {
		serveApi();
		render(Page);

		// The table and the cards both carry the button; jsdom shows the two at once.
		const [opener] = await screen.findAllByRole('button', { name: 'Ver detalle de Carmen Ruiz' });
		await fireEvent.click(opener);
		expect(screen.getByRole('dialog', { name: 'Carmen Ruiz' })).toBeTruthy();

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(opener);
	});

	it('sends the status chosen in the drawer to the store, for the customer that is open', async () => {
		const fetchMock = serveApi();
		const updateStatus = vi.spyOn(customersStore, 'updateStatus');
		render(Page);

		const [opener] = await screen.findAllByRole('button', { name: 'Ver detalle de Juan Pérez' });
		await fireEvent.click(opener);
		const control = within(screen.getByRole('dialog', { name: 'Juan Pérez' })).getByRole('group', {
			name: 'Cambiar estado'
		});

		await fireEvent.click(within(control).getByRole('button', { name: 'Bloqueado' }));

		expect(updateStatus).toHaveBeenCalledExactlyOnceWith(juan.id, 'BLOCKED');
		const [url, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH') ?? [];
		expect(url).toBe(`/api/customers/${juan.id}/status`);
		expect(init).toMatchObject({ method: 'PATCH', body: JSON.stringify({ status: 'BLOCKED' }) });

		// The list follows the answer of the server.
		await waitFor(() => {
			expect(screen.getByRole('row', { name: /Juan Pérez/ }).textContent).toContain('Bloqueado');
		});
	});
});
