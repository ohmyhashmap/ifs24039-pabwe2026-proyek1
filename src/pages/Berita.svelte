<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	const API_BASE = import.meta.env.VITE_API_URL || '';

	let newsList = $state<any[]>([]);
	let externalNews = $state<any[]>([]);

	let isLoadingInternal = $state(true);
	let isLoadingExternal = $state(true);
	let errorExternal = $state(false);

	let activeTab = $state('internal');

	onMount(async () => {
		// Fetch Internal
		try {
			const res = await fetch(`${API_BASE}/api/v1/news`);
			const json = await res.json();
			if (json.success) newsList = json.data;
		} catch (e) {
			console.error(e);
		} finally {
			isLoadingInternal = false;
		}

		// Fetch External
		try {
			const res = await fetch(`${API_BASE}/api/v1/news/external`);
			const json = await res.json();
			if (json.success && json.data.length > 0) {
				externalNews = json.data;
			} else {
				errorExternal = true;
			}
		} catch (e) {
			console.error(e);
			errorExternal = true;
		} finally {
			isLoadingExternal = false;
		}
	});

	let currentNewsList = $derived(activeTab === 'internal' ? newsList : externalNews);
	let headline = $derived(currentNewsList.length > 0 ? currentNewsList[0] : null);
	let listNews = $derived(currentNewsList.length > 1 ? currentNewsList.slice(1, 5) : []);
</script>

<div class="mx-auto max-w-7xl px-4 py-8" in:fade={{ duration: 400 }}>
	<div class="mb-8 flex gap-8 border-b-2 border-slate-200">
		<button
			onclick={() => (activeTab = 'internal')}
			class="-mb-[2px] border-b-4 pb-3 text-lg font-bold transition-colors
             {activeTab === 'internal'
				? 'border-emerald-600 text-emerald-700'
				: 'border-transparent text-slate-500 hover:text-slate-800'}"
		>
			📰 Berita SigapAsap
		</button>
		<button
			onclick={() => (activeTab = 'external')}
			class="-mb-[2px] border-b-4 pb-3 text-lg font-bold transition-colors
             {activeTab === 'external'
				? 'border-blue-600 text-blue-700'
				: 'border-transparent text-slate-500 hover:text-slate-800'}"
		>
			🌐 Kabar Nasional
		</button>
	</div>

	<!-- STATE LOADING / ERROR -->
	{#if (activeTab === 'internal' && isLoadingInternal) || (activeTab === 'external' && isLoadingExternal)}
		<div class="flex justify-center py-20">
			<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500"></div>
		</div>
	{:else if activeTab === 'external' && errorExternal}
		<div class="rounded-xl border border-red-200 bg-red-50 py-20 text-center text-red-600">
			<p class="mb-2 text-xl font-bold">Gagal Memuat Berita Eksternal</p>
			<p>Server penyedia berita sedang tidak dapat dihubungi.</p>
		</div>
	{:else if !headline}
		<div class="py-20 text-center text-slate-500">Belum ada berita untuk ditampilkan saat ini.</div>
	{:else}
		<!-- TAMPILAN BERITA (SAMA SEPERTI SEBELUMNYA) -->
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
			<div class="lg:col-span-8">
				<a
					href={headline.isExternal ? headline.link : `/berita/${headline.slug}`}
					target={headline.isExternal ? '_blank' : '_self'}
					class="group mb-10 block"
					in:fly={{ y: 20, duration: 400 }}
				>
					<div
						class="relative mb-4 aspect-video w-full overflow-hidden rounded-xl bg-slate-200 shadow-lg"
					>
						<img
							src={headline.image}
							alt={headline.title}
							class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
						<div
							class="absolute top-4 left-4 bg-{activeTab === 'internal'
								? 'red'
								: 'blue'}-600 rounded px-3 py-1.5 text-xs font-bold text-white shadow"
						>
							{headline.category}
						</div>
					</div>
					<h1
						class="mb-3 text-3xl leading-tight font-extrabold text-slate-900 transition-colors group-hover:text-emerald-600 md:text-4xl"
					>
						{headline.title}
					</h1>
					<p class="line-clamp-2 text-lg text-slate-600">{headline.excerpt}</p>
					<div class="mt-4 flex items-center gap-4 text-sm text-slate-500">
						<span class="font-semibold text-slate-700">{headline.author}</span>
						<span
							>{new Date(headline.date).toLocaleDateString('id-ID', {
								day: 'numeric',
								month: 'long',
								year: 'numeric'
							})}</span
						>
					</div>
				</a>

				<hr class="mb-8 border-slate-200" />

				<div class="space-y-6">
					{#each listNews as news, i (news.id)}
						<a
							href={news.isExternal ? news.link : `/berita/${news.slug}`}
							target={news.isExternal ? '_blank' : '_self'}
							class="group flex flex-col gap-6 border-b border-slate-100 pb-6 last:border-0 sm:flex-row"
							in:fly={{ y: 20, duration: 400, delay: i * 100 }}
						>
							<div
								class="aspect-video w-full flex-shrink-0 overflow-hidden rounded-lg bg-slate-200 sm:aspect-square sm:w-64"
							>
								<img
									src={news.image}
									alt={news.title}
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
							</div>
							<div class="flex flex-col justify-center">
								<div
									class="text-xs font-bold text-{activeTab === 'internal'
										? 'emerald'
										: 'blue'}-600 mb-2 tracking-wide uppercase"
								>
									{news.category}
								</div>
								<h2
									class="text-xl leading-snug font-bold text-slate-800 group-hover:text-{activeTab ===
									'internal'
										? 'emerald'
										: 'blue'}-600 mb-2 transition-colors"
								>
									{news.title}
								</h2>
								<p class="mb-3 line-clamp-2 text-sm text-slate-600">{news.excerpt}</p>
								<div class="mt-auto flex items-center gap-3 text-xs text-slate-400">
									<span>{news.author}</span>
									{#if news.isExternal}
										<span class="rounded bg-blue-100 px-2 py-0.5 text-blue-600"
											>Buka di Tab Baru ↗</span
										>
									{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
			</div>

			<!-- SIDEBAR -->
			<div class="lg:col-span-4">
				<div class="sticky top-24 rounded-xl border border-slate-200 bg-slate-50 p-6">
					<h2 class="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
						<span class="text-red-500">🔥</span> Info Terkait
					</h2>
					<div class="space-y-4">
						<div
							class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm"
						>
							<strong class="mb-1 block text-slate-800">Kenapa harus waspada?</strong>
							Paparan PM2.5 dapat menyebabkan ISPA, terutama pada anak-anak dan lansia.
						</div>
						<div
							class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm"
						>
							<strong class="mb-1 block text-slate-800">Sumber Data Kami:</strong>
							NASA FIRMS (Titik Panas), BMKG (Cuaca), AQICN (Udara).
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
