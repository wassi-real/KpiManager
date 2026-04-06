<script lang="ts">
	import TopNav from '$lib/components/TopNav.svelte';

	let { children, data } = $props();

	const userName = $derived(
		data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || ''
	);
</script>

<div class="flex min-h-screen flex-col bg-white">
	<TopNav
		{userName}
		workspaces={data.workspaces ?? []}
		activeWorkspace={data.activeWorkspace ?? null}
	/>
	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
		{@render children()}
	</main>
</div>
