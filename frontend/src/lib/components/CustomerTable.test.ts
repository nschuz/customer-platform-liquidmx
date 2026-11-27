import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { Customer } from '#lib/types/customer.ts';
import CustomerTable from './CustomerTable.svelte';

const customers: Customer[] = [
	{
		id: '57c15356-e1b1-4b35-9653-aa4c937e4606',
		name: 'Juan Pérez',
		email: 'juan.perez@example.com',
		status: 'ACTIVE',
		created_at: '2026-09-29T08:15:00.000Z'
	},
	{
		id: '6a25261c-26e6-4bc1-b4ba-fd12643c1150',
		name: 'Carmen Ruiz',
		email: 'carmen.ruiz@example.com',
		status: 'BLOCKED',
		created_at: '2026-11-09T15:55:00.000Z'
	}
];

function renderTable(onShowDetail = vi.fn()): HTMLElement {
	render(CustomerTable, { customers, onShowDetail });
	return screen.getByRole('table', { name: 'Clientes' }) as HTMLElement;
}

describe('CustomerTable', () => {
	it('is a named table with one column per field', () => {
		const table = renderTable();

		for (const header of ['Nombre', 'Email', 'Estado', 'Fecha de registro', 'Acciones']) {
			expect(within(table).getByRole('columnheader', { name: header })).toBeTruthy();
		}
	});

	it('opens the detail of the clicked row and hands over the button that was clicked', async () => {
		const onShowDetail = vi.fn();
		renderTable(onShowDetail);
		const button = screen.getByRole('button', { name: 'Ver detalle de Carmen Ruiz' });

		await fireEvent.click(button);

		expect(onShowDetail).toHaveBeenCalledExactlyOnceWith(customers[1], button);
	});

	it('renders one row per customer with its data', () => {
		const table = renderTable();

		expect(within(table).getAllByRole('row')).toHaveLength(3);
		expect(table.textContent).toContain('Juan Pérez');
		expect(table.textContent).toContain('juan.perez@example.com');
		expect(within(table).getByText('Activo')).toBeTruthy();
		expect(within(table).getByText('Bloqueado')).toBeTruthy();
	});

	it('shows each registration date in a <time> element carrying the ISO value', () => {
		const table = renderTable();

		const times = [...table.querySelectorAll('time')];
		expect(times.map((time) => time.getAttribute('datetime'))).toEqual([
			'2026-09-29T08:15:00.000Z',
			'2026-11-09T15:55:00.000Z'
		]);
		expect(times[0]?.textContent).toBe('29 sept 2026, 08:15 UTC');
	});
});
