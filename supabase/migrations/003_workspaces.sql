-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create policy "Users manage own workspaces"
  on public.workspaces for all
  using (auth.uid() = owner_id);

-- Link daily_stats to a workspace
alter table public.daily_stats
  add column if not exists workspace_id uuid references public.workspaces on delete cascade;

-- Track active workspace per user
alter table public.profiles
  add column if not exists active_workspace_id uuid references public.workspaces on delete set null;
