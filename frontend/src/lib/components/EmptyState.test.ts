import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from './EmptyState.svelte';

describe('EmptyState', () => {
	it('says that no customer is registered, without a button', () => {
		render(EmptyState, { variant: 'no-customers' });

		expect(screen.getByRole('heading').textContent).toContain('No hay clientes registrados');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('says that nothing matches and offers to clear the filters', async () => {
		const onClearFilters = vi.fn();
		render(EmptyState, { variant: 'no-results', onClearFilters });

		expect(screen.getByRole('heading').textContent).toContain('Sin resultados');

		await fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

		expect(onClearFilters).toHaveBeenCalledOnce();
	});
});
