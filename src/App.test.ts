import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';
import { auth, clearSession } from '#lib/auth.svelte';
import { apiResponse, loginAs, stubFetch } from './test/helpers';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	window.history.replaceState({}, '', '/');
	document.documentElement.classList.remove('light');
	localStorage.clear();
	clearSession();
});

describe('SPA navigation', () => {
	beforeEach(() => {
		window.history.replaceState({}, '', '/');
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => ({
				json: async () => ({
					success: true,
					data: String(input).includes('/stats')
						? { totalHotspots: 0 }
						: String(input).includes('/news/')
							? {
									slug: 'sample',
									title: 'Artikel contoh',
									category: 'Karhutla',
									author: 'Redaksi',
									date: '2026-01-01',
									image: '/article.jpg',
									excerpt: 'Ringkasan',
									content: 'Isi'
								}
							: []
				})
			}))
		);
	});

	it('navigates to the about page without reloading', async () => {
		render(App);

		expect(screen.getByRole('heading', { name: /lindungi keluarga dari/i })).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('link', { name: 'Pelajari Inovasi' }));

		expect(window.location.pathname).toBe('/tentang');
		expect(screen.getByRole('heading', { name: 'Tentang SigapAsap' })).toBeInTheDocument();
	});

	it.each([
		['/lapor', 'Pusat Pelaporan Warga'],
		['/statistik', 'Statistik & Analitik'],
		['/tentang', 'Tentang SigapAsap'],
		['/berita', 'Belum ada berita untuk ditampilkan saat ini.'],
		['/berita/sample', 'Artikel contoh'],
		['/peta', 'Buka Info']
	])('resolves the %s route', async (path, content) => {
		window.history.replaceState({}, '', path);
		render(App);
		if (path === '/berita/sample') {
			expect(await screen.findByRole('heading', { name: content })).toBeInTheDocument();
		} else {
			expect(await screen.findByText(content)).toBeInTheDocument();
		}
	});

	it('normalizes trailing slashes and displays the not-found route for unknown paths', () => {
		window.history.replaceState({}, '', '/tentang///');
		const { unmount } = render(App);
		expect(screen.getByRole('heading', { name: 'Tentang SigapAsap' })).toBeInTheDocument();
		unmount();
		window.history.replaceState({}, '', '/unknown');
		render(App);
		expect(screen.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
	});

	it('responds to browser back and forward navigation', async () => {
		render(App);
		await fireEvent.click(screen.getByRole('link', { name: 'Pelajari Inovasi' }));
		window.history.pushState({}, '', '/');
		window.dispatchEvent(new PopStateEvent('popstate'));
		await waitFor(() =>
			expect(screen.getByRole('heading', { name: /lindungi keluarga dari/i })).toBeInTheDocument()
		);
		window.history.pushState({}, '', '/tentang');
		window.dispatchEvent(new PopStateEvent('popstate'));
		await waitFor(() =>
			expect(screen.getByRole('heading', { name: 'Tentang SigapAsap' })).toBeInTheDocument()
		);
	});

	it('toggles theme and mobile navigation while preserving modified and external clicks', async () => {
		localStorage.setItem('theme', 'light');
		const { container } = render(App);
		await waitFor(() => expect(document.documentElement).toHaveClass('light'));
		await fireEvent.click(screen.getByRole('button', { name: 'Ubah tema' }));
		expect(document.documentElement).not.toHaveClass('light');
		expect(localStorage.getItem('theme')).toBe('dark');
		await fireEvent.click(screen.getByRole('button', { name: 'Ubah tema' }));
		expect(document.documentElement).toHaveClass('light');
		expect(localStorage.getItem('theme')).toBe('light');

		const menu = screen.getByRole('button', { name: 'Buka menu navigasi' });
		await fireEvent.click(menu);
		expect(screen.getByRole('button', { name: 'Tutup menu navigasi' })).toBeInTheDocument();
		await fireEvent.click(screen.getAllByRole('link', { name: 'Tentang Kami' })[0]);
		expect(window.location.pathname).toBe('/tentang');

		const external = document.createElement('a');
		external.href = 'https://example.com';
		container.append(external);
		await fireEvent.click(external);
		expect(window.location.pathname).toBe('/tentang');

		const downloadable = document.createElement('a');
		downloadable.href = '/lapor';
		downloadable.download = 'report';
		container.append(downloadable);
		await fireEvent.click(downloadable);
		expect(window.location.pathname).toBe('/tentang');

		const newTab = document.createElement('a');
		newTab.href = '/lapor';
		newTab.target = '_blank';
		container.append(newTab);
		await fireEvent.click(newTab);
		expect(window.location.pathname).toBe('/tentang');
	});

	it('ignores modified clicks, non-left clicks, and already-handled events', async () => {
		const { container } = render(App);
		const anchor = document.createElement('a');
		anchor.href = '/tentang';
		container.append(anchor);

		await fireEvent.click(anchor, { ctrlKey: true });
		await fireEvent.click(anchor, { metaKey: true });
		await fireEvent.click(anchor, { shiftKey: true });
		await fireEvent.click(anchor, { altKey: true });
		await fireEvent.click(anchor, { button: 1 });

		const handled = new MouseEvent('click', { bubbles: true, cancelable: true });
		anchor.addEventListener('click', (event) => event.preventDefault(), { once: true });
		anchor.dispatchEvent(handled);

		expect(window.location.pathname).toBe('/');
	});

	it('supports a light theme default and closes the mobile menu after navigation', async () => {
		const { container } = render(App);
		expect(document.documentElement).not.toHaveClass('light');

		await fireEvent.click(screen.getByRole('button', { name: 'Buka menu navigasi' }));
		const mobileNavLink = screen.getAllByRole('link', { name: 'Tentang Kami' }).at(-1);
		expect(mobileNavLink).toBeDefined();
		await fireEvent.click(mobileNavLink!);
		expect(screen.getByRole('button', { name: 'Buka menu navigasi' })).toBeInTheDocument();
	});

	it('handles clicks whose target is not an anchor', async () => {
		const { container } = render(App);
		await fireEvent.click(container.querySelector('main')!);
		expect(window.location.pathname).toBe('/');
	});

	it('ignores clicks that do not originate from an element', () => {
		render(App);
		document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		expect(window.location.pathname).toBe('/');
	});

	it('does not navigate for links to the current hash only', async () => {
		const { container } = render(App);
		const anchor = document.createElement('a');
		anchor.href = 'https://example.com/#section';
		container.append(anchor);
		await fireEvent.click(anchor);
		expect(window.location.pathname).toBe('/');
	});
});

describe('authentication guard and navbar', () => {
	it('redirects guests away from protected pages', async () => {
		stubFetch(() => apiResponse([]));
		window.history.replaceState({}, '', '/dashboard');
		render(App);
		expect(await screen.findByRole('heading', { name: 'Masuk' })).toBeInTheDocument();
		expect(window.location.pathname).toBe('/auth/login');
		expect(screen.getByRole('link', { name: 'Masuk' })).toBeInTheDocument();
	});

	it.each([
		['/dashboard', /Halo,/],
		['/laporan-saya', 'Laporan Saya'],
		['/profil', 'Profil'],
		['/pengaturan', 'Pengaturan']
	])('opens %s for signed-in users', async (path, heading) => {
		loginAs();
		stubFetch(() => apiResponse([]));
		window.history.replaceState({}, '', path);
		render(App);
		expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
		expect(window.location.pathname).toBe(path);
	});

	it('shows register for guests and sends signed-in users to the dashboard', async () => {
		stubFetch(() => apiResponse([]));
		window.history.replaceState({}, '', '/auth/register');
		const { unmount } = render(App);
		expect(await screen.findByRole('heading', { name: 'Daftar' })).toBeInTheDocument();
		unmount();

		loginAs();
		window.history.replaceState({}, '', '/auth/login');
		render(App);
		expect(await screen.findByRole('heading', { name: /Halo,/ })).toBeInTheDocument();
		expect(window.location.pathname).toBe('/dashboard');
	});

	it('shows account links and signs out from the desktop and mobile menus', async () => {
		loginAs();
		stubFetch(() => apiResponse([]));
		window.history.replaceState({}, '', '/tentang');
		render(App);
		expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: 'Buka menu navigasi' }));
		expect(screen.getAllByRole('link', { name: 'Dashboard' })).toHaveLength(2);
		await fireEvent.click(screen.getAllByRole('button', { name: 'Keluar' })[1]);
		await waitFor(() => expect(window.location.pathname).toBe('/auth/login'));
		expect(auth.token).toBeNull();

		loginAs();
		await fireEvent.click(screen.getAllByRole('link', { name: 'Tentang Kami' })[0]);
		await fireEvent.click(screen.getAllByRole('button', { name: 'Keluar' })[0]);
		await waitFor(() => expect(auth.token).toBeNull());
	});

	it('shows login links in the mobile menu for guests', async () => {
		stubFetch(() => apiResponse([]));
		render(App);
		await fireEvent.click(screen.getByRole('button', { name: 'Buka menu navigasi' }));
		expect(screen.getAllByRole('link', { name: 'Masuk' })).toHaveLength(2);
	});

	it('sends users back to login when the session expires on a protected page', async () => {
		loginAs();
		stubFetch(() => apiResponse(null, 401, 'Sesi berakhir'));
		window.history.replaceState({}, '', '/laporan-saya');
		render(App);
		await waitFor(() => expect(window.location.pathname).toBe('/auth/login'));
	});
});
