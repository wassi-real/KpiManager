import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!session || !user) {
		redirect(303, '/auth');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('active_workspace_id')
		.eq('id', user.id)
		.single();

	const { data: workspaces } = await supabase
		.from('workspaces')
		.select('*')
		.eq('owner_id', user.id)
		.order('created_at', { ascending: true });

	let activeWorkspace = null;
	if (profile?.active_workspace_id && workspaces) {
		activeWorkspace = workspaces.find((w) => w.id === profile.active_workspace_id) ?? null;
	}
	if (!activeWorkspace && workspaces && workspaces.length > 0) {
		activeWorkspace = workspaces[0];
	}

	return { session, user, workspaces: workspaces ?? [], activeWorkspace };
};
