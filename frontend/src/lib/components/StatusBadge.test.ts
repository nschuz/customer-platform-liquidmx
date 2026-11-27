import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { CustomerStatus } from '#lib/types/customer.ts';
import StatusBadge from './StatusBadge.svelte';

describe('StatusBadge', () => {
	it.each([
		['ACTIVE', 'Activo'],
		['PENDING', 'Pendiente'],
		['BLOCKED', 'Bloqueado']
	] satisfies [CustomerStatus, string][])('shows the label of %s', (status, label) => {
		render(StatusBadge, { status });

		// getByText fails the test when no element shows the label.
		expect(screen.getByText(label)).toBeTruthy();
	});
});
