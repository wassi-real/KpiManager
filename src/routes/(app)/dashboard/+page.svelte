<script lang="ts">
	import WeekBars from '$lib/components/WeekBars.svelte';
	import { METRICS } from '$lib/types';
	import type { MetricKey } from '$lib/types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Plus, Minus, Check, ChevronLeft, ChevronRight, Lock } from 'lucide-svelte';

	let { data } = $props();

	function val(key: MetricKey): number {
		if (!data.dayData) return 0;
		return (data.dayData as Record<string, number>)[key] ?? 0;
	}

	function targetFor(key: MetricKey): number {
		if (!data.targets) return 0;
		return (data.targets as Record<string, number>)[`target_${key}`] ?? 0;
	}

	function weekVal(key: MetricKey): number {
		if (!data.week) return 0;
		return (data.week as Record<string, number>)[key] ?? 0;
	}

	function historyFor(key: MetricKey): { label: string; value: number }[] {
		return (data.history ?? []).map((day: Record<string, unknown>) => ({
			label: new Date(`${day.date as string}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short' }),
			value: (day[key] as number) ?? 0
		}));
	}

	function pct(v: number, t: number): number {
		if (t <= 0) return 0;
		return Math.min(Math.round((v / t) * 100), 100);
	}

	function submitAndRefresh() {
		return async ({ update }: { update: (opts?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void> }) => {
			await update({ reset: false, invalidateAll: true });
		};
	}

	function goToDay(dateStr: string) {
		goto(`/dashboard?day=${dateStr}`, { keepFocus: true, noScroll: true });
	}

	function goToToday() {
		goto('/dashboard', { keepFocus: true, noScroll: true });
	}
</script>

<div class="space-y-8">
	{#if !data.dayData && (!data.history || data.history.length === 0)}
		<div class="rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center">
			<p class="text-lg font-bold text-zinc-900">No workspace selected</p>
			<p class="mt-1 text-sm text-zinc-500">Create a workspace from the top bar to start tracking.</p>
		</div>
	{:else}
		<section>
			<div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 class="text-sm font-bold uppercase tracking-widest text-zinc-400">
						Day View &middot; {data.selectedDateLabel}
					</h2>
					{#if !data.isToday}
						<p class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-zinc-500">
							<Lock class="h-3.5 w-3.5" strokeWidth={2.25} />
							Read-only. Only today can be edited.
						</p>
					{/if}
				</div>

				<div class="flex items-center gap-2 rounded-lg border border-zinc-200 px-2 py-2">
					<button
						type="button"
						onclick={() => goToDay(data.prevDate)}
						class="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-95"
						aria-label="Previous day"
					>
						<ChevronLeft class="h-4 w-4" strokeWidth={2.5} />
					</button>

					<div class="min-w-[140px] text-center">
						<p class="text-sm font-bold text-zinc-900">{data.selectedDateLabel}</p>
					</div>

					<button
						type="button"
						onclick={() => goToDay(data.nextDate)}
						disabled={!data.canGoForward}
						class="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
						aria-label="Next day"
					>
						<ChevronRight class="h-4 w-4" strokeWidth={2.5} />
					</button>

					<button
						type="button"
						onclick={goToToday}
						disabled={data.isToday}
						class="ml-1 rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-zinc-700 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
					>
						Today
					</button>
				</div>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="border-b-2 border-zinc-900">
							<th class="py-2.5 pr-4 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">Metric</th>
							<th class="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">Target</th>
							<th class="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">Actual</th>
							<th class="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">%</th>
							<th class="py-2.5 pl-4 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each METRICS as m}
							{@const v = val(m.key)}
							{@const tgt = targetFor(m.key)}
							{@const p = pct(v, tgt)}
							<tr class="border-b border-zinc-100 last:border-b-0">
								<td class="py-3 pr-4 text-sm font-semibold text-zinc-900">{m.label}</td>
								<td class="px-4 py-3 text-center text-sm tabular-nums text-zinc-400">{tgt > 0 ? tgt : '—'}</td>
								<td class="px-4 py-3 text-center">
									<form method="POST" action="?/setValue" use:enhance={submitAndRefresh} class="flex items-center justify-center gap-1">
										<input type="hidden" name="metric" value={m.key} />
										<input type="hidden" name="view_date" value={data.selectedDate} />
										<input
											type="number"
											name="value"
											value={v}
											min="0"
											inputmode="numeric"
											disabled={!data.isToday}
											aria-label={`${m.label} value`}
											class="w-20 rounded-md border border-zinc-200 px-2 py-1.5 text-center text-base font-black tabular-nums text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400"
										/>
										<button
											type="submit"
											disabled={!data.isToday}
											class="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
											aria-label={`Save ${m.label} value`}
										>
											<Check class="h-3.5 w-3.5" strokeWidth={2.5} />
										</button>
									</form>
								</td>
								<td class="px-4 py-3 text-center">
									{#if tgt > 0}
										<span class="inline-block rounded px-2 py-0.5 text-xs font-bold tabular-nums {p >= 100 ? 'bg-emerald-100 text-emerald-700' : p >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'}">
											{p}%
										</span>
									{:else}
										<span class="text-xs text-zinc-300">—</span>
									{/if}
								</td>
								<td class="py-3 pl-4">
									<div class="flex items-center justify-center gap-1">
										<form method="POST" action="?/decrement" use:enhance={submitAndRefresh}>
											<input type="hidden" name="metric" value={m.key} />
											<input type="hidden" name="view_date" value={data.selectedDate} />
											<button
												type="submit"
												disabled={!data.isToday || v <= 0}
												class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
												aria-label={`Decrement ${m.label}`}
											>
												<Minus class="h-3.5 w-3.5" strokeWidth={2.5} />
											</button>
										</form>
										<form method="POST" action="?/increment" use:enhance={submitAndRefresh}>
											<input type="hidden" name="metric" value={m.key} />
											<input type="hidden" name="view_date" value={data.selectedDate} />
											<button
												type="submit"
												disabled={!data.isToday}
												class="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white transition-colors hover:bg-zinc-700 active:scale-95 disabled:pointer-events-none disabled:opacity-30"
												aria-label={`Increment ${m.label}`}
											>
												<Plus class="h-3.5 w-3.5" strokeWidth={2.5} />
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section>
			<h2 class="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-400">This Week</h2>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="border-b-2 border-zinc-900">
							{#each METRICS as m}
								<th class="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">{m.label}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						<tr>
							{#each METRICS as m}
								<td class="px-4 py-3 text-center text-2xl font-black tabular-nums text-zinc-900">{weekVal(m.key)}</td>
							{/each}
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section>
			<h2 class="mb-3 text-sm font-bold uppercase tracking-widest text-zinc-400">Last 7 Days</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each METRICS as m}
					<div class="rounded-xl border border-zinc-200 p-4">
						<p class="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">{m.label}</p>
						<WeekBars days={historyFor(m.key)} />
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
