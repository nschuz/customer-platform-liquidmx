import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { customersStore } from '#lib/customers.svelte.ts';
import type { Customer } from '#lib/types/customer.ts';
import Page from './+page.svelte';

// The page imports the store, which imports the API client, which reads SvelteKit's env.
vi.mock('$app/env/public', () => ({ PUBLIC_API_URL: undefined }));

const carmen: Customer = {
	id: '6a25261c-26e6-4bc1-b4ba-fd12643c1150',
	name: 'Carmen Ruiz',
	email: 'carmen.ruiz@liquidmx.com',
	status: 'BLOCKED',
	created_at: '2026-11-09T15:55:00.000Z'
};
const juan: Customer = {
	id: '57c15356-e1b1-4b35-9653-aa4c937e4606',
	name: 'Juan Pérez',
	email: 'juan.perez@liquidmx.com',
	status: 'ACTIVE',
	created_at: '2026-09-29T08:15:00.000Z'
};
const lucia: Customer = {
	id: '3f3fc070-e756-470b-87ce-5e22114e371e',
	name: 'Lucía Díaz',
	email: 'lucia.diaz@liquidmx.com',
	status: 'ACTIVE',
	created_at: '2026-11-23T19:50:00.000Z'
};
const customers = [lucia, juan, carmen];
const juanBlocked: Customer = { ...juan, status: 'BLOCKED' };

/** Serves the list, and leaves the status change unanswered until the test says so. */
function serveApi() {
	let answerPatch!: (response: Response) => void;
	const fetchMock = vi.fn<typeof fetch>((_input, init) =>
		init?.method === 'PATCH'
			? new Promise<Response>((resolve) => {
					answerPatch = resolve;
				})
			: Promise.resolve(Response.json(customers))
	);
	vi.stubGlobal('fetch', fetchMock);
	return { fetchMock, answerPatch: (body: Customer = juanBlocked) => answerPatch(Response.json(body)) };
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
		const { fetchMock } = serveApi();
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
	});

	it('changes nothing until the server answers, then the list, the counts and the drawer', async () => {
		const { answerPatch } = serveApi();
		render(Page);
		const row = () => screen.getByRole('row', { name: /Juan Pérez/ }).textContent;
		const blockedCount = () =>
			screen.getByRole('button', { name: /^Bloqueados/ }).textContent?.replace(/\D/g, '');

		const [opener] = await screen.findAllByRole('button', { name: 'Ver detalle de Juan Pérez' });
		await fireEvent.click(opener);
		const dialog = () => screen.getByRole('dialog', { name: 'Juan Pérez' });
		await fireEvent.click(within(dialog()).getByRole('button', { name: 'Bloqueado' }));

		// Pending: the option being saved says so, and nothing else has moved.
		expect(within(dialog()).getByRole('button', { name: 'Guardando…' })).toBeTruthy();
		expect(row()).toContain('Activo');
		expect(blockedCount()).toBe('1');
		expect(screen.queryByText('Estado actualizado a Bloqueado.')).toBeNull();

		answerPatch();

		await screen.findByText('Estado actualizado a Bloqueado.');
		expect(row()).toContain('Bloqueado');
		expect(blockedCount()).toBe('2');
		const option = (name: string) =>
			within(dialog()).getByRole<HTMLButtonElement>('button', { name });
		expect(option('Bloqueado').disabled).toBe(false);
		expect(within(dialog()).getAllByRole('button', { pressed: true })).toEqual([
			option('Bloqueado')
		]);
	});

	it('returns the focus to the first row of the list when the opener left it', async () => {
		const { answerPatch } = serveApi();
		render(Page);
		await fireEvent.click(await screen.findByRole('button', { name: /^Activos/ }));
		const [opener] = await screen.findAllByRole('button', { name: 'Ver detalle de Juan Pérez' });
		await fireEvent.click(opener);
		await fireEvent.click(
			within(screen.getByRole('dialog', { name: 'Juan Pérez' })).getByRole('button', { name: 'Bloqueado' })
		);
		answerPatch();
		await screen.findByText('Estado actualizado a Bloqueado.');
		// Juan no longer matches the filter: his row is gone, and the drawer stays open on him.
		expect(screen.queryByRole('button', { name: 'Ver detalle de Juan Pérez' })).toBeNull();
		expect(screen.getByRole('dialog', { name: 'Juan Pérez' })).toBeTruthy();

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(screen.queryByRole('dialog')).toBeNull();
		// The table and the cards both carry the button: the first in the document gets the focus.
		const [firstShown] = screen.getAllByRole('button', { name: 'Ver detalle de Lucía Díaz' });
		expect(document.activeElement).toBe(firstShown);
	});

	it('leaves the focus on the search box when the filters are cleared', async () => {
		serveApi();
		render(Page);
		const search = await screen.findByRole('searchbox', { name: 'Buscar cliente' });

		// A search that matches nothing shows the empty state and its "Limpiar filtros" button.
		await fireEvent.input(search, { target: { value: 'zzz' } });
		const clearFilters = await screen.findByRole('button', { name: 'Limpiar filtros' });
		clearFilters.focus();

		await fireEvent.click(clearFilters);

		expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull();
		expect((search as HTMLInputElement).value).toBe('');
		expect(document.activeElement).toBe(search);
	});
});
