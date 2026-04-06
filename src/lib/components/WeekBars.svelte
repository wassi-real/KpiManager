<script lang="ts">
	interface DayEntry {
		label: string;
		value: number;
	}

	interface Props {
		days: DayEntry[];
	}

	let { days }: Props = $props();

	const maxVal = $derived(Math.max(...days.map((d) => d.value), 1));
</script>

<div class="space-y-1.5">
	{#each days as day}
		{@const pct = Math.max((day.value / maxVal) * 100, 2)}
		<div class="flex items-center gap-2">
			<span class="w-7 text-[11px] font-medium text-zinc-400">{day.label}</span>
			<div class="h-4 flex-1 overflow-hidden rounded bg-zinc-100">
				<div
					class="h-full rounded bg-zinc-900 transition-all duration-300"
					style="width: {pct}%"
				></div>
			</div>
			<span class="w-6 text-right text-[11px] font-bold tabular-nums text-zinc-600">
				{day.value}
			</span>
		</div>
	{/each}
</div>
