const TOKEN_KEY = 'sigapasap_token';

function getApiBase(): string {
	return import.meta.env.VITE_API_URL || '';
}

export interface User {
	id: number;
	username: string;
	name: string;
}

export interface MyReport {
	id: number;
	severity: string;
	description: string;
	created_at: string;
}

interface Session {
	token: string | null;
	user: User | null;
}

export const auth: Session = $state({
	token: localStorage.getItem(TOKEN_KEY),
	user: null
});

export const PROTECTED_PATHS = ['/dashboard', '/laporan-saya', '/profil', '/pengaturan'];
export const GUEST_ONLY_PATHS = ['/auth/login', '/auth/register'];

export function normalizePath(pathname: string): string {
	return pathname.replace(/\/+$/, '') || '/';
}

/** Pindah halaman tanpa reload; didengarkan oleh router di App.svelte. */
export function navigate(path: string, replace = false) {
	if (replace) window.history.replaceState({}, '', path);
	else window.history.pushState({}, '', path);
	window.dispatchEvent(new PopStateEvent('popstate'));
}

export function setSession(token: string, user: User) {
	localStorage.setItem(TOKEN_KEY, token);
	auth.token = token;
	auth.user = user;
}

export function clearSession() {
	localStorage.removeItem(TOKEN_KEY);
	auth.token = null;
	auth.user = null;
}

export async function api<T>(
	path: string,
	options: { method?: string; body?: unknown } = {}
): Promise<T> {
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
	if (options.body !== undefined) headers['Content-Type'] = 'application/json';

	const res = await fetch(`${getApiBase()}/api/v1${path}`, {
		method: options.method ?? 'GET',
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body)
	});
	const payload = await res.json().catch(() => null);

	if (res.status === 401 && auth.token) clearSession();
	if (!res.ok || !payload?.success) {
		throw new Error(payload?.error || 'Terjadi kesalahan. Silakan coba lagi.');
	}
	return payload.data as T;
}

interface AuthResult {
	token: string;
	user: User;
}

export async function login(username: string, password: string) {
	const data = await api<AuthResult>('/auth/login', {
		method: 'POST',
		body: { username, password }
	});
	setSession(data.token, data.user);
}

export async function register(name: string, username: string, password: string) {
	const data = await api<AuthResult>('/auth/register', {
		method: 'POST',
		body: { name, username, password }
	});
	setSession(data.token, data.user);
}

export async function loadProfile() {
	if (!auth.token || auth.user) return;
	try {
		auth.user = await api<User>('/auth/me');
	} catch {
		// 401 sudah membersihkan sesi; error lain diabaikan agar halaman tetap tampil.
	}
}

export function logout() {
	clearSession();
	navigate('/auth/login');
}

/** Header JSON untuk request manual; menyertakan token agar laporan terhubung ke akun. */
export function jsonHeaders(): Record<string, string> {
	return auth.token
		? { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` }
		: { 'Content-Type': 'application/json' };
}
