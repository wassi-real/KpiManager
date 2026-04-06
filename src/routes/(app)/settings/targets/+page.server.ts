import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) return { targets: null };

	const { data: profile } = await supabase
		.from('profiles')
		.select('target_dms, target_replies, target_posts, target_calls, target_clients')
		.eq('id', user.id)
		.single();

	return {
		targets: profile ?? {
			target_dms: 50,
			target_replies: 10,
			target_posts: 2,
			target_calls: 5,
			target_clients: 1
		}
	};
};

export const actions: Actions = {
	save: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401);

		const formData = await request.formData();

		const targets = {
			target_dms: parseInt(formData.get('target_dms') as string) || 0,
			target_replies: parseInt(formData.get('target_replies') as string) || 0,
			target_posts: parseInt(formData.get('target_posts') as string) || 0,
			target_calls: parseInt(formData.get('target_calls') as string) || 0,
			target_clients: parseInt(formData.get('target_clients') as string) || 0
		};

		const { error } = await supabase
			.from('profiles')
			.update(targets)
			.eq('id', user.id);

		if (error) return fail(500, { message: error.message });
		return { success: true };
	}
};
