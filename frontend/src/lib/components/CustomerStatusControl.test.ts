import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { CustomerStatus } from '#lib/types/customer.ts';
import CustomerStatusControl from './CustomerStatusControl.svelte';

/** The label an option gets while its status is being saved. */
const PENDING_LABEL = 'Guardando…';

function renderControl(props: { status?: CustomerStatus; pending?: CustomerStatus | null } = {}) {
	const onChange = vi.fn<(status: CustomerStatus) => void>();
	const view = render(CustomerStatusControl, {
		status: 'BLOCKED',
		pending: null,
		onChange,
		...props
	});
	const fieldset = screen.getByRole('group', { name: 'Cambiar estado' });
	const options = () => within(fieldset).getAllByRole<HTMLButtonElement>('button');
	const option = (name: string) =>
		within(fieldset).getByRole<HTMLButtonElement>('button', { name });
	return { ...view, onChange, fieldset, options, option };
}

describe('CustomerStatusControl', () => {
	it('offers the three statuses, in order, in a group named "Cambiar estado"', () => {
		const { fieldset } = renderControl();

		const options = within(fieldset).getAllByRole('button');
		expect(options.map((option) => option.textContent?.trim())).toEqual([
			'Activo',
			'Pendiente',
			'Bloqueado'
		]);
	});

	it('marks the current status as the only pressed option', () => {
		const { option } = renderControl({ status: 'PENDING' });

		const pressed = screen.getAllByRole('button', { pressed: true });
		expect(pressed).toEqual([option('Pendiente')]);
	});

	it('lets every option be used when nothing is being saved', () => {
		const { fieldset, options } = renderControl();

		expect(fieldset.getAttribute('aria-busy')).toBe('false');
		for (const control of options()) expect(control.disabled).toBe(false);
	});

	it('asks for the status of the option that was clicked', async () => {
		const { onChange, option } = renderControl({ status: 'BLOCKED' });

		await fireEvent.click(option('Activo'));

		expect(onChange).toHaveBeenCalledExactlyOnceWith('ACTIVE');
	});

	it('asks for nothing when the pressed option is clicked', async () => {
		const { onChange, option } = renderControl({ status: 'BLOCKED' });

		await fireEvent.click(option('Bloqueado'));

		expect(onChange).not.toHaveBeenCalled();
	});

	it('disables every option and marks the group busy while a status is being saved', () => {
		const { fieldset, options } = renderControl({ pending: 'ACTIVE' });

		expect(fieldset.getAttribute('aria-busy')).toBe('true');
		const controls = options();
		expect(controls).toHaveLength(3);
		for (const control of controls) expect(control.disabled).toBe(true);
	});

	it('shows the pending label and a hidden spinner on the option being saved', () => {
		const { option } = renderControl({ pending: 'ACTIVE' });

		const saving = option(PENDING_LABEL);
		expect(saving.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
		expect(saving.textContent?.trim()).toBe(PENDING_LABEL);
	});

	it('keeps the current status pressed while another one is being saved', () => {
		const { option } = renderControl({ status: 'BLOCKED', pending: 'ACTIVE' });

		// Nothing is optimistic: the customer is still BLOCKED on the server.
		expect(screen.getAllByRole('button', { pressed: true })).toEqual([option('Bloqueado')]);
	});

	it('announces the pending label in a live region that is always there', async () => {
		const { rerender } = renderControl();
		const live = () => screen.getByRole('status');

		// Empty until there is something to say: a region that appears with its text is often not spoken.
		expect(live().textContent).toBe('');

		await rerender({ pending: 'ACTIVE' });
		expect(live().textContent).toBe(PENDING_LABEL);

		await rerender({ pending: null });
		expect(live().textContent).toBe('');
	});

	it('asks for nothing while a status is being saved', async () => {
		const { onChange, option, rerender } = renderControl({ status: 'BLOCKED' });

		await fireEvent.click(option('Activo'));
		// The owner of the request then reports it as pending, which disables the options. A browser
		// does not hand a click on a disabled button on, but the control does not rely on that.
		await rerender({ pending: 'ACTIVE' });
		await fireEvent.click(option('Pendiente'));

		expect(onChange).toHaveBeenCalledExactlyOnceWith('ACTIVE');
	});

	it('gives the focus back to the saved option when the browser dropped it', async () => {
		const { rerender, option } = renderControl();
		option('Activo').focus();
		await rerender({ pending: 'ACTIVE' });
		// A control that becomes disabled is blurred and the focus falls to <body>. jsdom does not
		// do it, so the test does: this is where a user is left while the request is in flight.
		option(PENDING_LABEL).blur();
		expect(document.activeElement).toBe(document.body);

		await rerender({ pending: null });

		expect(document.activeElement).toBe(option('Activo'));
	});

	it('leaves the focus where the user put it', async () => {
		const elsewhere = document.createElement('button');
		document.body.append(elsewhere);
		try {
			const { rerender } = renderControl({ pending: 'ACTIVE' });
			elsewhere.focus();

			await rerender({ pending: null });

			expect(document.activeElement).toBe(elsewhere);
		} finally {
			elsewhere.remove();
		}
	});
});
