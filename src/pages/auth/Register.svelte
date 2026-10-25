<script lang="ts">
	import AuthForm from '#lib/AuthForm.svelte';
	import { fieldClass } from '#lib/fieldClass';
	import { navigate, register } from '#lib/auth.svelte';

	let name = $state('');
	let username = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state('');

	const submit = async () => {
		busy = true;
		error = '';
		try {
			await register(name.trim(), username.trim(), password);
			navigate('/dashboard', true);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	};
</script>

<svelte:head>
	<title>Daftar | SigapAsap</title>
	<meta
		name="description"
		content="Buat akun SigapAsap untuk mengirim dan memantau laporan asap."
	/>
</svelte:head>

<AuthForm
	title="Daftar"
	subtitle="Buat akun untuk mengirim dan memantau laporan Anda."
	submitLabel="Buat Akun"
	{busy}
	{error}
	onsubmit={submit}
>
	<div>
		<label for="name" class="block text-sm font-semibold text-slate-200">Nama</label>
		<input
			id="name"
			name="name"
			type="text"
			autocomplete="name"
			required
			bind:value={name}
			class={fieldClass}
		/>
	</div>
	<div>
		<label for="username" class="block text-sm font-semibold text-slate-200">Username</label>
		<input
			id="username"
			name="username"
			type="text"
			autocomplete="username"
			required
			bind:value={username}
			class={fieldClass}
		/>
	</div>
	<div>
		<label for="password" class="block text-sm font-semibold text-slate-200">Password</label>
		<input
			id="password"
			name="password"
			type="password"
			autocomplete="new-password"
			minlength="6"
			required
			bind:value={password}
			class={fieldClass}
		/>
	</div>
	{#snippet footer()}
		Sudah punya akun?
		<a href="/auth/login" class="font-semibold text-orange-400 underline">Masuk</a>
	{/snippet}
</AuthForm>
