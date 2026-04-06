export interface DailyStat {
	id: string;
	user_id: string;
	workspace_id: string | null;
	date: string;
	dms: number;
	replies: number;
	posts: number;
	calls: number;
	clients: number;
}

export interface UserTargets {
	target_dms: number;
	target_replies: number;
	target_posts: number;
	target_calls: number;
	target_clients: number;
}

export interface Profile extends UserTargets {
	id: string;
	full_name: string;
	email: string;
	active_workspace_id: string | null;
}

export interface Workspace {
	id: string;
	owner_id: string;
	name: string;
	created_at: string;
}

export type MetricKey = 'dms' | 'replies' | 'posts' | 'calls' | 'clients';

export const METRICS: { key: MetricKey; label: string }[] = [
	{ key: 'dms', label: 'DMs Sent' },
	{ key: 'replies', label: 'Replies' },
	{ key: 'posts', label: 'Posts' },
	{ key: 'calls', label: 'Calls Booked' },
	{ key: 'clients', label: 'Clients Closed' }
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = Record<string, any>;
