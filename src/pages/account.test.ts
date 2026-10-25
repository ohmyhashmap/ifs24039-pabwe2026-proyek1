import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auth, clearSession } from '#lib/auth.svelte';
import { apiResponse, loginAs, stubFetch, testUser } from '../test/helpers';
import Dashboard from './Dashboard.svelte';
import LaporanSaya from './LaporanSaya.svelte';
import Pengaturan from './Pengaturan.svelte';
import Profil from './Profil.svelte';

const reports = [1, 2, 3, 4].map((id) => ({
	id,
	severity: 'tinggi',
	description: `Asap tebal ${id}`,
	created_at: '2026-10-01T10:00:00.000Z'
}));

afterEach(() => {
	cleanup();
	clearSession();
	vi.unstubAllGlobals();
	window.history.replaceState({}, '', '/');
});

describe('Dashboard', () => {
	it('loads the profile and shows the latest three reports', async () => {
		loginAs();
		auth.user = null;
		stubFetch((url) => apiResponse(url.endsWith('/auth/me') ? testUser : reports));
		render(Dashboard);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Halo, Pengguna');
		expect(await screen.findByText('Asap tebal 3')).toBeInTheDocument();
		expect(screen.queryByText('Asap tebal 4')).not.toBeInTheDocument();
		await waitFor(() =>
			expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Halo, Budi Santoso')
		);
	});
});

describe('Laporan Saya', () => {
	it('lists every report', async () => {
		loginAs();
		stubFetch(() => apiResponse(reports));
		render(LaporanSaya);
		expect(screen.getByRole('status')).toHaveTextContent('Memuat laporan');
		expect(await screen.findByText('Asap tebal 4')).toBeInTheDocument();
	});

	it('shows an empty state', async () => {
		loginAs();
		stubFetch(() => apiResponse([]));
		render(LaporanSaya);
		expect(await screen.findByRole('link', { name: /Kirim laporan pertama/ })).toHaveAttribute(
			'href',
			'/lapor'
		);
	});

	it('shows an error state', async () => {
		loginAs();
		stubFetch(() => apiResponse(null, 500, 'Server error'));
		render(LaporanSaya);
		expect(await screen.findByRole('alert')).toHaveTextContent('Server error');
	});
});

describe('Profil', () => {
	it('saves the name', async () => {
		loginAs();
		const fetchMock = stubFetch(() => apiResponse({ ...testUser, name: 'Budi Baru' }));
		render(Profil);
		const input = screen.getByLabelText('Nama');
		await waitFor(() => expect(input).toHaveValue('Budi Santoso'));
		await fireEvent.input(input, { target: { value: ' Budi Baru ' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
		expect(await screen.findByRole('status')).toHaveTextContent('Profil berhasil disimpan');
		expect(fetchMock.mock.calls[0][1]!.body).toBe(JSON.stringify({ name: 'Budi Baru' }));
		expect(auth.user?.name).toBe('Budi Baru');
	});

	it('shows an error and a fallback username without a profile', async () => {
		loginAs();
		auth.user = null;
		stubFetch(() => apiResponse(null, 500, 'Gagal menyimpan'));
		render(Profil);
		expect(screen.getByText('-')).toBeInTheDocument();
		await fireEvent.input(screen.getByLabelText('Nama'), { target: { value: 'X' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Gagal menyimpan');
	});

	it('logs out', async () => {
		loginAs();
		render(Profil);
		await fireEvent.click(screen.getByRole('button', { name: 'Keluar' }));
		expect(auth.token).toBeNull();
		expect(window.location.pathname).toBe('/auth/login');
	});
});

describe('Pengaturan', () => {
	const fill = async () => {
		await fireEvent.input(screen.getByLabelText('Password saat ini'), {
			target: { value: 'lama123' }
		});
		await fireEvent.input(screen.getByLabelText('Password baru'), {
			target: { value: 'baru1234' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Ubah Password' }));
	};

	it('changes the password', async () => {
		loginAs();
		const fetchMock = stubFetch(() => apiResponse({}));
		render(Pengaturan);
		await fill();
		expect(await screen.findByRole('status')).toHaveTextContent('Password berhasil diubah');
		expect(fetchMock.mock.calls[0][1]!.body).toBe(
			JSON.stringify({ currentPassword: 'lama123', newPassword: 'baru1234' })
		);
		expect(screen.getByLabelText('Password baru')).toHaveValue('');
	});

	it('shows an error', async () => {
		loginAs();
		stubFetch(() => apiResponse(null, 400, 'Password saat ini salah'));
		render(Pengaturan);
		await fill();
		expect(await screen.findByRole('alert')).toHaveTextContent('Password saat ini salah');
	});
});
