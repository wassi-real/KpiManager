<script lang="ts">
	import { Tabs } from 'bits-ui';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { goto, invalidateAll } from '$app/navigation';
	import { BarChart3 } from 'lucide-svelte';

	const supabase = createSupabaseBrowserClient();

	let activeTab = $state('login');
	let email = $state('');
	let password = $state('');
	let fullName = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	async function handleLogin() {
		loading = true;
		errorMsg = '';
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) {
			errorMsg = error.message;
			loading = false;
			return;
		}
		await invalidateAll();
		goto('/dashboard');
	}

	async function handleSignup() {
		loading = true;
		errorMsg = '';
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: { data: { full_name: fullName } }
		});
		if (error) {
			errorMsg = error.message;
			loading = false;
			return;
		}
		if (data.session) {
			await invalidateAll();
			goto('/dashboard');
			loading = false;
			return;
		}
		const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
		if (signInError) {
			errorMsg = signInError.message;
			loading = false;
			return;
		}
		await invalidateAll();
		goto('/dashboard');
		loading = false;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (activeTab === 'login') handleLogin();
		else handleSignup();
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-white px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<BarChart3 class="mx-auto mb-3 h-8 w-8 text-zinc-900" strokeWidth={2.5} />
			<h1 class="text-xl font-black tracking-tight text-zinc-900">KPIMANAGER</h1>
			<p class="mt-1 text-sm text-zinc-400">Track your daily KPIs.</p>
		</div>

		<div class="rounded-xl border border-zinc-200 p-6">
			<Tabs.Root bind:value={activeTab}>
				<Tabs.List class="mb-5 flex rounded-lg border border-zinc-200">
					<Tabs.Trigger
						value="login"
						class="flex-1 rounded-l-lg py-2 text-sm font-bold transition-colors data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=inactive]:text-zinc-400"
					>
						Log In
					</Tabs.Trigger>
					<Tabs.Trigger
						value="signup"
						class="flex-1 rounded-r-lg border-l border-zinc-200 py-2 text-sm font-bold transition-colors data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=inactive]:text-zinc-400"
					>
						Sign Up
					</Tabs.Trigger>
				</Tabs.List>

				<form onsubmit={handleSubmit}>
					<Tabs.Content value="signup">
						<div class="mb-3">
							<label for="fullName" class="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-400">
								Full Name
							</label>
							<input
								id="fullName"
								type="text"
								bind:value={fullName}
								required
								class="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
								placeholder="Jane Smith"
							/>
						</div>
					</Tabs.Content>

					<div class="mb-3">
						<label for="email" class="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-400">
							Email
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
							placeholder="you@company.com"
						/>
					</div>

					<div class="mb-5">
						<label for="password" class="mb-1 block text-xs font-bold uppercase tracking-widest text-zinc-400">
							Password
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							minlength={6}
							class="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
							placeholder="••••••••"
						/>
					</div>

					{#if errorMsg}
						<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
							{errorMsg}
						</div>
					{/if}

					<button
						type="submit"
						disabled={loading}
						class="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
					>
						{#if loading}
							Processing...
						{:else if activeTab === 'login'}
							Log In
						{:else}
							Create Account
						{/if}
					</button>
				</form>
			</Tabs.Root>
		</div>
	</div>
</div>
