import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	api,
	auth,
	clearSession,
	jsonHeaders,
	loadProfile,
	login,
	logout,
	navigate,
	normalizePath,
	register,
	setSession
} from './auth.svelte';
import { apiResponse, stubFetch, testUser } from '../test/helpers';

afterEach(() => {
	clearSession();
	vi.unstubAllGlobals();
	window.history.replaceState({}, '', '/');
});

describe('session helpers', () => {
	it('normalizes paths', () => {
		expect(normalizePath('/profil///')).toBe('/profil');
		expect(normalizePath('/')).toBe('/');
	});

	it('navigates with push and replace and notifies listeners', () => {
		const listener = vi.fn();
		window.addEventListener('popstate', listener);
		navigate('/a');
		navigate('/b', true);
		window.removeEventListener('popstate', listener);
		expect(window.location.pathname).toBe('/b');
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('stores and clears the session', () => {
		setSession('abc', testUser);
		expect(localStorage.getItem('sigapasap_token')).toBe('abc');
		expect(auth.user).toEqual(testUser);
		clearSession();
		expect(localStorage.getItem('sigapasap_token')).toBeNull();
		expect(auth.token).toBeNull();
	});

	it('builds JSON headers with and without token', () => {
		expect(jsonHeaders()).toEqual({ 'Content-Type': 'application/json' });
		setSession('abc', testUser);
		expect(jsonHeaders()).toEqual({
			'Content-Type': 'application/json',
			Authorization: 'Bearer abc'
		});
	});

	it('logout clears the session and opens the login page', () => {
		setSession('abc', testUser);
		logout();
		expect(auth.token).toBeNull();
		expect(window.location.pathname).toBe('/auth/login');
	});
});

describe('api', () => {
	it('uses configured VITE_API_URL when set', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.com');
		const fetchMock = stubFetch(() => apiResponse({ ok: 1 }));
		await api('/endpoint');
		expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/endpoint');
		vi.unstubAllEnvs();
	});

	it('sends GET requests without body or token', async () => {
		const fetchMock = stubFetch(() => apiResponse({ ok: 1 }));
		await expect(api('/x')).resolves.toEqual({ ok: 1 });
		const init = fetchMock.mock.calls[0][1]!;
		expect(init.method).toBe('GET');
		expect(init.body).toBeUndefined();
		expect(init.headers).toEqual({ Accept: 'application/json' });
	});

	it('sends JSON bodies with the bearer token', async () => {
		setSession('abc', testUser);
		const fetchMock = stubFetch(() => apiResponse({}));
		await api('/x', { method: 'PUT', body: { a: 1 } });
		const init = fetchMock.mock.calls[0][1]!;
		expect(init.method).toBe('PUT');
		expect(init.body).toBe('{"a":1}');
		expect(init.headers).toMatchObject({
			Authorization: 'Bearer abc',
			'Content-Type': 'application/json'
		});
	});

	it('throws the server error message', async () => {
		stubFetch(() => apiResponse(null, 400, 'Username sudah dipakai'));
		await expect(api('/x')).rejects.toThrow('Username sudah dipakai');
	});

	it('throws a default message for unreadable responses', async () => {
		stubFetch(() => new Response('<html>', { status: 500 }));
		await expect(api('/x')).rejects.toThrow('Terjadi kesalahan. Silakan coba lagi.');
	});

	it('clears an expired session on 401 but ignores 401 without a session', async () => {
		setSession('abc', testUser);
		stubFetch(() => apiResponse(null, 401, 'Sesi berakhir'));
		await expect(api('/x')).rejects.toThrow('Sesi berakhir');
		expect(auth.token).toBeNull();
		await expect(api('/x')).rejects.toThrow('Sesi berakhir');
	});
});

describe('login, register and profile', () => {
	it('logs in', async () => {
		const fetchMock = stubFetch(() => apiResponse({ token: 't1', user: testUser }));
		await login('budi', 'rahasia');
		expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/auth/login');
		expect(auth.token).toBe('t1');
	});

	it('registers', async () => {
		const fetchMock = stubFetch(() => apiResponse({ token: 't2', user: testUser }));
		await register('Budi', 'budi', 'rahasia');
		expect(fetchMock.mock.calls[0][1]!.body).toBe(
			JSON.stringify({ name: 'Budi', username: 'budi', password: 'rahasia' })
		);
		expect(auth.token).toBe('t2');
	});

	it('loads the profile only when needed', async () => {
		const fetchMock = stubFetch(() => apiResponse(testUser));
		await loadProfile();
		expect(fetchMock).not.toHaveBeenCalled();

		setSession('abc', testUser);
		await loadProfile();
		expect(fetchMock).not.toHaveBeenCalled();

		auth.user = null;
		await loadProfile();
		expect(auth.user).toEqual(testUser);
	});

	it('ignores profile loading errors', async () => {
		setSession('abc', testUser);
		auth.user = null;
		stubFetch(() => apiResponse(null, 500, 'gagal'));
		await loadProfile();
		expect(auth.user).toBeNull();
	});
});
