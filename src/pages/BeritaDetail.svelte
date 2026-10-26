<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	const API_BASE = import.meta.env.VITE_API_URL || '';

	let article = $state<any>(null);
	let relatedNews = $state<any[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	onMount(async () => {
		const slug = decodeURIComponent(
			window.location.pathname.split('/').filter(Boolean).at(-1) ?? ''
		);

		try {
			// 1. Ambil detail artikel berdasarkan slug
			const res = await fetch(`${API_BASE}/api/v1/news/${slug}`);
			const json = await res.json();

			if (json.success) {
				article = json.data;
			} else {
				errorMessage = json.error || 'Artikel tidak ditemukan.';
			}

			// 2. Ambil berita lain untuk bagian "Berita Terkait"
			const allRes = await fetch(`${API_BASE}/api/v1/news`);
			const allJson = await allRes.json();
			if (allJson.success) {
				relatedNews = allJson.data.filter((n: any) => n.slug !== slug).slice(0, 3);
			}
		} catch (e) {
			errorMessage = 'Gagal terhubung ke server API.';
		} finally {
			isLoading = false;
		}
	});
</script>

<div class="min-h-screen bg-slate-950 pb-20" in:fade={{ duration: 400 }}>
	{#if isLoading}
		<div class="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-4 py-32">
			<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500"></div>
			<p class="animate-pulse text-sm text-slate-400">Memuat artikel...</p>
		</div>
	{:else if errorMessage}
		<div class="mx-auto max-w-4xl px-4 py-32 text-center">
			<div class="rounded-3xl border border-red-700/50 bg-red-900/30 p-8 text-red-200">
				<span class="mb-4 block text-5xl">🔍</span>
				<h1 class="mb-2 text-2xl font-bold">{`Ups, ${errorMessage}`}</h1>
				<p class="mb-6 text-slate-400">
					Artikel yang Anda cari mungkin sudah dihapus atau tautannya salah.
				</p>
				<a
					href="/berita"
					class="rounded-full bg-red-600 px-6 py-2.5 font-bold text-white transition-colors hover:bg-red-500"
					>Kembali ke Daftar Berita</a
				>
			</div>
		</div>
	{:else if article}
		<!-- Breadcrumb -->
		<div
			class="border-b border-slate-800/50 bg-slate-900/50 py-4 text-sm font-medium text-slate-400"
		>
			<div class="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4">
				<a href="/" class="transition-colors hover:text-emerald-400">Beranda</a>
				<span class="text-slate-600">/</span>
				<a href="/berita" class="transition-colors hover:text-emerald-400">Berita</a>
				<span class="text-slate-600">/</span>
				<!-- Kategori diklik ke filter -->
				<a
					href={`/berita?category=${article.category.toLowerCase()}`}
					class="text-emerald-500 transition-colors hover:text-emerald-400"
				>
					{article.category}
				</a>
				<span class="text-slate-600">/</span>
				<!-- Judul artikel (truncate jika terlalu panjang) -->
				<span class="max-w-[150px] truncate text-slate-300 sm:max-w-xs">{article.title}</span>
			</div>
		</div>

		<article class="mx-auto max-w-4xl px-4 pt-10">
			<!-- Header Artikel -->
			<div class="mb-8" in:fly={{ y: 20, duration: 400 }}>
				<div
					class="mb-4 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold tracking-widest text-emerald-400 uppercase"
				>
					{article.category}
				</div>
				<h1
					class="mb-6 text-3xl leading-tight font-extrabold tracking-tight text-white md:text-5xl"
				>
					{article.title}
				</h1>

				<div
					class="flex flex-wrap items-center gap-4 border-b border-slate-800 pb-6 text-sm text-slate-400"
				>
					<div class="flex items-center gap-2">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg"
						>
							👤
						</div>
						<span class="font-bold text-slate-200">{article.author}</span>
					</div>
					<span class="hidden text-slate-600 sm:block">•</span>
					<div class="flex items-center gap-1.5">
						<span>📅</span>
						{new Date(article.date).toLocaleDateString('id-ID', {
							weekday: 'long',
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						})}
					</div>
				</div>
			</div>

			<!-- Gambar Utama -->
			{#if article.image}
				<figure class="mb-10 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
					<img
						src={article.image}
						alt={article.title}
						class="h-auto max-h-[500px] w-full object-cover"
					/>
					<figcaption
						class="border-t border-slate-800 bg-slate-900 px-4 py-3 text-center text-xs text-slate-500"
					>
						Ilustrasi: {article.title}
					</figcaption>
				</figure>
			{/if}

			<!-- Isi Artikel (Menggunakan Tailwind Typography / Prose) -->
			<div
				class="prose prose-lg max-w-none leading-relaxed text-slate-300 prose-invert prose-emerald"
				in:fly={{ y: 20, duration: 400, delay: 200 }}
			>
				<p
					class="mb-8 rounded-r-lg border-l-4 border-emerald-500 bg-slate-900/50 py-2 pl-4 text-xl leading-relaxed font-medium text-slate-200"
				>
					{article.excerpt}
				</p>
				<p>{article.content}</p>
				<p>
					JAKARTA, SIGAPASAP - Sistem peringatan dini kabut asap karhutla terus diperbarui untuk
					memastikan keselamatan masyarakat. Integrasi data dari berbagai sumber memungkinkan
					deteksi dini terhadap potensi sebaran asap lintas batas.
				</p>
				<p>
					Masyarakat diimbau untuk selalu memantau aplikasi SigapAsap dan mengikuti arahan dari
					otoritas terkait. Jika melihat titik api atau asap tebal, segera laporkan melalui fitur
					crowdsourcing yang tersedia di platform ini.
				</p>
			</div>

			<!-- Tombol Share -->
			<div class="mt-12 flex flex-wrap items-center gap-4 border-t border-slate-800 pt-6">
				<span class="font-bold text-slate-200">Bagikan artikel ini:</span>
				<div class="flex gap-2">
					<button
						class="rounded-xl border border-blue-600/50 bg-blue-600/20 px-4 py-2 text-sm font-bold text-blue-400 transition-colors hover:bg-blue-600 hover:text-white"
						>Facebook</button
					>
					<button
						class="rounded-xl border border-sky-500/50 bg-sky-500/20 px-4 py-2 text-sm font-bold text-sky-400 transition-colors hover:bg-sky-500 hover:text-white"
						>Twitter</button
					>
					<button
						class="rounded-xl border border-green-500/50 bg-green-500/20 px-4 py-2 text-sm font-bold text-green-400 transition-colors hover:bg-green-500 hover:text-white"
						>WhatsApp</button
					>
				</div>
			</div>
		</article>

		<!-- Berita Terkait -->
		{#if relatedNews.length > 0}
			<div class="mx-auto mt-20 max-w-7xl border-t border-slate-800 px-4 pt-10">
				<h2 class="mb-8 flex items-center gap-2 text-2xl font-bold text-white">
					<span class="inline-block h-6 w-1.5 rounded-full bg-emerald-500"></span> Berita Terkait
				</h2>
				<div class="grid gap-6 md:grid-cols-3">
					{#each relatedNews as news}
						<a
							href={`/berita/${news.slug}`}
							class="group block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-emerald-500/50 hover:bg-slate-800/80"
						>
							<div class="relative h-48 overflow-hidden bg-slate-800">
								<img
									src={news.image}
									alt={news.title}
									class="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-110 group-hover:opacity-100"
								/>
								<div
									class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"
								></div>
								<div
									class="absolute bottom-3 left-3 rounded bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-emerald-400 backdrop-blur-sm"
								>
									{news.category}
								</div>
							</div>
							<div class="p-5">
								<h3
									class="line-clamp-2 leading-snug font-bold text-white transition-colors group-hover:text-emerald-400"
								>
									{news.title}
								</h3>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
