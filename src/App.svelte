<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import './app.css';
	import { auth, GUEST_ONLY_PATHS, logout, normalizePath, PROTECTED_PATHS } from '#lib/auth.svelte';
	import Home from './pages/Home.svelte';

	let currentPath = $state(window.location.pathname);
	let currentUrl = $state(
		`${window.location.pathname}${window.location.search}${window.location.hash}`
	);
	let isMobileMenuOpen = $state(false);
	let currentPage = $state<Component>(Home);
	let pageLoadVersion = 0;

	const pageLoaders: Record<string, () => Promise<{ default: Component }>> = {
		'/auth/login': () => import('./pages/auth/Login.svelte'),
		'/auth/register': () => import('./pages/auth/Register.svelte'),
		'/dashboard': () => import('./pages/Dashboard.svelte'),
		'/laporan-saya': () => import('./pages/LaporanSaya.svelte'),
		'/profil': () => import('./pages/Profil.svelte'),
		'/pengaturan': () => import('./pages/Pengaturan.svelte'),
		'/berita': () => import('./pages/Berita.svelte'),
		'/lapor': () => import('./pages/Lapor.svelte'),
		'/peta': () => import('./pages/Peta.svelte'),
		'/statistik': () => import('./pages/Statistik.svelte'),
		'/tentang': () => import('./pages/Tentang.svelte')
	};

	// Halaman terproteksi butuh login; halaman login/daftar tidak untuk yang sudah login.
	const guardRedirect = (pathname: string): string | null => {
		const path = normalizePath(pathname);
		if (PROTECTED_PATHS.includes(path) && !auth.token) return '/auth/login';
		if (GUEST_ONLY_PATHS.includes(path) && auth.token) return '/dashboard';
		return null;
	};

	const resolvePage = async (pathname: string): Promise<Component> => {
		const normalizedPath = normalizePath(pathname);
		if (normalizedPath === '/') return Home;
		if (/^\/berita\/[^/]+$/.test(normalizedPath)) {
			return (await import('./pages/BeritaDetail.svelte')).default;
		}
		const loader = pageLoaders[normalizedPath];
		if (loader) return (await loader()).default;
		return (await import('./pages/NotFound.svelte')).default;
	};

	const updateLocation = () => {
		const redirect = guardRedirect(window.location.pathname);
		if (redirect) {
			window.history.replaceState({}, '', redirect);
		}
		currentPath = window.location.pathname;
		currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		const loadVersion = ++pageLoadVersion;
		void resolvePage(currentPath)
			.then((page) => {
				if (loadVersion === pageLoadVersion) currentPage = page;
			})
			.catch((error: unknown) => {
				console.error('Gagal memuat halaman:', error);
			});
	};

	// Sesi berubah (login/logout/401) -> sinkronkan URL dengan aturan guard.
	$effect(() => {
		void auth.token;
		updateLocation();
	});

	const handleLinkClick = (event: MouseEvent) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}

		const target = event.target;
		const anchor = target instanceof Element ? target.closest('a') : null;
		if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self'))
			return;

		const destination = new URL(anchor.href);
		if (destination.origin !== window.location.origin) return;

		event.preventDefault();
		window.history.pushState({}, '', destination);
		updateLocation();
		isMobileMenuOpen = false;
	};

	// --- LOGIKA DARK/LIGHT MODE ---
	let isDarkMode = $state(true);

	onMount(() => {
		window.addEventListener('popstate', updateLocation);
		document.addEventListener('click', handleLinkClick);

		// Cek preferensi tema yang tersimpan
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme === 'light') {
			isDarkMode = false;
			document.documentElement.classList.add('light');
		} else {
			document.documentElement.classList.remove('light');
		}

		return () => {
			window.removeEventListener('popstate', updateLocation);
			document.removeEventListener('click', handleLinkClick);
		};
	});

	const toggleTheme = () => {
		isDarkMode = !isDarkMode;
		if (isDarkMode) {
			document.documentElement.classList.remove('light');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.add('light');
			localStorage.setItem('theme', 'light');
		}
	};
</script>

<svelte:head>
	<meta
		name="description"
		content="Pantau titik panas, kualitas udara, dan prediksi arah asap karhutla di Indonesia. SigapAsap menggabungkan data satelit dan laporan warga untuk peringatan dini."
	/>
</svelte:head>

<div
	class="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-200 transition-colors duration-500"
>
	<!-- NAVBAR -->
	<nav
		class="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl transition-colors duration-500"
	>
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo -->
				<div class="flex items-center gap-3">
					<a
						href="/"
						class="flex items-center gap-1 text-2xl font-extrabold tracking-tighter text-white transition-colors duration-500"
					>
						Sigap<span class="text-orange-500">Asap</span>
					</a>
				</div>

				<!-- MENU DESKTOP -->
				<div class="hidden items-center space-x-6 text-sm font-medium md:flex">
					<a href="/" class="text-slate-300 transition-colors duration-300 hover:text-white"
						>Beranda</a
					>
					<a href="/lapor" class="text-slate-300 transition-colors duration-300 hover:text-white"
						>Laporan Warga</a
					>
					<a
						href="/statistik"
						class="text-slate-300 transition-colors duration-300 hover:text-white">Statistik</a
					>
					<a href="/tentang" class="text-slate-300 transition-colors duration-300 hover:text-white"
						>Tentang Kami</a
					>

					{#if auth.token}
						<a
							href="/dashboard"
							class="text-slate-300 transition-colors duration-300 hover:text-white">Dashboard</a
						>
						<button
							type="button"
							onclick={logout}
							class="text-slate-300 transition-colors duration-300 hover:text-white">Keluar</button
						>
					{:else}
						<a
							href="/auth/login"
							class="text-slate-300 transition-colors duration-300 hover:text-white">Masuk</a
						>
					{/if}

					<a
						href="/peta"
						class="ml-4 flex items-center gap-2 rounded-full bg-orange-700 px-5 py-2 font-bold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-800"
					>
						🗺️ Buka Peta
					</a>
				</div>

				<!-- TOMBOL THEME & HAMBURGER -->
				<div class="flex items-center gap-2">
					<!-- Tombol Toggle Theme -->
					<button
						onclick={toggleTheme}
						aria-label="Ubah tema"
						class="rounded-full bg-slate-800/50 p-2 text-slate-400 transition-colors hover:text-white"
						title="Ubah Tema"
					>
						{#if isDarkMode}
							<!-- Ikon Matahari (jika sedang gelap, tombol untuk ke terang) -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"
								></line><line x1="12" y1="21" x2="12" y2="23"></line><line
									x1="4.22"
									y1="4.22"
									x2="5.64"
									y2="5.64"
								></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line
									x1="1"
									y1="12"
									x2="3"
									y2="12"
								></line><line x1="21" y1="12" x2="23" y2="12"></line><line
									x1="4.22"
									y1="19.78"
									x2="5.64"
									y2="18.36"
								></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg
							>
						{:else}
							<!-- Ikon Bulan (jika sedang terang, tombol untuk ke gelap) -->
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg
							>
						{/if}
					</button>

					<!-- Hamburger Mobile -->
					<div class="flex items-center md:hidden">
						<button
							onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
							aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
							aria-expanded={isMobileMenuOpen}
							class="p-2 text-slate-300 hover:text-white"
						>
							{#if isMobileMenuOpen}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"
									></line></svg
								>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"
									></line><line x1="3" y1="18" x2="21" y2="18"></line></svg
								>
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- MENU MOBILE -->
		{#if isMobileMenuOpen}
			<div
				class="absolute left-0 w-full border-b border-slate-800 bg-slate-900 shadow-2xl transition-colors duration-500 md:hidden"
			>
				<div class="flex flex-col space-y-2 px-4 pt-2 pb-6">
					<a
						href="/"
						class="rounded-xl px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
						>Beranda</a
					>
					<a
						href="/lapor"
						class="rounded-xl px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
						>Laporan Warga</a
					>
					<a
						href="/statistik"
						class="rounded-xl px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
						>Statistik</a
					>
					<a
						href="/tentang"
						class="rounded-xl px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
						>Tentang Kami</a
					>
					{#if auth.token}
						<a
							href="/dashboard"
							class="rounded-xl px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
							>Dashboard</a
						>
						<button
							type="button"
							onclick={logout}
							class="rounded-xl px-4 py-3 text-left text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
							>Keluar</button
						>
					{:else}
						<a
							href="/auth/login"
							class="rounded-xl px-4 py-3 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
							>Masuk</a
						>
					{/if}
					<div class="pt-2">
						<a
							href="/peta"
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-700 px-5 py-3 font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-800"
						>
							🗺️ Buka Peta
						</a>
					</div>
				</div>
			</div>
		{/if}
	</nav>

	<!-- KONTEN UTAMA -->
	<main class="flex-grow">
		{#key currentUrl}
			{@const Page = currentPage}
			<Page />
		{/key}
	</main>

	<!-- FOOTER -->
	{#if currentPath.replace(/\/$/, '') !== '/peta'}
		<footer
			class="relative overflow-hidden border-t border-slate-800 bg-slate-950 pt-16 pb-8 text-slate-400 transition-colors duration-500"
		>
			<div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="mb-12 grid grid-cols-1 gap-10 md:grid-cols-12">
					<div class="flex flex-col gap-4 md:col-span-5">
						<div class="flex items-center gap-3">
							<div>
								<span
									class="block text-3xl font-extrabold tracking-tighter text-white transition-colors duration-500"
									>Sigap<span class="text-orange-500">Asap</span></span
								>
								<span
									class="mt-1 block text-xs font-semibold tracking-widest text-emerald-500 uppercase"
									>Early Warning System</span
								>
							</div>
						</div>
						<p
							class="pr-4 text-sm leading-relaxed font-medium text-slate-400 transition-colors duration-500"
						>
							Sistem Peringatan Dini Kabut Asap Karhutla Lintas Batas Berbasis Integrasi
							Multi-Sinyal Data Terpadu. Melindungi masyarakat dari risiko paparan polusi udara
							melalui data satelit dan partisipasi warga.
						</p>
					</div>

					<div class="md:col-span-3">
						<h2
							class="mb-4 inline-block border-b border-slate-800 pb-2 text-xs font-bold tracking-widest text-white uppercase transition-colors duration-500"
						>
							Sumber Data
						</h2>
						<ul class="space-y-3 text-sm font-medium">
							<li>
								<a
									href="https://firms.modaps.eosdis.nasa.gov/"
									target="_blank"
									rel="noopener noreferrer"
									class="group flex items-center gap-2 transition-colors hover:text-emerald-400"
									><span class="text-slate-600 transition-colors group-hover:text-emerald-400"
										>›</span
									> NASA FIRMS</a
								>
							</li>
							<li>
								<a
									href="https://www.bmkg.go.id/"
									target="_blank"
									rel="noopener noreferrer"
									class="group flex items-center gap-2 transition-colors hover:text-emerald-400"
									><span class="text-slate-600 transition-colors group-hover:text-emerald-400"
										>›</span
									> BMKG</a
								>
							</li>
							<li>
								<a
									href="https://aqicn.org/"
									target="_blank"
									rel="noopener noreferrer"
									class="group flex items-center gap-2 transition-colors hover:text-emerald-400"
									><span class="text-slate-600 transition-colors group-hover:text-emerald-400"
										>›</span
									> AQICN / WAQI</a
								>
							</li>
							<li>
								<a
									href="https://openaq.org/"
									target="_blank"
									rel="noopener noreferrer"
									class="group flex items-center gap-2 transition-colors hover:text-emerald-400"
									><span class="text-slate-600 transition-colors group-hover:text-emerald-400"
										>›</span
									> OpenAQ</a
								>
							</li>
							<li>
								<a
									href="https://open-meteo.com/"
									target="_blank"
									rel="noopener noreferrer"
									class="group flex items-center gap-2 transition-colors hover:text-emerald-400"
									><span class="text-slate-600 transition-colors group-hover:text-emerald-400"
										>›</span
									> Open-Meteo</a
								>
							</li>
						</ul>
					</div>

					<div class="md:col-span-4">
						<h2
							class="mb-4 inline-block border-b border-slate-800 pb-2 text-xs font-bold tracking-widest text-white uppercase transition-colors duration-500"
						>
							Kontak Kami
						</h2>
						<ul class="space-y-4 text-sm font-medium text-slate-400">
							<li class="flex items-start gap-3">
								<span class="mt-0.5 text-lg text-emerald-500">📍</span>
								<span class="leading-relaxed transition-colors duration-500">
									<strong class="mb-1 block text-base text-slate-200">Institut Teknologi Del</strong
									>
									Jl. Sisingamangaraja, Sitoluama<br />
									Laguboti, Kab. Tobasa<br />
									SUMUT, Indonesia<br />
									<span class="text-slate-400">KODE POS: 22381</span>
								</span>
							</li>
							<li class="flex items-start gap-3">
								<span class="mt-0.5 text-lg text-emerald-500">📞</span>
								<div class="leading-relaxed transition-colors duration-500">
									<span class="mb-1 block font-semibold text-slate-300">Telp:</span>
									<span class="block">62 632 331234</span>
								</div>
							</li>
							<li class="flex items-center gap-3">
								<span class="text-lg text-emerald-500">🌐</span>
								<a
									href="https://www.del.ac.id"
									target="_blank"
									rel="noopener noreferrer"
									class="transition-colors hover:text-emerald-400">www.del.ac.id</a
								>
							</li>
							<li class="flex items-center gap-3">
								<span class="text-lg text-emerald-500">✉️</span>
								<a
									href="mailto:infoSigapAsap@gmail.com"
									class="transition-colors hover:text-emerald-400">infoSigapAsap@gmail.com</a
								>
							</li>
						</ul>
					</div>
				</div>

				<div
					class="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 text-xs font-medium text-slate-400 transition-colors duration-500 md:flex-row"
				>
					<p>
						&copy; 2026 <strong class="text-slate-300">SigapAsap</strong>. Data bersumber dari NASA
						FIRMS, BMKG, Open-Meteo, dan AQICN.
					</p>
					<div class="flex space-x-6">
						<a href="/tentang" class="transition-colors hover:text-emerald-400">Tentang Kami</a>
						<a href="/lapor" class="transition-colors hover:text-emerald-400">Kebijakan Privasi</a>
						<a href="/statistik" class="transition-colors hover:text-emerald-400"
							>Syarat & Ketentuan</a
						>
					</div>
				</div>
			</div>
		</footer>
	{/if}
</div>
