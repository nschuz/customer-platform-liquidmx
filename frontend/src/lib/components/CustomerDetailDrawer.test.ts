import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { Customer } from '#lib/types/customer.ts';
import CustomerDetailDrawer from './CustomerDetailDrawer.svelte';

const customer: Customer = {
	id: '6a25261c-26e6-4bc1-b4ba-fd12643c1150',
	name: 'Carmen Ruiz',
	email: 'carmen.ruiz@example.com',
	status: 'BLOCKED',
	created_at: '2026-11-09T15:55:00.000Z'
};

function renderDrawer(onClose = vi.fn()) {
	const result = render(CustomerDetailDrawer, { customer, onClose });
	return { ...result, onClose };
}

describe('CustomerDetailDrawer', () => {
	it('is a modal dialog named after the customer', () => {
		renderDrawer();

		const dialog = screen.getByRole('dialog', { name: 'Carmen Ruiz' });
		expect(dialog.getAttribute('aria-modal')).toBe('true');
	});

	it('shows every field, the status and the date both formatted and raw', () => {
		renderDrawer();

		const dialog = screen.getByRole('dialog');
		expect(dialog.textContent).toContain('carmen.ruiz@example.com');
		expect(dialog.textContent).toContain('Bloqueado');
		expect(dialog.textContent).toContain('BLOCKED');
		expect(dialog.textContent).toContain('09 nov 2026, 15:55 UTC');
		expect(dialog.textContent).toContain('2026-11-09T15:55:00.000Z');
		expect(dialog.textContent).toContain('6a25261c-26e6-4bc1-b4ba-fd12643c1150');
	});

	it('takes the focus when it opens', () => {
		renderDrawer();

		expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
	});

	it('closes with the Escape key', async () => {
		const { onClose } = renderDrawer();

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).toHaveBeenCalledOnce();
	});

	it('closes with the close button', async () => {
		const { onClose } = renderDrawer();

		await fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

		expect(onClose).toHaveBeenCalledOnce();
	});

	it('closes with a click on the backdrop', async () => {
		const { onClose } = renderDrawer();
		const backdrop = screen.getByRole('dialog').parentElement?.firstElementChild;

		await fireEvent.click(backdrop as HTMLElement);

		expect(onClose).toHaveBeenCalledOnce();
	});

	it('keeps the focus inside when tabbing', async () => {
		renderDrawer();
		const closeButton = screen.getByRole('button', { name: 'Cerrar detalle' });

		closeButton.focus();
		await fireEvent.keyDown(closeButton, { key: 'Tab' });
		expect(document.activeElement).toBe(closeButton);

		await fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
		expect(document.activeElement).toBe(closeButton);
	});

	it('locks the scroll of the page while it is open', () => {
		document.body.style.overflow = 'auto';
		const { unmount } = renderDrawer();

		expect(document.body.style.overflow).toBe('hidden');

		unmount();

		expect(document.body.style.overflow).toBe('auto');
	});
});
