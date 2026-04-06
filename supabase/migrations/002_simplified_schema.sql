-- =============================================
-- Simplified Schema — Daily Counter Tool
-- =============================================

-- Profiles: add daily target columns
alter table public.profiles
  add column if not exists target_dms int not null default 50,
  add column if not exists target_replies int not null default 10,
  add column if not exists target_posts int not null default 2,
  add column if not exists target_calls int not null default 5,
  add column if not exists target_clients int not null default 1;

-- Daily stats
create table if not exists public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  dms int not null default 0,
  replies int not null default 0,
  posts int not null default 0,
  calls int not null default 0,
  clients int not null default 0,
  unique (user_id, date)
);

alter table public.daily_stats enable row level security;

create policy "Users own their stats"
  on public.daily_stats for all
  using (auth.uid() = user_id);

create index if not exists idx_daily_stats_user_date
  on public.daily_stats(user_id, date);
