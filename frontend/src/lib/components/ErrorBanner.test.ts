import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/services/customerApi.ts';
import ErrorBanner from './ErrorBanner.svelte';

// The client module reads PUBLIC_API_URL from SvelteKit's env, which only exists inside the app.
vi.mock('$app/env/public', () => ({ PUBLIC_API_URL: undefined }));

describe('ErrorBanner', () => {
	it('shows the message as an alert and retries when asked', async () => {
		const onRetry = vi.fn();
		render(ErrorBanner, {
			error: new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Sin conexión' }),
			onRetry
		});

		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain('Sin conexión');

		await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

		expect(onRetry).toHaveBeenCalledOnce();
	});

	it('shows the request id when the server sent one', () => {
		render(ErrorBanner, {
			error: new ApiError({ status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Fallo', requestId: 'abc-123' }),
			onRetry: vi.fn()
		});

		expect(screen.getByRole('alert').textContent).toContain('abc-123');
	});

	it('leaves the request id out when there is none', () => {
		render(ErrorBanner, {
			error: new ApiError({ status: 0, code: 'TIMEOUT', message: 'Demasiado lento' }),
			onRetry: vi.fn()
		});

		expect(screen.getByRole('alert').textContent).not.toContain('solicitud');
	});
});
