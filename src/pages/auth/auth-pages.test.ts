import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auth, clearSession } from '#lib/auth.svelte';
import { apiResponse, stubFetch, testUser } from '../../test/helpers';
import Login from './Login.svelte';
import Register from './Register.svelte';

afterEach(() => {
	cleanup();
	clearSession();
	vi.unstubAllGlobals();
	window.history.replaceState({}, '', '/');
});

describe('Login page', () => {
	it('logs in and opens the dashboard', async () => {
		stubFetch(() => apiResponse({ token: 'tok', user: testUser }));
		render(Login);
		await fireEvent.input(screen.getByLabelText('Username'), { target: { value: ' budi ' } });
		await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'rahasia' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
		await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
		expect(auth.token).toBe('tok');
	});

	it('shows an accessible error when login fails', async () => {
		stubFetch(() => apiResponse(null, 401, 'Username atau password salah'));
		render(Login);
		await fireEvent.input(screen.getByLabelText('Username'), { target: { value: 'budi' } });
		await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'salah' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Username atau password salah');
		expect(screen.getByRole('button', { name: 'Masuk' })).toBeEnabled();
		expect(screen.getByRole('link', { name: 'Daftar' })).toHaveAttribute('href', '/auth/register');
	});
});

describe('Register page', () => {
	const fill = async () => {
		await fireEvent.input(screen.getByLabelText('Nama'), { target: { value: ' Budi ' } });
		await fireEvent.input(screen.getByLabelText('Username'), { target: { value: 'budi' } });
		await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'rahasia' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Buat Akun' }));
	};

	it('registers and opens the dashboard', async () => {
		stubFetch(() => apiResponse({ token: 'tok', user: testUser }));
		render(Register);
		await fill();
		await waitFor(() => expect(window.location.pathname).toBe('/dashboard'));
		expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/auth/login');
	});

	it('shows an error when registration fails', async () => {
		stubFetch(() => apiResponse(null, 409, 'Username sudah dipakai'));
		render(Register);
		await fill();
		expect(await screen.findByRole('alert')).toHaveTextContent('Username sudah dipakai');
	});
});
