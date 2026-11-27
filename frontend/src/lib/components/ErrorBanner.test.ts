import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/services/customerApi.ts';
import ErrorBanner from './ErrorBanner.svelte';

// The client module reads PUBLIC_API_URL from SvelteKit's env, which only exists inside the app.
vi.mock('$app/env/public', () => ({ PUBLIC_API_URL: undefined }));

/** What the banner says when the request got no answer. */
const CONNECTION_MESSAGE =
	'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';

describe('ErrorBanner', () => {
	it('shows the failure as an alert and retries when asked', async () => {
		const onRetry = vi.fn();
		render(ErrorBanner, {
			error: new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Failed to fetch' }),
			onRetry
		});

		// In Spanish, whatever the browser said: that text never gets to the user.
		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain(CONNECTION_MESSAGE);
		expect(alert.textContent).not.toContain('Failed to fetch');

		await fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

		expect(onRetry).toHaveBeenCalledOnce();
	});

	it('leads what the server said with a message in Spanish', () => {
		render(ErrorBanner, {
			error: new ApiError({
				status: 500,
				code: 'INTERNAL_SERVER_ERROR',
				message: 'Internal server error.',
				requestId: 'abc-123'
			}),
			onRetry: vi.fn()
		});

		const text = screen.getByRole('alert').textContent ?? '';
		expect(text).toContain('No se pudieron cargar los clientes. Internal server error.');
		expect(text).toContain('abc-123');
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
