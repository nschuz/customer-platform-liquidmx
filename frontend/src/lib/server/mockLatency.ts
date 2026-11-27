const MIN_LATENCY_MS = 300;
const MAX_LATENCY_MS = 600;

/** Waits 300–600 ms, so that the loading states of the UI are visible with the mock. */
export function simulateLatency(): Promise<void> {
	const delay = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
	return new Promise((resolve) => setTimeout(resolve, delay));
}
