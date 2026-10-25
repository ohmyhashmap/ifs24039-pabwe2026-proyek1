<div class="mx-auto max-w-4xl px-4 py-16">
	<h1 class="mb-6 text-center text-4xl font-extrabold tracking-tight text-white">
		Tentang SigapAsap
	</h1>
	<div
		class="mx-auto mb-10 h-1 w-24 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
	></div>

	<div class="mx-auto prose prose-lg leading-relaxed text-slate-300 prose-invert">
		<p class="mb-4">
			<strong class="text-orange-500">SigapAsap</strong> adalah platform sistem peringatan dini kabut
			asap karhutla lintas batas (transboundary haze) berbasis integrasi multi-sinyal data terpadu.
		</p>
		<p class="mb-4">
			Inovasi ini lahir dari fenomena di mana suatu wilayah (seperti Sumatera Utara) dapat
			diselimuti asap tebal meskipun tidak memiliki titik api lokal, akibat pergerakan angin dari
			wilayah lain. Oleh karena itu, pemantauan titik api saja tidak cukup.
		</p>

		<h3 class="mt-8 mb-4 text-2xl font-bold text-white">Arsitektur & Data Pipeline</h3>
		<p class="mb-4">
			Sistem ini dibangun menggunakan arsitektur modern <em class="text-slate-200">Client-Server</em
			>
			(Microservices-ready) dengan Vite dan Svelte SPA di sisi antarmuka serta Hono (Bun) di sisi backend
			API. Data diorkestrasi secara <em class="text-slate-200">real-time</em> melalui API terpercaya:
		</p>
		<ul class="mb-4 list-disc space-y-2 pl-6">
			<li>
				<strong class="text-orange-400">NASA FIRMS:</strong> Pemantauan titik panas satelit (VIIRS).
			</li>
			<li>
				<strong class="text-orange-400">Open-Meteo:</strong> Prediksi arah dan kecepatan angin.
			</li>
			<li>
				<strong class="text-orange-400">AQICN / BMKG:</strong> Pemantauan kualitas udara dan konsentrasi
				PM2.5.
			</li>
		</ul>

		<!-- Kotak Kutipan (Dark Mode) -->
		<div class="my-8 rounded-r-xl border-l-4 border-orange-500 bg-slate-900 p-6 shadow-lg">
			<p class="m-0 font-medium text-slate-200 italic">
				"Kami menerjemahkan data satelit pemerintah yang rumit menjadi <strong
					class="text-orange-500 not-italic">aksi nyata</strong
				> (actionable insights) di tingkat lapangan, memastikan anda mendapatkan perlindungan yang tepat
				waktu."
			</p>
		</div>
	</div>
</div>
