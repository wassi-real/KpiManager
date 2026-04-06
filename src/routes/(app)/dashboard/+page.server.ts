import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { MetricKey } from '$lib/types';

function todayStr(): string {
	return new Date().toISOString().split('T')[0];
}

function isIsoDate(value: string | null): value is string {
	return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(baseDate: string, n: number): string {
	const d = new Date(`${baseDate}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().split('T')[0];
}

function weekStartStr(baseDate: string): string {
	const d = new Date(`${baseDate}T12:00:00Z`);
	const dow = d.getUTCDay();
	const diff = dow === 0 ? -6 : 1 - dow;
	d.setUTCDate(d.getUTCDate() + diff);
	return d.toISOString().split('T')[0];
}

function dateRange(start: string, end: string): string[] {
	const out: string[] = [];
	let cur = start;
	while (cur <= end) {
		out.push(cur);
		cur = addDays(cur, 1);
	}
	return out;
}

function formatDateLabel(iso: string): string {
	return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	});
}

async function getActiveWorkspaceId(supabase: App.Locals['supabase'], userId: string): Promise<string | null> {
	const { data: profile } = await supabase
		.from('profiles')
		.select('active_workspace_id')
		.eq('id', userId)
		.single();
	return profile?.active_workspace_id ?? null;
}

function applyWorkspaceFilter<T extends { eq: (col: string, val: string) => T; is: (col: string, val: null) => T }>(
	query: T,
	workspaceId: string | null
): T {
	if (workspaceId) return query.eq('workspace_id', workspaceId);
	return query.is('workspace_id', null);
}

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, parent, url }) => {
	const { user } = await safeGetSession();
	if (!user) return { dayData: null, week: null, history: [], targets: null, selectedDate: '', prevDate: '', nextDate: '', selectedDateLabel: '', isToday: true };

	const parentData = await parent();
	const workspaceId = parentData.activeWorkspace?.id ?? null;

	const { data: profile } = await supabase
		.from('profiles')
		.select('target_dms, target_replies, target_posts, target_calls, target_clients')
		.eq('id', user.id)
		.single();

	const today = todayStr();
	const rawDay = url.searchParams.get('day');
	let selectedDate = today;
	if (isIsoDate(rawDay) && rawDay <= today) {
		selectedDate = rawDay;
	}

	const prevDate = addDays(selectedDate, -1);
	const nextDate = addDays(selectedDate, 1);
	const isToday = selectedDate === today;
	const canGoForward = nextDate <= today;

	let dayQuery = supabase.from('daily_stats').select('*').eq('user_id', user.id).eq('date', selectedDate);
	dayQuery = applyWorkspaceFilter(dayQuery, workspaceId);
	const { data: dayRow } = await dayQuery.single();

	const weekStart = weekStartStr(selectedDate);
	let weekQuery = supabase.from('daily_stats').select('dms, replies, posts, calls, clients').eq('user_id', user.id).gte('date', weekStart).lte('date', selectedDate);
	weekQuery = applyWorkspaceFilter(weekQuery, workspaceId);
	const { data: weekRows } = await weekQuery;

	const weekTotals = { dms: 0, replies: 0, posts: 0, calls: 0, clients: 0 };
	for (const row of weekRows ?? []) {
		weekTotals.dms += row.dms ?? 0;
		weekTotals.replies += row.replies ?? 0;
		weekTotals.posts += row.posts ?? 0;
		weekTotals.calls += row.calls ?? 0;
		weekTotals.clients += row.clients ?? 0;
	}

	const histStart = addDays(selectedDate, -6);
	const dates = dateRange(histStart, selectedDate);
	let histQuery = supabase.from('daily_stats').select('date, dms, replies, posts, calls, clients').eq('user_id', user.id).in('date', dates).order('date', { ascending: true });
	histQuery = applyWorkspaceFilter(histQuery, workspaceId);
	const { data: historyRows } = await histQuery;

	const history = dates.map((date) => {
		const row = historyRows?.find((r) => r.date === date);
		return { date, dms: row?.dms ?? 0, replies: row?.replies ?? 0, posts: row?.posts ?? 0, calls: row?.calls ?? 0, clients: row?.clients ?? 0 };
	});

	return {
		dayData: dayRow ?? { dms: 0, replies: 0, posts: 0, calls: 0, clients: 0 },
		week: weekTotals,
		history,
		selectedDate,
		prevDate,
		nextDate,
		canGoForward,
		isToday,
		selectedDateLabel: formatDateLabel(selectedDate),
		targets: profile ?? { target_dms: 50, target_replies: 10, target_posts: 2, target_calls: 5, target_clients: 1 }
	};
};

const VALID: MetricKey[] = ['dms', 'replies', 'posts', 'calls', 'clients'];

function normalizeValue(value: FormDataEntryValue | null): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	return Math.max(0, Math.floor(parsed));
}

function assertToday(formData: FormData) {
	const viewDate = formData.get('view_date');
	if (viewDate !== todayStr()) return fail(403, { message: 'Past days are locked' });
	return null;
}

async function mutate(direction: 1 | -1, request: Request, supabase: App.Locals['supabase'], userId: string) {
	const formData = await request.formData();
	const metric = formData.get('metric') as MetricKey;
	if (!VALID.includes(metric)) return fail(400, { message: 'Invalid metric' });
	const locked = assertToday(formData);
	if (locked) return locked;

	const workspaceId = await getActiveWorkspaceId(supabase, userId);
	const today = todayStr();

	let query = supabase.from('daily_stats').select('id, ' + metric).eq('user_id', userId).eq('date', today);
	query = applyWorkspaceFilter(query, workspaceId);
	const { data: existing } = await query.single();

	if (existing) {
		const row = existing as unknown as Record<string, number>;
		const newVal = Math.max(0, (row[metric] ?? 0) + direction);
		const { error } = await supabase.from('daily_stats').update({ [metric]: newVal } as Record<string, unknown>).eq('id', row.id as unknown as string);
		if (error) return fail(500, { message: error.message });
	} else if (direction > 0) {
		const ins: Record<string, unknown> = { user_id: userId, date: today, [metric]: 1 };
		if (workspaceId) ins.workspace_id = workspaceId;
		const { error } = await supabase.from('daily_stats').insert(ins);
		if (error) return fail(500, { message: error.message });
	}
	return { success: true };
}

export const actions: Actions = {
	increment: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401);
		return mutate(1, request, supabase, user.id);
	},

	decrement: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401);
		return mutate(-1, request, supabase, user.id);
	},

	setValue: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401);

		const formData = await request.formData();
		const metric = formData.get('metric') as MetricKey;
		if (!VALID.includes(metric)) return fail(400, { message: 'Invalid metric' });
		const locked = assertToday(formData);
		if (locked) return locked;

		const value = normalizeValue(formData.get('value'));
		const workspaceId = await getActiveWorkspaceId(supabase, user.id);
		const today = todayStr();

		let query = supabase.from('daily_stats').select('id').eq('user_id', user.id).eq('date', today);
		query = applyWorkspaceFilter(query, workspaceId);
		const { data: existing } = await query.single();

		if (existing) {
			const { error } = await supabase.from('daily_stats').update({ [metric]: value } as Record<string, unknown>).eq('id', existing.id as string);
			if (error) return fail(500, { message: error.message });
		} else {
			const ins: Record<string, unknown> = { user_id: user.id, date: today, [metric]: value };
			if (workspaceId) ins.workspace_id = workspaceId;
			const { error } = await supabase.from('daily_stats').insert(ins);
			if (error) return fail(500, { message: error.message });
		}
		return { success: true };
	},

	createWorkspace: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401);

		const formData = await request.formData();
		const name = formData.get('name') as string;
		if (!name?.trim()) return fail(400, { message: 'Name is required' });

		const { data: ws, error } = await supabase.from('workspaces').insert({ owner_id: user.id, name: name.trim() }).select().single();
		if (error) return fail(500, { message: error.message });

		await supabase.from('profiles').update({ active_workspace_id: ws.id } as Record<string, unknown>).eq('id', user.id);
		return { success: true };
	},

	switchWorkspace: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		if (!user) return fail(401);

		const formData = await request.formData();
		const wsId = formData.get('workspace_id') as string;
		await supabase.from('profiles').update({ active_workspace_id: wsId } as Record<string, unknown>).eq('id', user.id);
		return { success: true };
	}
};
