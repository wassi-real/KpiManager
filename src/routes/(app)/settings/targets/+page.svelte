<script lang="ts">
	import { enhance } from '$app/forms';
	import { METRICS } from '$lib/types';
	import { ArrowLeft, Save } from 'lucide-svelte';

	let { data } = $props();
	let saving = $state(false);
	let saved = $state(false);

	function targetVal(key: string): number {
		if (!data.targets) return 0;
		return (data.targets as Record<string, number>)[`target_${key}`] ?? 0;
	}
</script>

<div class="mx-auto max-w-md space-y-5">
	<div>
		<a
			href="/dashboard"
			class="mb-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-700"
		>
			<ArrowLeft class="h-3.5 w-3.5" strokeWidth={2} />
			Back
		</a>
		<h2 class="text-xl font-black text-zinc-900">Daily Targets</h2>
		<p class="mt-0.5 text-sm text-zinc-400">Set your daily goal for each metric.</p>
	</div>

	<form
		method="POST"
		action="?/save"
		class="rounded-xl border border-zinc-200 p-5"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
				saved = true;
				setTimeout(() => (saved = false), 2000);
			};
		}}
	>
		<div class="space-y-4">
			{#each METRICS as m}
				<div class="flex items-center justify-between gap-4">
					<label
						for="target_{m.key}"
						class="text-sm font-semibold text-zinc-700"
					>
						{m.label}
					</label>
					<input
						id="target_{m.key}"
						type="number"
						name="target_{m.key}"
						value={targetVal(m.key)}
						min="0"
						class="w-24 rounded-lg border border-zinc-200 px-3 py-2 text-right text-sm font-bold tabular-nums text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
					/>
				</div>
			{/each}
		</div>

		<div class="mt-5 flex items-center gap-3">
			<button
				type="submit"
				disabled={saving}
				class="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
			>
				<Save class="h-3.5 w-3.5" strokeWidth={2.5} />
				{saving ? 'Saving...' : 'Save'}
			</button>
			{#if saved}
				<span class="text-sm font-semibold text-emerald-600">Saved!</span>
			{/if}
		</div>
	</form>
</div>
