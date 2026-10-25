import { describe, expect, it, vi } from 'vitest';
import { apiResponse, loginAs, logoutNow, stubFetch, testUser } from './helpers';
import { auth } from '#lib/auth.svelte';

describe('test helpers', () => {
	it('handles string, URL and Request inputs in stubFetch', async () => {
		const handler = vi.fn(async () => apiResponse({ ok: true }));
		stubFetch(handler);

		await fetch('https://example.com/str');
		expect(handler).toHaveBeenCalledWith('https://example.com/str', undefined);

		await fetch(new URL('https://example.com/url-obj'));
		expect(handler).toHaveBeenCalledWith('https://example.com/url-obj', undefined);

		await fetch(new Request('https://example.com/req-obj'));
		expect(handler).toHaveBeenCalledWith('https://example.com/req-obj', undefined);
	});

	it('creates successful and error apiResponse objects', async () => {
		const okRes = apiResponse({ message: 'success' });
		expect(okRes.status).toBe(200);
		expect(await okRes.json()).toEqual({ success: true, data: { message: 'success' } });

		const errRes = apiResponse(null, 400, 'Bad Request');
		expect(errRes.status).toBe(400);
		expect(await errRes.json()).toEqual({ success: false, data: null, error: 'Bad Request' });
	});

	it('logs in and logs out test user', () => {
		loginAs();
		expect(auth.user).toEqual(testUser);
		logoutNow();
		expect(auth.user).toBeNull();
		expect(auth.token).toBeNull();
	});
});
