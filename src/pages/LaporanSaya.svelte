<script lang="ts">
	import MyReportList from '#lib/MyReportList.svelte';
</script>

<svelte:head>
	<title>Laporan Saya | SigapAsap</title>
	<meta
		name="description"
		content="Daftar laporan asap yang pernah Anda kirim melalui SigapAsap."
	/>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-extrabold tracking-tight text-white">Laporan Saya</h1>
	<p class="mb-8 text-slate-300">Semua laporan yang pernah Anda kirim.</p>
	<MyReportList />
</div>
