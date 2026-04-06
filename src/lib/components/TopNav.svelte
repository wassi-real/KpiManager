<script lang="ts">
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { BarChart3, LogOut, Target, ChevronDown, Plus } from 'lucide-svelte';
	import { Dialog } from 'bits-ui';
	import { enhance } from '$app/forms';
	import type { Workspace } from '$lib/types';

	interface Props {
		userName?: string;
		workspaces?: Workspace[];
		activeWorkspace?: Workspace | null;
	}

	let { userName = '', workspaces = [], activeWorkspace = null }: Props = $props();

	const supabase = createSupabaseBrowserClient();

	let dropdownOpen = $state(false);
	let createOpen = $state(false);
	let newName = $state('');

	async function handleLogout() {
		await supabase.auth.signOut();
		goto('/auth');
	}
</script>

<header class="sticky top-0 z-50 border-b border-zinc-200 bg-white">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
		<div class="flex items-center gap-4">
			<a href="/dashboard" class="flex items-center gap-2">
				<BarChart3 class="h-5 w-5" strokeWidth={2.5} />
				<span class="text-base font-black tracking-tight">KPIMANAGER</span>
			</a>

			{#if workspaces.length > 0}
				<div class="relative">
					<button
						onclick={() => (dropdownOpen = !dropdownOpen)}
						class="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
					>
						{activeWorkspace?.name ?? 'Select workspace'}
						<ChevronDown class="h-3.5 w-3.5 text-zinc-400" strokeWidth={2} />
					</button>

					{#if dropdownOpen}
						<div
							class="absolute left-0 top-full z-50 mt-1 min-w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
						>
							{#each workspaces as ws}
								<form method="POST" action="/dashboard?/switchWorkspace" use:enhance={() => { dropdownOpen = false; return async ({ update }) => { await update(); }; }}>
									<input type="hidden" name="workspace_id" value={ws.id} />
									<button
										type="submit"
										class="flex w-full items-center px-3 py-2 text-left text-sm font-medium transition-colors {ws.id === activeWorkspace?.id ? 'bg-zinc-100 font-bold text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'}"
									>
										{ws.name}
									</button>
								</form>
							{/each}
							<div class="border-t border-zinc-100 pt-1 mt-1">
								<button
									onclick={() => { dropdownOpen = false; createOpen = true; }}
									class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-zinc-500 hover:bg-zinc-50"
								>
									<Plus class="h-3.5 w-3.5" strokeWidth={2.5} />
									New workspace
								</button>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<button
					onclick={() => (createOpen = true)}
					class="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
				>
					<Plus class="h-3.5 w-3.5" strokeWidth={2.5} />
					Create workspace
				</button>
			{/if}
		</div>

		<div class="flex items-center gap-1">
			{#if userName}
				<span class="hidden text-sm font-medium text-zinc-400 sm:inline mr-2">{userName}</span>
			{/if}

			<a
				href="/settings/targets"
				class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
				title="Targets"
			>
				<Target class="h-4 w-4" strokeWidth={2} />
			</a>

			<button
				onclick={handleLogout}
				class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
				title="Log out"
			>
				<LogOut class="h-4 w-4" strokeWidth={2} />
			</button>
		</div>
	</div>
</header>

<!-- Click-away for dropdown -->
{#if dropdownOpen}
	<button class="fixed inset-0 z-40" onclick={() => (dropdownOpen = false)} aria-label="Close menu"></button>
{/if}

<!-- Create workspace dialog -->
<Dialog.Root bind:open={createOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
		<Dialog.Content class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
			<Dialog.Title class="mb-4 text-lg font-bold text-zinc-900">New Workspace</Dialog.Title>
			<form method="POST" action="/dashboard?/createWorkspace" use:enhance={() => { return async ({ update }) => { await update(); createOpen = false; newName = ''; }; }}>
				<input
					type="text"
					name="name"
					bind:value={newName}
					required
					placeholder="e.g. My Agency"
					class="mb-4 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
				/>
				<div class="flex gap-2">
					<button
						type="submit"
						class="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98]"
					>
						Create
					</button>
					<Dialog.Close class="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
						Cancel
					</Dialog.Close>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
