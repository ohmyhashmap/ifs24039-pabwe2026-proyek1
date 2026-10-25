<script lang="ts">
	import { onMount } from 'svelte';
	import MyReportList from '#lib/MyReportList.svelte';
	import { auth, loadProfile } from '#lib/auth.svelte';

	onMount(loadProfile);
</script>

<svelte:head>
	<title>Dashboard | SigapAsap</title>
	<meta name="description" content="Ringkasan akun dan laporan terbaru Anda di SigapAsap." />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-12">
	<h1 class="text-3xl font-extrabold tracking-tight text-white">
		{`Halo, ${auth.user ? auth.user.name : 'Pengguna'}`}
	</h1>
	<p class="mt-2 mb-8 text-slate-300">Pantau laporan terbaru dan kelola akun Anda.</p>

	<nav aria-label="Menu akun" class="mb-10 grid gap-4 sm:grid-cols-3">
		<a
			href="/laporan-saya"
			class="rounded-2xl border border-slate-800 bg-slate-900 p-5 font-bold text-white hover:border-orange-500"
			>Laporan Saya</a
		>
		<a
			href="/profil"
			class="rounded-2xl border border-slate-800 bg-slate-900 p-5 font-bold text-white hover:border-orange-500"
			>Profil</a
		>
		<a
			href="/pengaturan"
			class="rounded-2xl border border-slate-800 bg-slate-900 p-5 font-bold text-white hover:border-orange-500"
			>Pengaturan</a
		>
	</nav>

	<h2 class="mb-4 text-xl font-bold text-white">Laporan terbaru</h2>
	<MyReportList limit={3} />
</div>
