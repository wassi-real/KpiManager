alter table public.daily_stats
	drop constraint if exists daily_stats_user_id_date_key;

drop index if exists idx_daily_stats_user_workspace_date;

create unique index if not exists idx_daily_stats_user_workspace_date
	on public.daily_stats (user_id, workspace_id, date) nulls not distinct;

create index if not exists idx_daily_stats_user_workspace_lookup
	on public.daily_stats (user_id, workspace_id, date);
