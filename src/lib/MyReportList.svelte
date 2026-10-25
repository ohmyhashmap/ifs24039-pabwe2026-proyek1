<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type MyReport } from './auth.svelte';

	let { limit }: { limit?: number } = $props();

	let items = $state<MyReport[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			items = await api<MyReport[]>('/reports/mine');
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	});

	let shown = $derived(limit ? items.slice(0, limit) : items);
</script>

{#if loading}
	<p class="text-slate-300" role="status">Memuat laporan…</p>
{:else if error}
	<p role="alert" class="text-red-300">{error}</p>
{:else if shown.length === 0}
	<p class="text-slate-300">
		Belum ada laporan. <a href="/lapor" class="font-semibold text-orange-400 underline"
			>Kirim laporan pertama Anda</a
		>.
	</p>
{:else}
	<ul class="space-y-3">
		{#each shown as report (report.id)}
			<li class="rounded-2xl border border-slate-800 bg-slate-900 p-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<span class="text-sm font-bold text-orange-400 capitalize"
						>{`Tingkat: ${report.severity}`}</span
					>
					<time class="text-xs text-slate-300" datetime={report.created_at}>
						{new Date(report.created_at).toLocaleString('id-ID')}
					</time>
				</div>
				<p class="mt-2 text-slate-200">{report.description}</p>
			</li>
		{/each}
	</ul>
{/if}
