/** Time zone every date of the dashboard is displayed in. */
export const DISPLAY_TIME_ZONE = 'UTC';

/** Formats an ISO date like `27 nov 2026, 14:30 UTC`, naming the time zone it uses. */
export function formatDateTime(iso: string, timeZone: string = DISPLAY_TIME_ZONE): string {
	const date = new Date(iso);
	// Not a date the API should ever send: show it raw rather than break the whole list.
	if (Number.isNaN(date.getTime())) return iso;

	const formatter = new Intl.DateTimeFormat('es', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone
	});
	return `${formatter.format(date)} ${timeZone}`;
}
