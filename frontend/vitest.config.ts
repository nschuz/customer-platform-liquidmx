import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	resolve: {
		// Svelte must resolve to its browser runtime to render in jsdom. This is only
		// safe here: in vite.config.ts it would give the SSR build the client runtime.
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		// Each file still gets its own module registry (own VM context), but the jsdom
		// environment is created once per worker instead of once per file.
		pool: 'vmThreads',
		include: ['src/**/*.test.ts']
	}
});
