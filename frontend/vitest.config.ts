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
		include: ['src/**/*.test.ts']
	}
});
