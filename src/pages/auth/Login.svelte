<script lang="ts">
	import AuthForm from '#lib/AuthForm.svelte';
	import { fieldClass } from '#lib/fieldClass';
	import { login, navigate } from '#lib/auth.svelte';

	let username = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state('');

	const submit = async () => {
		busy = true;
		error = '';
		try {
			await login(username.trim(), password);
			navigate('/dashboard', true);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = false;
		}
	};
</script>

<svelte:head>
	<title>Masuk | SigapAsap</title>
	<meta name="description" content="Masuk ke akun SigapAsap untuk mengelola laporan asap Anda." />
</svelte:head>

<AuthForm
	title="Masuk"
	subtitle="Masuk untuk melihat dashboard dan laporan Anda."
	submitLabel="Masuk"
	{busy}
	{error}
	onsubmit={submit}
>
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
			autocomplete="current-password"
			required
			bind:value={password}
			class={fieldClass}
		/>
	</div>
	{#snippet footer()}
		Belum punya akun?
		<a href="/auth/register" class="font-semibold text-orange-400 underline">Daftar</a>
	{/snippet}
</AuthForm>
