import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import CustomerFilters from './CustomerFilters.svelte';

const counts = { ALL: 10, ACTIVE: 5, PENDING: 3, BLOCKED: 2 };

describe('CustomerFilters', () => {
	it('offers one toggle per filter, each with its count', () => {
		render(CustomerFilters, { active: 'ALL', counts, onChange: vi.fn() });

		expect(screen.getAllByRole('button')).toHaveLength(4);
		const pills: [string, number][] = [
			['Todos', 10],
			['Activos', 5],
			['Pendientes', 3],
			['Bloqueados', 2]
		];
		for (const [label, count] of pills) {
			const pill = screen.getByRole('button', { name: new RegExp(label) });
			expect(pill.textContent).toContain(String(count));
		}
	});

	it('marks only the active filter as pressed', () => {
		render(CustomerFilters, { active: 'BLOCKED', counts, onChange: vi.fn() });

		const pressed = screen.getAllByRole('button', { pressed: true });
		expect(pressed).toHaveLength(1);
		expect(pressed[0]?.textContent).toContain('Bloqueados');
		expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(3);
	});

	it('asks for the filter that was clicked', async () => {
		const onChange = vi.fn();
		render(CustomerFilters, { active: 'ALL', counts, onChange });

		await fireEvent.click(screen.getByRole('button', { name: /Pendientes/ }));

		expect(onChange).toHaveBeenCalledExactlyOnceWith('PENDING');
	});
});
