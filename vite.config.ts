import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Server `vite preview` does not read `vercel.json`, so cache and security
 * headers are applied here for preview deployments.
 */
function cacheHeadersPlugin(): Plugin {
	const apply = (req: { url?: string }, res: { setHeader: (k: string, v: string) => void }) => {
		const url = (req.url ?? '').split('?')[0];
		if (url.startsWith('/assets/')) {
			res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
		} else if (url === '/' || url.endsWith('.html')) {
			res.setHeader('Cache-Control', 'no-cache');
		} else if (/\.(svg|ico|png|jpe?g|webp|avif|woff2?)$/.test(url)) {
			res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
		} else if (/\.(json|txt)$/.test(url)) {
			res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
		}
		res.setHeader('X-Content-Type-Options', 'nosniff');
	};
	return {
		name: 'cache-headers',
		configurePreviewServer(server) {
			server.middlewares.use((req, res, next) => {
				apply(req, res);
				next();
			});
		}
	};
}

export default defineConfig({
	plugins: [svelte(), svelteTesting(), tailwindcss(), cacheHeadersPlugin()],
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
