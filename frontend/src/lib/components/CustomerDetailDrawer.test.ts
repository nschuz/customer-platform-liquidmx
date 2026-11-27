import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { ApiError } from '#lib/services/customerApi.ts';
import type { Customer, CustomerStatus } from '#lib/types/customer.ts';
import CustomerDetailDrawer from './CustomerDetailDrawer.svelte';

// The drawer describes a rejection through the API client, which reads SvelteKit's env.
vi.mock('$app/env/public', () => ({ PUBLIC_API_URL: undefined }));

const customer: Customer = {
	id: '6a25261c-26e6-4bc1-b4ba-fd12643c1150',
	name: 'Carmen Ruiz',
	email: 'carmen.ruiz@example.com',
	status: 'BLOCKED',
	created_at: '2026-11-09T15:55:00.000Z'
};
const anotherCustomer: Customer = {
	id: '57c15356-e1b1-4b35-9653-aa4c937e4606',
	name: 'Juan Pérez',
	email: 'juan.perez@example.com',
	status: 'ACTIVE',
	created_at: '2026-09-29T08:15:00.000Z'
};
const notFound = new ApiError({
	status: 404,
	code: 'CUSTOMER_NOT_FOUND',
	message: 'Customer not found.'
});

function renderDrawer(onClose = vi.fn(), onStatusChange = vi.fn()) {
	const result = render(CustomerDetailDrawer, { customer, onClose, onStatusChange });
	return { ...result, onClose, onStatusChange };
}

/** A change that stays in flight until the test answers it, the way a request does. */
function pendingChange() {
	let resolve!: () => void;
	let reject!: (error: unknown) => void;
	const request = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	const onStatusChange = vi.fn<(status: CustomerStatus) => Promise<void>>().mockReturnValue(request);
	return { onStatusChange, resolve, reject };
}

const statusControl = () =>
	within(screen.getByRole('dialog')).getByRole('group', { name: 'Cambiar estado' });
const options = () => within(statusControl()).getAllByRole<HTMLButtonElement>('button');
const option = (name: string) =>
	within(statusControl()).getByRole<HTMLButtonElement>('button', { name });
const pressedOptions = () => within(statusControl()).getAllByRole('button', { pressed: true });

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

	it('offers the status control inside the dialog, pressed on the status of the customer', () => {
		renderDrawer();

		expect(options().map((control) => control.textContent?.trim())).toEqual([
			'Activo',
			'Pendiente',
			'Bloqueado'
		]);
		expect(pressedOptions()).toEqual([option('Bloqueado')]);
	});

	it('asks for the status chosen in the control', async () => {
		const { onStatusChange } = renderDrawer();

		await fireEvent.click(option('Activo'));

		expect(onStatusChange).toHaveBeenCalledExactlyOnceWith('ACTIVE');
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

	it('locks the scroll of the page while it is open', () => {
		const { overflow } = document.body.style;
		document.body.style.overflow = 'auto';
		const { unmount } = renderDrawer();

		expect(document.body.style.overflow).toBe('hidden');

		unmount();

		expect(document.body.style.overflow).toBe('auto');
		// The files that share a worker also share this document: leave it as it was found.
		document.body.style.overflow = overflow;
	});
});

describe('status change of the drawer', () => {
	/** The polite live region of the drawer itself; the control has a `status` region of its own. */
	function outcomeRegion(): HTMLElement {
		const regions = screen.getByRole('dialog').querySelectorAll('[aria-live="polite"]');
		expect(regions).toHaveLength(1);
		return regions[0] as HTMLElement;
	}

	/** The row of the customer data that shows the status: badge and raw value. */
	function statusRow(): string | null | undefined {
		const label = within(screen.getByRole('dialog')).getByText('Estado', { selector: 'dt' });
		return label.nextElementSibling?.textContent;
	}

	/** Waits for the change to be over: the options are enabled again only then. */
	async function answered() {
		await waitFor(() => expect(options().every((control) => !control.disabled)).toBe(true));
	}

	it('disables every option while a change is being saved', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);

		await fireEvent.click(option('Activo'));

		expect(options()).toHaveLength(3);
		for (const control of options()) expect(control.disabled).toBe(true);
		change.resolve();
	});

	it('keeps the close button usable while a change is being saved', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));

		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Cerrar detalle' }).disabled).toBe(false);
		change.resolve();
	});

	it('asks for one change at a time', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);

		await fireEvent.click(option('Activo'));
		await fireEvent.click(option('Pendiente'));

		expect(change.onStatusChange).toHaveBeenCalledExactlyOnceWith('ACTIVE');
		change.resolve();
	});

	it('closes with the Escape key while a change is being saved', async () => {
		const change = pendingChange();
		const { onClose } = renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(onClose).toHaveBeenCalledOnce();
		change.resolve();
	});

	it('announces the outcome in a polite live region that is always there', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);
		// Empty until there is an outcome: a region that appears with its text is often not spoken.
		expect(outcomeRegion().textContent).toBe('');

		await fireEvent.click(option('Activo'));
		expect(outcomeRegion().textContent).toBe('');

		change.resolve();
		await waitFor(() => expect(outcomeRegion().textContent).toBe('Estado actualizado a Activo.'));
		expect(outcomeRegion().getAttribute('aria-live')).toBe('polite');
	});

	it('shows the new status only once the customer comes back with it', async () => {
		const change = pendingChange();
		const { rerender } = renderDrawer(vi.fn(), change.onStatusChange);

		await fireEvent.click(option('Activo'));
		change.resolve();
		// The request is over, but the customer shown is still the one the server had before.
		await waitFor(() => expect(outcomeRegion().textContent).toBe('Estado actualizado a Activo.'));
		expect(pressedOptions()).toEqual([option('Bloqueado')]);
		expect(statusRow()).toContain('BLOCKED');

		await rerender({ customer: { ...customer, status: 'ACTIVE' } });

		expect(pressedOptions()).toEqual([option('Activo')]);
		expect(statusRow()).toContain('Activo');
		expect(statusRow()).toContain('ACTIVE');
	});

	it('shows the reason as an alert when the change is rejected', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));

		change.reject(notFound);

		expect((await screen.findByRole('alert')).textContent).toBe('El cliente ya no existe.');
		expect(outcomeRegion().textContent).toBe('');
	});

	it('lets the options be used again after a change is rejected', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));

		change.reject(notFound);
		await screen.findByRole('alert');

		for (const control of options()) expect(control.disabled).toBe(false);
	});

	it('drops the previous outcome as soon as another change is asked', async () => {
		const change = pendingChange();
		change.onStatusChange.mockRejectedValueOnce(notFound); // the first change fails, the second stays in flight
		renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));
		await screen.findByRole('alert');

		await fireEvent.click(option('Pendiente'));

		expect(screen.queryByRole('alert')).toBeNull();
		change.resolve();
	});

	it('drops the notice when another customer is shown', async () => {
		const change = pendingChange();
		const { rerender } = renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));
		change.resolve();
		await screen.findByText('Estado actualizado a Activo.');

		await rerender({ customer: anotherCustomer });

		expect(outcomeRegion().textContent).toBe('');
	});

	it('drops the error when another customer is shown', async () => {
		const change = pendingChange();
		const { rerender } = renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));
		change.reject(notFound);
		await screen.findByRole('alert');

		await rerender({ customer: anotherCustomer });

		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('does not show an outcome that arrives for a customer no longer shown', async () => {
		const change = pendingChange();
		const { rerender } = renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));

		await rerender({ customer: anotherCustomer });
		change.resolve();
		await answered();

		expect(outcomeRegion().textContent).toBe('');
	});

	it('starts without an outcome when it is opened again', async () => {
		const first = renderDrawer(vi.fn().mockResolvedValue(undefined));
		await fireEvent.click(option('Activo'));
		await screen.findByText('Estado actualizado a Activo.');
		first.unmount();

		renderDrawer(vi.fn());

		expect(outcomeRegion().textContent).toBe('');
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('gives the focus back to the saved option once the change is answered', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);
		option('Activo').focus();
		await fireEvent.click(option('Activo'));
		// The browser blurs an option that becomes disabled, which jsdom does not: stand in for it.
		option('Guardando…').blur();

		change.resolve();
		await screen.findByText('Estado actualizado a Activo.');

		expect(document.activeElement).toBe(option('Activo'));
	});
});

// jsdom never moves the focus on Tab, so what is checked here is whether the drawer claims the
// key: a trapped Tab is `preventDefault`-ed, and then the drawer itself moves the focus.
describe('focus trap of the drawer', () => {
	/** Presses a key the browser could act on and tells whether the drawer claimed it. */
	async function press(element: Element, init: KeyboardEventInit): Promise<boolean> {
		const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
		await fireEvent(element, event);
		return event.defaultPrevented;
	}

	const closeButton = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Cerrar detalle' });
	const lastOption = () => option('Bloqueado');

	it('claims Tab on the last control and wraps to the first', async () => {
		renderDrawer();

		lastOption().focus();

		expect(await press(lastOption(), { key: 'Tab' })).toBe(true);
		expect(document.activeElement).toBe(closeButton());
	});

	it('claims Shift+Tab on the first control and wraps to the last', async () => {
		renderDrawer();

		closeButton().focus();

		expect(await press(closeButton(), { key: 'Tab', shiftKey: true })).toBe(true);
		expect(document.activeElement).toBe(lastOption());
	});

	it('claims Tab in both directions when the panel itself has the focus', async () => {
		renderDrawer();
		const dialog = screen.getByRole('dialog');

		// A click on the content of the drawer leaves the focus on the panel itself (tabindex -1).
		dialog.focus();

		expect(await press(dialog, { key: 'Tab', shiftKey: true })).toBe(true);
		expect(document.activeElement).toBe(lastOption());

		dialog.focus();

		expect(await press(dialog, { key: 'Tab' })).toBe(true);
		expect(document.activeElement).toBe(closeButton());
	});

	it('claims Tab in both directions while a change is pending, the close button being the only control', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));

		closeButton().focus();

		expect(await press(closeButton(), { key: 'Tab' })).toBe(true);
		expect(document.activeElement).toBe(closeButton());
		expect(await press(closeButton(), { key: 'Tab', shiftKey: true })).toBe(true);
		expect(document.activeElement).toBe(closeButton());
		change.resolve();
	});

	it('moves the focus from the panel to the close button while a change is pending, not to a disabled option', async () => {
		const change = pendingChange();
		renderDrawer(vi.fn(), change.onStatusChange);
		await fireEvent.click(option('Activo'));
		const dialog = screen.getByRole('dialog');

		dialog.focus();

		expect(await press(dialog, { key: 'Tab', shiftKey: true })).toBe(true);
		expect(document.activeElement).toBe(closeButton());

		dialog.focus();

		expect(await press(dialog, { key: 'Tab' })).toBe(true);
		expect(document.activeElement).toBe(closeButton());
		change.resolve();
	});
});
