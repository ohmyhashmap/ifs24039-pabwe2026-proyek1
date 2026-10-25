import { vi } from 'vitest';
import { clearSession, setSession } from '#lib/auth.svelte';

export const testUser = { id: 1, username: 'budi', name: 'Budi Santoso' };

export function apiResponse(data: unknown, status = 200, error?: string) {
	return new Response(JSON.stringify({ success: status < 400, data, error }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

export function stubFetch(
	handler: (url: string, init?: RequestInit) => Response | Promise<Response>
) {
	const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url =
			typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
		return handler(url, init);
	});
	vi.stubGlobal('fetch', mock);
	return mock;
}

export function loginAs(user = testUser) {
	setSession('token-123', user);
}

export function logoutNow() {
	clearSession();
}
