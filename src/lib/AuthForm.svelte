<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		submitLabel,
		busy,
		error,
		onsubmit,
		children,
		footer
	}: {
		title: string;
		subtitle: string;
		submitLabel: string;
		busy: boolean;
		error: string;
		onsubmit: () => void;
		children: Snippet;
		footer: Snippet;
	} = $props();
</script>

<div class="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
	<div class="w-full rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
		<h1 class="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
		<p class="mt-2 mb-6 text-sm text-slate-300">{subtitle}</p>

		<form
			class="space-y-4"
			onsubmit={(event) => {
				event.preventDefault();
				onsubmit();
			}}
		>
			{@render children()}

			{#if error}
				<p
					role="alert"
					class="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"
				>
					{error}
				</p>
			{/if}

			<button
				type="submit"
				disabled={busy}
				class="w-full rounded-xl bg-orange-700 px-5 py-3 font-bold text-white transition-colors hover:bg-orange-800 disabled:opacity-60"
			>
				{busy ? 'Memproses…' : submitLabel}
			</button>
		</form>

		<p class="mt-6 text-center text-sm text-slate-300">{@render footer()}</p>
	</div>
</div>
