import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('Customer Dashboard page', () => {
	it('returns the focus to the Ver detalle button that opened the drawer', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(customers)));
		render(Page);

		// The table and the cards both carry the button; jsdom shows the two at once.
		const [opener] = await screen.findAllByRole('button', { name: 'Ver detalle de Carmen Ruiz' });
		await fireEvent.click(opener);
		expect(screen.getByRole('dialog', { name: 'Carmen Ruiz' })).toBeTruthy();

		await fireEvent.keyDown(window, { key: 'Escape' });

		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(opener);
	});
});
