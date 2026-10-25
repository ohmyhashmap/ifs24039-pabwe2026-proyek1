<script lang="ts">
	import { fieldClass } from '#lib/fieldClass';
	import { api } from '#lib/auth.svelte';

	let currentPassword = $state('');
	let newPassword = $state('');
	let busy = $state(false);
	let error = $state('');
	let saved = $state(false);

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		busy = true;
		error = '';
		saved = false;
		try {
			await api('/auth/password', {
				method: 'PUT',
				body: { currentPassword, newPassword }
			});
			currentPassword = '';
			newPassword = '';
			saved = true;
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	};
</script>

<svelte:head>
	<title>Pengaturan | SigapAsap</title>
	<meta name="description" content="Ubah kata sandi dan pengaturan keamanan akun SigapAsap." />
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-12">
	<h1 class="mb-2 text-3xl font-extrabold tracking-tight text-white">Pengaturan</h1>
	<p class="mb-8 text-slate-300">Ubah kata sandi akun Anda.</p>

	<form class="space-y-4" onsubmit={submit}>
		<div>
			<label for="current-password" class="block text-sm font-semibold text-slate-200"
				>Password saat ini</label
			>
			<input
				id="current-password"
				type="password"
				autocomplete="current-password"
				required
				bind:value={currentPassword}
				class={fieldClass}
			/>
		</div>
		<div>
			<label for="new-password" class="block text-sm font-semibold text-slate-200"
				>Password baru</label
			>
			<input
				id="new-password"
				type="password"
				autocomplete="new-password"
				minlength="6"
				required
				bind:value={newPassword}
				class={fieldClass}
			/>
		</div>
		{#if error}
			<p role="alert" class="text-red-300">{error}</p>
		{/if}
		{#if saved}
			<p role="status" class="text-emerald-400">Password berhasil diubah.</p>
		{/if}
		<button
			type="submit"
			disabled={busy}
			class="rounded-xl bg-orange-700 px-5 py-2.5 font-bold text-white hover:bg-orange-800 disabled:opacity-60"
		>
			{busy ? 'Menyimpan…' : 'Ubah Password'}
		</button>
	</form>
</div>
