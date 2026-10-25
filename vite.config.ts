import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Converts render-blocking `<link rel="stylesheet">` tags injected by Vite
 * into non-render-blocking `<link rel="preload" as="style" onload="…">` with
 * a `<noscript>` fallback so the CSS is loaded asynchronously.
 */
function asyncCssPlugin(): Plugin {
	return {
		name: 'async-css',
		enforce: 'post',
		transformIndexHtml(html) {
			return html.replace(
				/<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
				(_match, href) =>
					`<link rel="preload" as="style" crossorigin href="${href}" onload="this.onload=null;this.rel='stylesheet'">\n\t\t<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`
			);
		}
	};
}

export default defineConfig({
	plugins: [svelte(), svelteTesting(), tailwindcss(), asyncCssPlugin()],
	resolve: {
		alias: {
			'#lib': path.resolve(root, 'src/lib')
		}
	},
	server: {
		proxy: {
			'/api': {
				target: process.env.VITE_API_URL || 'http://localhost:8787',
				changeOrigin: true
			}
		}
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'html', 'json-summary'],
			reportsDirectory: './coverage',
			include: ['src/**/*.{ts,svelte}'],
			exclude: ['src/**/*.{test,spec}.{ts,js}', 'src/test/**'],
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100
			}
		}
	}
});
