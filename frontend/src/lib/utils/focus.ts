/** The controls inside a container that can take the focus. A disabled one cannot. */
const FOCUSABLE =
	'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Handles Tab and Shift+Tab on behalf of a container, so that the focus wraps around inside it
 * instead of leaving it. Any other key is left to the browser. */
export function trapTabKey(event: KeyboardEvent & { currentTarget: HTMLElement }): void {
	if (event.key !== 'Tab') return;
	const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	if (!first || !last) return;

	// The container itself (tabindex -1) holds the focus after a click on its content; leaving it
	// would be leaving the container too.
	const active = document.activeElement;
	const leaves =
		active === event.currentTarget || (event.shiftKey ? active === first : active === last);
	if (leaves) {
		event.preventDefault();
		(event.shiftKey ? last : first).focus();
	}
}

/** Focuses the first button under `root` that can take the focus. The list of the dashboard is
 * rendered twice, as a table and as cards, and only one of the two is shown: `focus()` does
 * nothing on a button that is not displayed, so the first one that answers is the first shown. */
export function focusFirstButton(root: ParentNode | null | undefined): void {
	for (const button of root?.querySelectorAll('button') ?? []) {
		button.focus();
		if (document.activeElement === button) return;
	}
}
