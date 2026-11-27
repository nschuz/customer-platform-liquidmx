/** Narrows an `unknown` JSON value to a record, or `undefined` when it is not an object. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}
