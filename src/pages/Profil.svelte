<script lang="ts">
	import { onMount } from 'svelte';
	import { fieldClass } from '#lib/fieldClass';
	import { api, auth, loadProfile, logout, type User } from '#lib/auth.svelte';

	let name = $state('');
	let busy = $state(false);
	let error = $state('');
	let saved = $state(false);

	onMount(async () => {
		await loadProfile();
		name = auth.user?.name ?? '';
	});

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		busy = true;
		error = '';
		saved = false;
		try {
			auth.user = await api<User>('/auth/profile', { method: 'PUT', body: { name: name.trim() } });
			saved = true;
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	};
</script>

<svelte:head>
	<title>Profil | SigapAsap</title>
	<meta name="description" content="Lihat dan ubah data profil akun SigapAsap Anda." />
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-extrabold tracking-tight text-white">Profil</h1>
	<p class="mb-8 text-slate-300">
		Username: <strong class="text-white">{auth.user?.username ?? '-'}</strong>
	</p>

	<form class="space-y-4" onsubmit={submit}>
		<div>
			<label for="name" class="block text-sm font-semibold text-slate-200">Nama</label>
			<input
				id="name"
				type="text"
				autocomplete="name"
				required
				bind:value={name}
				class={fieldClass}
			/>
		</div>
		{#if error}
			<p role="alert" class="text-red-300">{error}</p>
		{/if}
		{#if saved}
			<p role="status" class="text-emerald-400">Profil berhasil disimpan.</p>
		{/if}
		<div class="flex flex-wrap gap-3">
			<button
				type="submit"
				disabled={busy}
				class="rounded-xl bg-orange-700 px-5 py-2.5 font-bold text-white hover:bg-orange-800 disabled:opacity-60"
			>
				{busy ? 'Menyimpan…' : 'Simpan'}
			</button>
			<button
				type="button"
				onclick={logout}
				class="rounded-xl border border-slate-600 px-5 py-2.5 font-bold text-white hover:bg-slate-800"
			>
				Keluar
			</button>
		</div>
	</form>
</div>
