<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	const API_BASE = import.meta.env.VITE_API_URL || '';

	let barCanvas = $state<HTMLCanvasElement>();
	let doughnutCanvas = $state<HTMLCanvasElement>();

	let isLoading = $state(true);
	let errorMessage = $state('');
	let totalHotspots = $state(0);

	// State untuk info lokasi
	let isLocal = $state(false);
	let userCoords = $state<{ lat: number; lon: number } | null>(null);

	onMount(async () => {
		try {
			// 1. Minta Izin Lokasi GPS Pengguna
			let lat = null,
				lon = null;

			if (navigator.geolocation) {
				try {
					const pos: any = await new Promise((resolve, reject) => {
						navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
					});
					lat = pos.coords.latitude;
					lon = pos.coords.longitude;
					userCoords = { lat, lon };
				} catch (e) {
					console.warn('GPS ditolak, menggunakan data nasional.');
				}
			}

			// 2. Fetch Data ke Backend (kirim lat/lon jika ada)
			let url = `${API_BASE}/api/v1/stats`;
			if (lat && lon) url += `?lat=${lat}&lon=${lon}`;

			const res = await fetch(url);
			const json = await res.json();

			if (json.success) {
				const data = json.data;
				totalHotspots = data.totalHotspots;
				isLocal = data.isLocal;

				isLoading = false;
				await new Promise((r) => setTimeout(r, 50));

				if (barCanvas && doughnutCanvas) {
					const { default: Chart } = await import('chart.js/auto');
					// 3. Inisialisasi Chart Batang
					new Chart(barCanvas, {
						type: 'bar',
						data: {
							labels: data.topProvinces.map((p: any) => p.name),
							datasets: [
								{
									label: 'Titik Api',
									data: data.topProvinces.map((p: any) => p.count),
									backgroundColor: [
										'rgba(239, 68, 68, 0.9)',
										'rgba(249, 115, 22, 0.8)',
										'rgba(245, 158, 11, 0.8)',
										'rgba(16, 185, 129, 0.8)',
										'rgba(59, 130, 246, 0.8)',
										'rgba(99, 102, 241, 0.7)',
										'rgba(168, 85, 247, 0.7)',
										'rgba(236, 72, 153, 0.7)',
										'rgba(107, 114, 128, 0.7)',
										'rgba(156, 163, 175, 0.7)'
									],
									borderRadius: 6
								}
							]
						},
						options: {
							indexAxis: 'y',
							responsive: true,
							maintainAspectRatio: false,
							plugins: {
								legend: { display: false },
								title: {
									display: true,
									text: isLocal
										? '10 Provinsi Terdekat dari Lokasi Anda'
										: 'Top 10 Provinsi Nasional',
									color: '#fff',
									font: { size: 16 }
								}
							},
							scales: {
								x: {
									beginAtZero: true,
									grid: { color: 'rgba(255,255,255,0.05)' },
									ticks: { color: '#94a3b8' }
								},
								y: {
									grid: { display: false },
									ticks: { color: '#cbd5e1', font: { weight: 'bold' } }
								}
							}
						}
					});

					// 4. Inisialisasi Chart Donat
					new Chart(doughnutCanvas, {
						type: 'doughnut',
						data: {
							labels: ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat'],
							datasets: [
								{
									data: data.aqiDistribution,
									backgroundColor: ['#10b981', '#facc15', '#f97316', '#ef4444'],
									borderWidth: 2,
									borderColor: '#0f172a',
									hoverOffset: 4
								}
							]
						},
						options: {
							responsive: true,
							maintainAspectRatio: false,
							cutout: '70%',
							plugins: {
								legend: { position: 'bottom', labels: { color: '#94a3b8' } },
								title: {
									display: true,
									text: isLocal
										? 'Kualitas Udara di Sekitar Anda'
										: 'Distribusi Kualitas Udara Nasional',
									color: '#fff',
									font: { size: 16 }
								}
							}
						}
					});
				}
			} else {
				errorMessage = json.error || 'Gagal memuat data.';
				isLoading = false;
			}
		} catch (e: any) {
			errorMessage = 'Gagal terhubung ke server.';
			isLoading = false;
		}
	});
</script>

<div class="mx-auto max-w-6xl px-4 py-12" in:fade={{ duration: 400 }}>
	<div class="mb-8 border-b border-slate-800 pb-6">
		<h1 class="text-3xl font-extrabold tracking-tight text-white">Statistik & Analitik</h1>
		<p class="mt-2 text-slate-400">Gambaran makro kondisi karhutla dan kualitas udara.</p>

		{#if !isLoading && !errorMessage}
			<div class="mt-4 flex flex-col gap-4 md:flex-row">
				<!-- Info Area Pantau -->
				<div class="inline-flex flex-col rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
					<span class="mb-1 text-xs text-slate-400">Area Pantau</span>
					<div class="flex items-center gap-2">
						{#if isLocal && userCoords}
							<span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
							<span class="text-sm font-bold text-emerald-400"> Radius ±330 km dari GPS Anda </span>
							<span class="ml-1 font-mono text-xs text-slate-500">
								({userCoords.lat.toFixed(3)}, {userCoords.lon.toFixed(3)})
							</span>
						{:else}
							<span class="h-2 w-2 rounded-full bg-orange-500"></span>
							<span class="text-sm font-bold text-orange-400">
								Seluruh Indonesia (GPS Tidak Aktif)
							</span>
						{/if}
					</div>
				</div>

				<!-- Info Total Titik Api -->
				<div class="inline-flex flex-col rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
					<span class="mb-1 text-xs text-slate-400">Total Titik Api (7 Hari)</span>
					<span class="text-sm font-bold text-orange-400">
						{`${totalHotspots.toLocaleString('id-ID')} Titik`}
					</span>
				</div>
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex flex-col items-center justify-center gap-4 py-20">
			<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500"></div>
			<p class="animate-pulse text-sm text-slate-400">Mendeteksi Lokasi & Menganalisis Data...</p>
		</div>
	{:else if errorMessage}
		<div class="rounded-2xl border border-red-700/50 bg-red-900/30 p-6 text-center text-red-200">
			<p class="mb-2 text-xl font-bold">Gagal Memuat Data</p>
			<p>{errorMessage}</p>
		</div>
	{:else}
		<div class="mb-8 grid gap-8 lg:grid-cols-2">
			<!-- Chart Batang -->
			<div
				class="relative h-[500px] rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
			>
				<canvas bind:this={barCanvas}></canvas>
			</div>

			<!-- Chart Donat -->
			<div
				class="relative flex h-[500px] justify-center rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
			>
				<div class="w-full max-w-md">
					<canvas bind:this={doughnutCanvas}></canvas>
				</div>
			</div>
		</div>
	{/if}

	<!-- Penjelasan ISPU -->
	<div
		class="relative mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-8 text-white shadow-xl"
	>
		<div
			class="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500 opacity-10 blur-[100px]"
		></div>

		<h2 class="mb-4 text-2xl font-bold text-emerald-400">Apa itu ISPU?</h2>
		<p class="mb-8 max-w-4xl leading-relaxed text-slate-300">
			Indeks Standar Pencemar Udara (ISPU) adalah angka yang menggambarkan kondisi kualitas udara
			ambien di suatu lokasi. Semakin tinggi angkanya, semakin buruk kualitas udaranya dan semakin
			berbahaya bagi kesehatan.
		</p>

		<div class="relative z-10 grid grid-cols-2 gap-4 md:grid-cols-4">
			<div
				class="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
			>
				<div class="mb-1 text-2xl font-bold text-green-400">1 - 50</div>
				<div class="mb-1 font-bold text-white">Baik</div>
				<div class="text-xs text-slate-400">Aman untuk beraktivitas di luar.</div>
			</div>
			<div
				class="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
			>
				<div class="mb-1 text-2xl font-bold text-yellow-400">51 - 100</div>
				<div class="mb-1 font-bold text-white">Sedang</div>
				<div class="text-xs text-slate-400">Kurangi aktivitas berat luar ruangan.</div>
			</div>
			<div
				class="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
			>
				<div class="mb-1 text-2xl font-bold text-orange-400">101 - 200</div>
				<div class="mb-1 font-bold text-white">Tidak Sehat</div>
				<div class="text-xs text-slate-400">Gunakan masker N95 jika keluar.</div>
			</div>
			<div
				class="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
			>
				<div class="mb-1 text-2xl font-bold text-red-400">&gt; 200</div>
				<div class="mb-1 font-bold text-white">Sangat Buruk</div>
				<div class="text-xs text-slate-400">Tetap di rumah, tutup jendela.</div>
			</div>
		</div>
	</div>
</div>
