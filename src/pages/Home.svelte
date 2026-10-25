<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';

	const API_BASE = import.meta.env.VITE_API_URL || '';

	let stats = $state([
		{ label: 'Titik Panas Terpantau', value: 0, target: 0, suffix: '+' },
		{ label: 'Kota/Kabupaten Terlindungi', value: 0, target: 514, suffix: '' },
		{ label: 'Sistem Pakar Kesehatan', value: 0, target: 12, suffix: ' Profil' }
	]);

	let beritaTerbaru = $state<any[]>([]);
	let isLoadingNews = $state(true);

	const heroImageSrcset = '/assets/hero-640.avif 640w, /assets/hero-1280.avif 1280w';

	function getResponsiveImageSrcset(imageUrl: string): string | undefined {
		let source: URL;
		try {
			source = new URL(imageUrl);
		} catch {
			return undefined;
		}
		if (source.hostname !== 'images.unsplash.com') return undefined;

		return [320, 480, 640, 768, 960]
			.map((width) => {
				const variant = new URL(source);
				variant.searchParams.set('auto', 'format');
				variant.searchParams.set('fit', 'crop');
				variant.searchParams.set('q', '60');
				variant.searchParams.set('w', String(width));
				return `${variant.toString()} ${width}w`;
			})
			.join(', ');
	}

	onMount(async () => {
		try {
			const [statsRes, newsRes] = await Promise.all([
				fetch(`${API_BASE}/api/v1/stats`),
				fetch(`${API_BASE}/api/v1/news`)
			]);

			const statsJson = await statsRes.json();
			const newsJson = await newsRes.json();

			if (statsJson.success) {
				stats[0].target = statsJson.data.totalHotspots || 0;
			}

			if (newsJson.success) {
				beritaTerbaru = newsJson.data.slice(0, 3);
			}
		} catch (e) {
			console.error('Gagal memuat data beranda:', e);
		} finally {
			isLoadingNews = false;
			animateStats();
		}
	});

	const animateStats = () => {
		const duration = 2000;
		const startTime = performance.now();

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);

			stats.forEach((stat, index) => {
				const easeOutProgress = 1 - Math.pow(1 - progress, 4);
				stats[index].value = Math.floor(easeOutProgress * stat.target);
			});

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};
		requestAnimationFrame(animate);
	};
</script>

<!-- HERO SECTION -->
<section
	class="relative flex min-h-[85vh] items-center overflow-hidden bg-slate-950 text-white"
	in:fade={{ duration: 800 }}
>
	<img
		src="/assets/hero-1280.avif"
		srcset={heroImageSrcset}
		sizes="100vw"
		alt=""
		aria-hidden="true"
		fetchpriority="high"
		loading="eager"
		decoding="async"
		class="absolute inset-0 h-full w-full object-cover opacity-10 mix-blend-luminosity"
	/>
	<div class="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950"></div>

	<div
		class="pointer-events-none absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500 opacity-10 blur-[120px]"
	></div>
	<div
		class="pointer-events-none absolute right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-orange-500 opacity-10 blur-[120px]"
	></div>

	<div class="relative z-10 mx-auto max-w-7xl px-4 text-center">
		<div
			class="mb-8 inline-block rounded-full border border-slate-700/50 bg-slate-800/50 px-4 py-1.5 text-xs font-bold text-emerald-400 shadow-lg backdrop-blur-md"
			in:fly={{ y: 20, duration: 600 }}
		>
			🚀 Inovasi Peringatan Dini Karhutla
		</div>

		<h1
			class="mb-6 text-4xl leading-tight font-extrabold tracking-tight md:text-6xl lg:text-7xl"
			in:fly={{ y: 50, duration: 800, delay: 200 }}
		>
			Lindungi Keluarga dari <br class="hidden md:block" />
			<span class="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent"
				>Kabut Asap Karhutla</span
			>
		</h1>

		<p
			class="mx-auto mb-10 max-w-2xl text-lg leading-relaxed font-medium text-slate-400 md:text-xl"
			in:fly={{ y: 30, duration: 800, delay: 400 }}
		>
			SigapAsap melampaui sekadar data. Kami mengintegrasikan titik panas satelit, arah angin, dan
			kualitas udara menjadi <strong class="text-white">tindakan nyata</strong> untuk keselamatan Anda.
		</p>

		<!-- PERBAIKAN WARNA TOMBOL HERO -->
		<div
			class="flex flex-col justify-center gap-4 sm:flex-row"
			in:fly={{ y: 20, duration: 800, delay: 600 }}
		>
			<!-- Tombol Utama: Oranye Lembut dengan Glow -->
			<a
				href="/peta"
				class="flex items-center justify-center gap-2 rounded-full border border-orange-500/50 bg-orange-700 px-8 py-4 font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.25)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-orange-800 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] active:translate-y-0"
			>
				<span class="text-xl">🗺️</span> Buka Peta Interaktif
			</a>

			<!-- Tombol Sekunder: Kaca Transparan -->
			<a
				href="/tentang"
				class="flex items-center justify-center rounded-full border border-slate-600 bg-slate-800/40 px-8 py-4 font-bold text-slate-200 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-slate-700/60 hover:text-white active:translate-y-0"
			>
				Pelajari Inovasi
			</a>
		</div>
	</div>
</section>

<!-- STATISTIK SECTION -->
<section class="relative z-20 border-y border-slate-800 bg-slate-900">
	<div class="mx-auto max-w-7xl px-4 py-12">
		<div
			class="grid grid-cols-1 gap-8 divide-y divide-slate-800/50 text-center md:grid-cols-3 md:divide-x md:divide-y-0"
		>
			{#each stats as stat}
				<div class="group py-4">
					<div
						class="mb-2 font-mono text-4xl font-extrabold text-emerald-400 transition-transform duration-300 group-hover:scale-110 md:text-5xl"
					>
						{`${stat.value.toLocaleString('id-ID')}${stat.suffix}`}
					</div>
					<div class="text-sm font-medium tracking-widest text-slate-400 uppercase">
						{stat.label}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- FITUR PEMBEDA SECTION -->
<section class="relative bg-slate-950 py-24">
	<div class="relative z-10 mx-auto max-w-7xl px-4">
		<div class="mb-16 text-center" in:fly={{ y: 30, duration: 600 }}>
			<h2 class="mb-4 text-3xl font-bold text-white md:text-4xl">Mengapa SigapAsap Berbeda?</h2>
			<p class="mx-auto max-w-3xl text-lg text-slate-400">
				Berbeda dengan portal data mentah, SigapAsap adalah lapisan pintar yang menerjemahkan data
				satelit menjadi aksi penyelamatan.
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-3">
			<!-- Card 1 -->
			<a
				href="/peta?action=trajectory"
				class="group block rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/50 hover:bg-slate-800/60 hover:shadow-[0_0_25px_rgba(16,185,129,0.1)]"
				in:fly={{ y: 50, duration: 600, delay: 100 }}
			>
				<div
					class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-3xl text-emerald-400 shadow-inner transition-all duration-300 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white"
				>
					📍
				</div>
				<h3
					class="mb-3 text-xl font-bold text-white transition-colors group-hover:text-emerald-400"
				>
					Prediksi Lintasan Asap
				</h3>
				<p class="mb-6 text-sm leading-relaxed text-slate-400">
					Kami tidak hanya menunjukkan titik api. Kami memodelkan arah angin untuk memprediksi ke
					mana asap akan bergerak 24 jam ke depan.
				</p>
				<span class="flex items-center gap-1 text-sm font-semibold text-emerald-400"
					>Buka Peta Lintasan <span class="transition-transform group-hover:translate-x-1"
						>&rarr;</span
					></span
				>
			</a>

			<!-- Card 2 -->
			<a
				href="/peta?action=health"
				class="group block rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-800/60 hover:shadow-[0_0_25px_rgba(59,130,246,0.1)]"
				in:fly={{ y: 50, duration: 600, delay: 200 }}
			>
				<div
					class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl text-blue-400 shadow-inner transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white"
				>
					🏥
				</div>
				<h3 class="mb-3 text-xl font-bold text-white transition-colors group-hover:text-blue-400">
					Saran Kesehatan Personal
				</h3>
				<p class="mb-6 text-sm leading-relaxed text-slate-400">
					Sistem pakar (rule-based) menerjemahkan angka ISPU menjadi saran medis praktis khusus
					untuk Anak, Penderita Asma, dan pekerja luar.
				</p>
				<span class="flex items-center gap-1 text-sm font-semibold text-blue-400"
					>Cek Kesehatan Anda <span class="transition-transform group-hover:translate-x-1"
						>&rarr;</span
					></span
				>
			</a>

			<!-- Card 3 -->
			<a
				href="/lapor"
				class="group block rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-orange-500/50 hover:bg-slate-800/60 hover:shadow-[0_0_25px_rgba(249,115,22,0.1)]"
				in:fly={{ y: 50, duration: 600, delay: 300 }}
			>
				<div
					class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl text-orange-400 shadow-inner transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white"
				>
					📢
				</div>
				<h3 class="mb-3 text-xl font-bold text-white transition-colors group-hover:text-orange-400">
					Partisipasi Warga
				</h3>
				<p class="mb-6 text-sm leading-relaxed text-slate-400">
					Melampaui data satelit. Warga di lapangan dapat melaporkan secara langsung (crowdsourcing)
					jika melihat asap atau titik api lokal.
				</p>
				<span class="flex items-center gap-1 text-sm font-semibold text-orange-400"
					>Lapor Titik Api <span class="transition-transform group-hover:translate-x-1">&rarr;</span
					></span
				>
			</a>
		</div>
	</div>
</section>

<!-- BERITA SECTION -->
<section class="border-t border-slate-800 bg-slate-900 py-24">
	<div class="mx-auto max-w-7xl px-4">
		<div class="mb-10 flex items-end justify-between border-b border-slate-800 pb-4">
			<div>
				<h2 class="text-3xl font-bold text-white">Berita & Informasi</h2>
				<div
					class="mt-2 h-1 w-20 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
				></div>
			</div>
			<a
				href="/berita"
				class="group flex items-center gap-1 font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
			>
				Lihat Semua <span class="transition-transform group-hover:translate-x-1">&rarr;</span>
			</a>
		</div>

		{#if isLoadingNews}
			<div class="flex justify-center py-10">
				<div class="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-500"></div>
			</div>
		{:else}
			<div class="grid gap-6 md:grid-cols-3">
				{#each beritaTerbaru as berita}
					<a
						href={`/berita/${berita.slug}`}
						class="group block cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
					>
						<div class="relative h-48 overflow-hidden bg-slate-800">
							<img
								src={berita.image}
								srcset={getResponsiveImageSrcset(berita.image)}
								sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1280px) 33vw, 405px"
								alt={berita.title}
								loading="lazy"
								decoding="async"
								class="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100"
							/>
							<div
								class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"
							></div>
						</div>
						<div class="relative p-6">
							<p
								class="mb-2 inline-block rounded bg-emerald-500/10 px-2 py-1 text-[11px] font-bold tracking-widest text-emerald-400 uppercase"
							>
								{new Date(berita.date).toLocaleDateString('id-ID', {
									day: 'numeric',
									month: 'long',
									year: 'numeric'
								})}
							</p>
							<h3
								class="mt-2 line-clamp-2 text-lg leading-snug font-bold text-white transition-colors group-hover:text-emerald-400"
							>
								{berita.title}
							</h3>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
