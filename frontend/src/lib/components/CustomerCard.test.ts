import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { Customer } from '#lib/types/customer.ts';
import CustomerCard from './CustomerCard.svelte';

const customer: Customer = {
	id: '6a25261c-26e6-4bc1-b4ba-fd12643c1150',
	name: 'Carmen Ruiz',
	email: 'carmen.ruiz@example.com',
	status: 'BLOCKED',
	created_at: '2026-11-09T15:55:00.000Z'
};

describe('CustomerCard', () => {
	it('shows the same data as a table row', () => {
		render(CustomerCard, { customer, onShowDetail: vi.fn() });

		const card = screen.getByRole('listitem');
		expect(card.textContent).toContain('Carmen Ruiz');
		expect(card.textContent).toContain('carmen.ruiz@example.com');
		expect(card.textContent).toContain('Bloqueado');
		expect(card.querySelector('time')?.getAttribute('datetime')).toBe(customer.created_at);
	});

	it('opens its detail from the Ver detalle button', async () => {
		const onShowDetail = vi.fn();
		render(CustomerCard, { customer, onShowDetail });

		await fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de Carmen Ruiz' }));

		expect(onShowDetail).toHaveBeenCalledExactlyOnceWith(customer);
	});
});
