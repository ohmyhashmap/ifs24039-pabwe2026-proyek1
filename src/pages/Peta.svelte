<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import maplibreglWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

	const API_BASE = import.meta.env.VITE_API_URL || '';

	let mapContainer: HTMLDivElement;
	let map: any = null;

	let hotspotsCount = $state(0);
	let isLoading = $state(true);
	let errorMessage = $state('');

	let userLocation = $state<{ lat: number; lon: number } | null>(null);
	let isNationalView = $state(true);
	let locationName = $state('Memuat lokasi...');

	let aqiData = $state<any>(null);
	let weatherData = $state<any>(null);
	let safeWindow = $state<any>(null);

	let selectedProfile = $state('umum');
	let recommendationMsg = $state('');
	let isRecLoading = $state(false);

	let showReportModal = $state(false);
	let reportDesc = $state('');
	let isSubmitting = $state(false);

	let isTrajectoryVisible = $state(false);
	let isTrajectoryLoading = $state(false);
	let isHotspotsVisible = $state(true);

	// --- STATE UI FLUID ---
	let isPanelExpanded = $state(false);
	let showControls = $state(false);

	// --- STATE TIMELAPSE ---
	let allHotspotsData = $state<any[]>([]);
	let timelineFrames = $state<{ timeLabel: string; timestamp: number; data: any[] }[]>([]);
	let currentFrameIndex = $state(0);
	let isPlaying = $state(false);
	let playInterval: any = null;
	let debounceTimer: any;

	let currentTime = $state(new Date());
	let highlightHealth = $state(false);

	const updateMapSource = (data: any[]) => {
		hotspotsCount = data.length;
		const geojson = {
			type: 'FeatureCollection',
			features: data.map((h: any) => ({
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
				properties: {
					...h,
					confidence: Number(h.confidence) || 0,
					color: Number(h.confidence) > 70 ? '#ef4444' : '#f59e0b'
				}
			}))
		};

		if (map.getSource('hotspots-source')) {
			(map.getSource('hotspots-source') as any).setData(geojson);
		} else {
			map.addSource('hotspots-source', {
				type: 'geojson',
				data: geojson,
				cluster: true,
				clusterMaxZoom: 10,
				clusterRadius: 50
			});
			map.addLayer({
				id: 'hotspots-layer',
				type: 'circle',
				source: 'hotspots-source',
				paint: {
					'circle-radius': 7,
					'circle-color': ['get', 'color'],
					'circle-stroke-width': 1.5,
					'circle-stroke-color': '#ffffff',
					'circle-opacity': 0.9
				}
			});

			map.on('click', 'hotspots-layer', (e: any) => {
				if (!e.features || !e.features[0]) return;
				const props = e.features[0].properties;
				new (window as any).maplibregl.Popup({ offset: 10 })
					.setLngLat(e.features[0].geometry.coordinates.slice())
					.setHTML(
						`<div style="font-family: sans-serif; font-size: 13px;"><strong>Titik Api NASA</strong><br/>Confidence: <b>${props.confidence}%</b><br/>Waktu: ${new Date(props.detected_at).toLocaleString('id-ID')}</div>`
					)
					.addTo(map);
			});
		}
	};

	const showFrame = (index: number) => {
		if (timelineFrames.length === 0) return;
		currentFrameIndex = index;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateMapSource(timelineFrames[index].data);
		}, 50);
	};

	const togglePlay = () => {
		// Defensive guard: the play button is only rendered when there is more than one frame.
		/* v8 ignore next -- @preserve */
		if (timelineFrames.length <= 1) return;
		isPlaying = !isPlaying;

		if (isPlaying) {
			playInterval = setInterval(() => {
				let nextIndex = currentFrameIndex + 1;
				if (nextIndex >= timelineFrames.length) nextIndex = 0;
				showFrame(nextIndex);
			}, 800);
		} else {
			clearInterval(playInterval);
		}
	};

	const loadHotspots = async () => {
		// Defensive guard: only called from the map `load` handler, after `map` is assigned.
		/* v8 ignore next -- @preserve */
		if (!map) return;
		isLoading = true;

		try {
			const res = await fetch(`${API_BASE}/api/v1/hotspots?bbox=95,-11,141,6&days=5`);
			const json = await res.json();

			if (json.success && json.data) {
				allHotspotsData = json.data;
				if (allHotspotsData.length === 0) {
					isLoading = false;
					return;
				}

				const startTime = new Date(allHotspotsData[0].detected_at).getTime();
				const endTime = new Date(allHotspotsData[allHotspotsData.length - 1].detected_at).getTime();
				const INTERVAL_MS = 6 * 60 * 60 * 1000;
				const totalFrames = Math.ceil((endTime - startTime) / INTERVAL_MS) + 1;

				const newFrames = Array.from({ length: totalFrames }, (_, i) => {
					const frameStart = startTime + i * INTERVAL_MS;
					return {
						timestamp: frameStart,
						timeLabel:
							new Date(frameStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) +
							' ' +
							new Date(frameStart).toLocaleTimeString('id-ID', {
								hour: '2-digit',
								minute: '2-digit'
							}),
						data: [] as any[]
					};
				});

				allHotspotsData.forEach((h) => {
					const t = new Date(h.detected_at).getTime();
					const frameIndex = Math.floor((t - startTime) / INTERVAL_MS);
					if (frameIndex >= 0 && frameIndex < totalFrames) {
						newFrames[frameIndex].data.push(h);
					}
				});

				timelineFrames = newFrames;
				showFrame(timelineFrames.length - 1);
			}
		} catch (error: any) {
			console.error('Gagal memuat hotspot:', error);
		} finally {
			isLoading = false;
		}
	};

	const fetchRecommendation = async () => {
		// Defensive guard: the only caller (the $effect below) already checks `aqiData?.aqi`.
		/* v8 ignore next -- @preserve */
		if (!aqiData?.aqi) return;
		isRecLoading = true;
		try {
			const res = await fetch(
				`${API_BASE}/api/v1/recommendations?aqi=${aqiData.aqi}&profile=${selectedProfile}`
			);
			const json = await res.json();
			if (json.success) recommendationMsg = json.data.message;
		} catch (e) {
			recommendationMsg = 'Gagal memuat rekomendasi.';
		} finally {
			isRecLoading = false;
		}
	};

	$effect(() => {
		if (aqiData?.aqi && selectedProfile) fetchRecommendation();
	});

	const fetchEnvironment = async (lat: number, lon: number) => {
		try {
			const envRes = await fetch(`${API_BASE}/api/v1/environment?lat=${lat}&lon=${lon}`);
			const envJson = await envRes.json();
			if (envJson.success) {
				aqiData = envJson.data.aqi;
				weatherData = envJson.data.weather;
				locationName = aqiData?.station || 'Lokasi Anda';
			}
			const swRes = await fetch(`${API_BASE}/api/v1/safe-window?lat=${lat}&lon=${lon}`);
			const swJson = await swRes.json();
			if (swJson.success) safeWindow = swJson.data;
		} catch (error) {}
	};

	const submitReport = async () => {
		if (!reportDesc.trim()) return;
		isSubmitting = true;
		const lat = userLocation?.lat || map.getCenter().lat;
		const lon = userLocation?.lon || map.getCenter().lng;

		try {
			await fetch(`${API_BASE}/api/v1/reports`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lat, lon, description: reportDesc })
			});
			showReportModal = false;
			reportDesc = '';
			alert('Laporan berhasil dikirim! Terima kasih.');
		} catch (e) {
			alert('Gagal mengirim laporan.');
		} finally {
			isSubmitting = false;
		}
	};

	const toggleView = () => {
		if (!map) return;
		isNationalView = !isNationalView;
		if (isNationalView) {
			map.flyTo({ center: [117, -2], zoom: 4, duration: 2000 });
			locationName = 'Seluruh Indonesia';
			fetchEnvironment(3.5952, 98.6722);
		} else {
			if (userLocation) {
				map.flyTo({ center: [userLocation.lon, userLocation.lat], zoom: 9, duration: 2000 });
				fetchEnvironment(userLocation.lat, userLocation.lon);
			}
		}
	};

	const getAqiStatusText = (aqi: number) => {
		if (!aqi) return 'N/A';
		if (aqi <= 50) return 'Baik';
		if (aqi <= 100) return 'Sedang';
		if (aqi <= 200) return 'Tidak Sehat';
		return 'Sangat Buruk';
	};

	const toggleTrajectory = async () => {
		if (!map) return;
		if (isTrajectoryVisible) {
			if (map.getLayer('trajectory-line')) map.removeLayer('trajectory-line');
			if (map.getSource('trajectory-source')) map.removeSource('trajectory-source');
			isTrajectoryVisible = false;
			return;
		}

		isTrajectoryLoading = true;
		try {
			let url = `${API_BASE}/api/v1/trajectory`;
			const currentData = timelineFrames[currentFrameIndex]?.data || [];

			if (currentData.length > 0) {
				const topFire = [...currentData].sort((a, b) => b.confidence - a.confidence)[0];
				url += `?lat=${topFire.lat}&lon=${topFire.lon}`;
			}

			const res = await fetch(url);
			const json = await res.json();

			if (json.success) {
				if (map.getLayer('trajectory-line')) map.removeLayer('trajectory-line');
				if (map.getSource('trajectory-source')) map.removeSource('trajectory-source');

				map.addSource('trajectory-source', { type: 'geojson', data: json.data.geojson });
				map.addLayer({
					id: 'trajectory-line',
					type: 'line',
					source: 'trajectory-source',
					layout: { 'line-join': 'round', 'line-cap': 'round' },
					paint: {
						'line-color': '#ef4444',
						'line-width': 4,
						'line-dasharray': [2, 2],
						'line-opacity': 0.8
					}
				});
				isTrajectoryVisible = true;
			}
		} catch (e) {
			alert('Gagal memuat prediksi lintasan.');
		} finally {
			isTrajectoryLoading = false;
		}
	};

	const toggleHotspots = () => {
		if (!map) return;
		isHotspotsVisible = !isHotspotsVisible;
		if (map.getLayer('hotspots-layer')) {
			map.setLayoutProperty('hotspots-layer', 'visibility', isHotspotsVisible ? 'visible' : 'none');
		}
	};

	onMount(() => {
		const timer = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		const initializeMap = async () => {
			try {
				const maplibregl = await import('maplibre-gl');
				const { setWorkerUrl, Map } = maplibregl;
				setWorkerUrl(maplibreglWorker);
				(window as any).maplibregl = maplibregl;

				map = new Map({
					container: mapContainer,
					style: 'https://tiles.openfreemap.org/styles/liberty',
					center: [117, -2],
					zoom: 4
				});
				map.setPadding({ bottom: 100 });

				map.on('load', async () => {
					await loadHotspots();

					if (navigator.geolocation) {
						navigator.geolocation.getCurrentPosition(
							(position) => {
								userLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
								isNationalView = false;
								map.flyTo({
									center: [userLocation.lon, userLocation.lat],
									zoom: 9,
									duration: 2000
								});
								fetchEnvironment(userLocation.lat, userLocation.lon);
							},
							() => {
								locationName = 'Medan (Default)';
								fetchEnvironment(3.5952, 98.6722);
							}
						);
					} else {
						locationName = 'Medan (Default)';
						fetchEnvironment(3.5952, 98.6722);
					}

					isLoading = false;

					const action = new URLSearchParams(window.location.search).get('action');
					if (action === 'trajectory') setTimeout(() => toggleTrajectory(), 1500);
					else if (action === 'health')
						setTimeout(() => {
							highlightHealth = true;
							setTimeout(() => (highlightHealth = false), 3000);
						}, 1000);
				});
			} catch (err) {
				errorMessage = 'Gagal memuat peta.';
				isLoading = false;
			}
		};

		void initializeMap();

		return () => {
			clearInterval(timer);
			if (playInterval) clearInterval(playInterval);
			clearTimeout(debounceTimer);
			map?.remove();
		};
	});
</script>

<!-- KONTROL KANAN ATAS (Fixed) -->
<div class="fixed top-20 right-4 z-50 flex flex-col items-end gap-3">
	{#if showControls}
		<div
			transition:fly={{ y: -20, duration: 300, opacity: 1 }}
			class="mb-2 flex flex-col items-end gap-2"
		>
			<button
				onclick={toggleHotspots}
				class="group flex w-auto items-center gap-3 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-2 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-800"
			>
				<span class="hidden text-xs font-semibold tracking-tight text-white sm:block"
					>{isHotspotsVisible ? 'Sembunyikan Titik' : 'Tampilkan Titik'}</span
				>
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm">
					{isHotspotsVisible ? '👁️' : '🙈'}
				</div>
			</button>

			<button
				onclick={toggleTrajectory}
				disabled={isTrajectoryLoading}
				class="group flex w-auto items-center gap-3 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-2 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-800"
			>
				<span class="hidden text-xs font-semibold tracking-tight text-white sm:block"
					>{isTrajectoryVisible ? 'Matikan Lintasan' : 'Lintasan Asap'}</span
				>
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm">
					{#if isTrajectoryLoading}⏳{:else}💨{/if}
				</div>
			</button>

			<a
				href="/lapor"
				class="group flex w-auto items-center gap-3 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-2 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-800"
			>
				<span class="hidden text-xs font-semibold tracking-tight text-white sm:block"
					>Lapor Titik Api</span
				>
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm">
					📢
				</div>
			</a>
			<button
				onclick={() => (showReportModal = true)}
				class="group flex w-auto items-center gap-3 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-2 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-800"
			>
				<span class="hidden text-xs font-semibold tracking-tight text-white sm:block"
					>Lapor di Peta</span
				>
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm">
					📍
				</div>
			</button>
		</div>
	{/if}

	<div class="flex gap-2">
		<button
			onclick={toggleView}
			aria-label={isNationalView ? 'Tampilkan lokasi saya' : 'Tampilkan peta nasional'}
			class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-orange-400 active:scale-95"
		>
			{#if isNationalView}
				<span class="text-xl">📍</span>
			{:else}
				<span class="text-xl">🗺️</span>
			{/if}
		</button>

		<button
			onclick={() => (showControls = !showControls)}
			aria-label={showControls ? 'Sembunyikan kontrol peta' : 'Tampilkan kontrol peta'}
			aria-expanded={showControls}
			class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-blue-500 active:scale-95 {showControls
				? 'rotate-45'
				: ''}"
		>
			<span class="text-xl" aria-hidden="true">⚙️</span>
		</button>
	</div>
</div>

<!-- PANEL BAWAH (Hanya muncul saat di-expand, melayang di atas tombol) -->
{#if isPanelExpanded}
	<div
		transition:fly={{ y: 300, duration: 400 }}
		class="pointer-events-none fixed right-0 bottom-[5.5rem] left-0 z-40 flex justify-center px-4"
	>
		<div
			class="custom-scrollbar pointer-events-auto max-h-[65vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700/50 bg-slate-900/95 shadow-2xl backdrop-blur-2xl"
		>
			<div class="p-5 md:p-6">
				<div
					class="mb-5 flex flex-col items-start justify-between gap-3 border-b border-slate-700/50 pb-4 md:flex-row md:items-center"
				>
					<div>
						<h1 class="text-2xl font-extrabold tracking-tighter text-white">
							Sigap<span class="text-orange-500">Asap</span>
						</h1>
						<div
							class="mt-1 flex items-center gap-1.5 text-sm font-medium tracking-tight text-slate-300"
						>
							<span class="text-emerald-400">📍</span> Memantau:
							<strong class="text-white">{locationName}</strong>
						</div>
					</div>
					<div class="flex flex-row items-center gap-3 md:flex-col md:items-end md:gap-1">
						<div class="text-xs font-medium tracking-tight text-slate-400">
							{currentTime.toLocaleDateString('id-ID', {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
								year: 'numeric'
							})}
						</div>
						<div
							class="rounded-md bg-emerald-500/10 px-3 py-1 font-mono text-sm font-medium text-emerald-400"
						>
							{currentTime.toLocaleTimeString('id-ID', {
								timeZone: 'Asia/Jakarta',
								hour: '2-digit',
								minute: '2-digit',
								second: '2-digit'
							})} WIB
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-5 md:grid-cols-12">
					<div class="flex flex-col gap-3 md:col-span-7">
						{#if timelineFrames.length > 1}
							<div class="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3">
								<div
									class="mb-2 flex justify-between font-mono text-[10px] font-semibold tracking-widest text-slate-400 uppercase"
								>
									<span>Timelapse</span>
									<span class="text-orange-400">{timelineFrames[currentFrameIndex]?.timeLabel}</span
									>
								</div>
								<div class="flex items-center gap-3">
									<button
										onclick={togglePlay}
										aria-label={isPlaying
											? 'Jeda timelapse titik panas'
											: 'Putar timelapse titik panas'}
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-emerald-400"
									>
										{#if isPlaying}
											<span class="text-base">⏸</span>
										{:else}
											<span class="pl-0.5 text-base">▶</span>
										{/if}
									</button>

									<input
										type="range"
										min="0"
										max={timelineFrames.length - 1}
										value={currentFrameIndex}
										oninput={(e) => {
											const val = Number(e.currentTarget.value);
											currentFrameIndex = val;
											showFrame(val);
										}}
										class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 transition-all
                         outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0
                         [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md hover:[&::-webkit-slider-thumb]:scale-125"
										style="background: linear-gradient(to right, #f97316 {(currentFrameIndex /
											(timelineFrames.length - 1)) *
											100}%, #334155 {(currentFrameIndex / (timelineFrames.length - 1)) * 100}%);"
									/>
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-2">
							<div class="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-center">
								<div class="mb-0.5 text-[10px] text-slate-400">Titik Api</div>
								<div class="text-lg font-bold text-orange-400">{hotspotsCount}</div>
							</div>
							<div class="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-center">
								<div class="mb-0.5 text-[10px] text-slate-400">Kualitas Udara</div>
								<div
									class="text-sm font-bold"
									class:text-green-400={aqiData?.aqi <= 50}
									class:text-yellow-400={aqiData?.aqi > 50 && aqiData?.aqi <= 100}
									class:text-red-400={aqiData?.aqi > 100}
								>
									{getAqiStatusText(aqiData?.aqi)}
								</div>
							</div>
							<div class="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-center">
								<div class="mb-0.5 text-[10px] text-slate-400">Angin</div>
								<div class="text-sm font-bold text-blue-300">
									{weatherData ? weatherData.wind_speed : '-'}
									<span class="text-[9px] font-normal">km/j</span>
								</div>
							</div>
							{#if safeWindow}
								<div
									class="rounded-xl border border-green-700/50 bg-slate-800/50 p-2.5 text-center"
								>
									<div
										class="mb-0.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-green-400"
									>
										<span>🌤️</span> Waktu Aman
									</div>
									<div class="text-xs font-medium text-white">
										{safeWindow.start} - {safeWindow.end}
									</div>
								</div>
							{/if}
						</div>
					</div>

					<div class="flex h-full flex-col md:col-span-5">
						<div
							class="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3 {highlightHealth
								? 'shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-2 ring-blue-500'
								: ''}"
						>
							<label
								for="health-profile"
								class="mb-2 block flex items-center gap-2 text-xs font-semibold tracking-tight text-slate-200"
							>
								<span class="text-blue-400">🏥</span> Saran Kesehatan:
							</label>
							<select
								id="health-profile"
								bind:value={selectedProfile}
								class="mb-2 w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs font-medium tracking-tight text-white focus:border-blue-500 focus:outline-none"
							>
								<option value="umum">Untuk Umum</option>
								<option value="anak">Untuk Anak / Sekolah</option>
								<option value="asma">Untuk Penderita Asma</option>
							</select>
							<div
								class="flex-grow rounded-lg border border-slate-700/50 bg-slate-900/50 p-3 text-xs leading-relaxed text-slate-200"
							>
								{#if isRecLoading}
									<span class="flex animate-pulse items-center gap-2 text-slate-400">
										<div
											class="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"
										></div>
										Menyusun...
									</span>
								{:else}
									{recommendationMsg || 'Menunggu data...'}
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- TOMBOL TOGGLE BAWAH (FIXED, TIDAK BERGERAK) -->
<div class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
	<button
		onclick={() => (isPanelExpanded = !isPanelExpanded)}
		class="group flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/95 px-6 py-2.5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:bg-slate-800"
	>
		{#if isPanelExpanded}
			<span class="text-sm font-bold tracking-tight">Tutup Info</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="transition-transform group-hover:translate-y-1"
				><polyline points="6 9 12 15 18 9"></polyline></svg
			>
		{:else}
			<span class="text-sm font-bold tracking-tight">Buka Info</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="transition-transform group-hover:-translate-y-1"
				><polyline points="18 15 12 9 6 15"></polyline></svg
			>
		{/if}
	</button>
</div>

<!-- MODAL CROWDSOURCING -->
{#if showReportModal}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
	>
		<div
			transition:fly={{ y: 50, duration: 300 }}
			class="w-full max-w-md rounded-3xl border border-slate-700/50 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl"
		>
			<h2 class="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight text-white">
				<span class="text-2xl">📢</span> Lapor Titik Api
			</h2>
			<p class="mb-4 text-sm font-medium text-slate-400">
				Laporan Anda akan dipetakan berdasarkan lokasi perangkat Anda saat ini.
			</p>

			<textarea
				bind:value={reportDesc}
				placeholder="Contoh: Terlihat asap tebal di dekat lahan kosong Jl. Sudirman..."
				class="mb-4 h-32 w-full resize-none rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm tracking-tight text-white transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
			></textarea>

			<div class="flex justify-end gap-2">
				<button
					onclick={() => (showReportModal = false)}
					class="rounded-xl px-5 py-2.5 text-sm font-semibold tracking-tight text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white"
					>Batal</button
				>
				<button
					onclick={submitReport}
					disabled={isSubmitting || !reportDesc.trim()}
					class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold tracking-tight text-white shadow-lg transition-colors hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500"
				>
					{isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Peta di-set top-16 agar berada tepat di bawah Navbar, dan tinggi dikurangi 64px -->
<div
	bind:this={mapContainer}
	style="width: 100vw; height: calc(100vh - 4rem); position: absolute; top: 4rem; left: 0; z-index: 0;"
></div>

<style>
	:global(.maplibregl-ctrl-attrib) {
		display: none !important;
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(148, 163, 184, 0.3);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(148, 163, 184, 0.5);
	}
</style>
