import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchInput from './SearchInput.svelte';

afterEach(() => {
	vi.useRealTimers();
});

describe('SearchInput', () => {
	it('reports the trimmed query 200 ms after the text changes', async () => {
		vi.useFakeTimers();
		const onSearch = vi.fn();
		render(SearchInput, { text: '', onSearch });

		await fireEvent.input(screen.getByRole('searchbox'), { target: { value: '  perez ' } });

		await vi.advanceTimersByTimeAsync(199);
		expect(onSearch).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(onSearch).toHaveBeenCalledExactlyOnceWith('perez');
	});

	it('restarts the wait on every keystroke', async () => {
		vi.useFakeTimers();
		const onSearch = vi.fn();
		render(SearchInput, { text: '', onSearch });
		const input = screen.getByRole('searchbox');

		await fireEvent.input(input, { target: { value: 'pe' } });
		await vi.advanceTimersByTimeAsync(150);
		await fireEvent.input(input, { target: { value: 'per' } });
		await vi.advanceTimersByTimeAsync(199);

		expect(onSearch).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(onSearch).toHaveBeenCalledExactlyOnceWith('per');
	});

	it('reports an emptied search at once, without waiting for the debounce', async () => {
		vi.useFakeTimers();
		const onSearch = vi.fn();
		render(SearchInput, { text: '', onSearch });
		const input = screen.getByRole('searchbox');

		await fireEvent.input(input, { target: { value: 'perez' } });
		await vi.advanceTimersByTimeAsync(200);
		await fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));

		expect(onSearch.mock.calls).toEqual([['perez'], ['']]);
		expect((input as HTMLInputElement).value).toBe('');
	});

	it('drops a query that was still waiting when the search is emptied', async () => {
		vi.useFakeTimers();
		const onSearch = vi.fn();
		render(SearchInput, { text: '', onSearch });
		const input = screen.getByRole('searchbox');

		await fireEvent.input(input, { target: { value: 'perez' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
		await vi.advanceTimersByTimeAsync(1000);

		expect(onSearch).not.toHaveBeenCalled();
		expect((input as HTMLInputElement).value).toBe('');
	});

	it('moves the focus back to the input when the clear button removes itself', async () => {
		vi.useFakeTimers();
		render(SearchInput, { text: 'perez', onSearch: vi.fn() });
		const input = screen.getByRole('searchbox');
		const clearButton = screen.getByRole('button', { name: 'Limpiar búsqueda' });
		clearButton.focus();

		await fireEvent.click(clearButton);

		expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).toBeNull();
		expect(document.activeElement).toBe(input);
	});
});
