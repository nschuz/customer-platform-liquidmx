import { afterEach, describe, expect, it } from 'vitest';
import { focusFirstButton } from './focus.ts';

afterEach(() => {
	// The files that share a worker also share this document: leave it as it was found.
	document.body.replaceChildren();
});

function button(label: string, disabled = false): HTMLButtonElement {
	const element = document.createElement('button');
	element.textContent = label;
	element.disabled = disabled;
	return element;
}

function mount(...children: HTMLElement[]): HTMLElement {
	const root = document.createElement('div');
	root.append(...children);
	document.body.append(root);
	return root;
}

describe('focusFirstButton', () => {
	it('focuses the first button under the root', () => {
		const first = button('one');
		const root = mount(first, button('two'));

		focusFirstButton(root);

		expect(document.activeElement).toBe(first);
	});

	it('goes on to the next button when one cannot take the focus', () => {
		// The list is rendered twice, as a table and as cards, and only one of the two is shown:
		// `focus()` does nothing on a button that is not displayed. A disabled button stands in
		// for it here, because jsdom has no layout.
		const hidden = button('hidden', true);
		const shown = button('shown');

		focusFirstButton(mount(hidden, shown));

		expect(document.activeElement).toBe(shown);
	});

	it('leaves the focus where it is when no button under the root can take it', () => {
		const elsewhere = button('elsewhere');
		document.body.append(elsewhere);
		elsewhere.focus();

		focusFirstButton(mount(button('hidden', true)));

		expect(document.activeElement).toBe(elsewhere);
	});
});
