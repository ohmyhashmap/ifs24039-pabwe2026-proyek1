import { afterEach, describe, expect, it, vi } from 'vitest';

describe('SPA entry point', () => {
	afterEach(() => {
		vi.doUnmock('svelte');
		vi.resetModules();
		document.body.innerHTML = '';
	});

	it('mounts the root component into the app element', async () => {
		const mount = vi.fn();
		document.body.innerHTML = '<div id="app"></div>';
		vi.doMock('svelte', async (importOriginal) => ({
			...(await importOriginal<typeof import('svelte')>()),
			mount
		}));

		await import('./main');

		expect(mount).toHaveBeenCalledWith(expect.anything(), {
			target: document.getElementById('app')
		});
	});
});
