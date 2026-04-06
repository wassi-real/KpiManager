-- =============================================
-- Pipeline Scorecard — Full Schema + RLS
-- =============================================

-- 1. Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create policy "Owners can do everything with their workspace"
  on public.workspaces for all
  using (auth.uid() = owner_id);


-- 3. Workspace Members
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create policy "Members can read their memberships"
  on public.workspace_members for select
  using (auth.uid() = user_id);

create policy "Workspace owners can manage members"
  on public.workspace_members for all
  using (
    exists (
      select 1 from public.workspaces
      where id = workspace_id and owner_id = auth.uid()
    )
  );


-- 4. KPI Categories
create table if not exists public.kpi_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces on delete cascade not null,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.kpi_categories enable row level security;

create policy "Workspace members can read categories"
  on public.kpi_categories for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = kpi_categories.workspace_id and user_id = auth.uid()
    )
  );

create policy "Workspace owners can manage categories"
  on public.kpi_categories for all
  using (
    exists (
      select 1 from public.workspaces
      where id = kpi_categories.workspace_id and owner_id = auth.uid()
    )
  );


-- 5. KPIs
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces on delete cascade not null,
  category_id uuid references public.kpi_categories on delete cascade not null,
  name text not null,
  key text not null,
  unit_type text not null default 'number' check (unit_type in ('number', 'currency', 'percentage')),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.kpis enable row level security;

create policy "Workspace members can read KPIs"
  on public.kpis for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = kpis.workspace_id and user_id = auth.uid()
    )
  );

create policy "Workspace owners can manage KPIs"
  on public.kpis for all
  using (
    exists (
      select 1 from public.workspaces
      where id = kpis.workspace_id and owner_id = auth.uid()
    )
  );


-- 6. Weekly Scorecards
create table if not exists public.weekly_scorecards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces on delete cascade not null,
  week_start_date date not null,
  week_end_date date not null,
  notes text,
  created_by uuid references auth.users not null,
  created_at timestamptz not null default now()
);

alter table public.weekly_scorecards enable row level security;

create policy "Workspace members can read scorecards"
  on public.weekly_scorecards for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = weekly_scorecards.workspace_id and user_id = auth.uid()
    )
  );

create policy "Workspace owners can manage scorecards"
  on public.weekly_scorecards for all
  using (
    exists (
      select 1 from public.workspaces
      where id = weekly_scorecards.workspace_id and owner_id = auth.uid()
    )
  );


-- 7. Weekly KPI Targets
create table if not exists public.weekly_kpi_targets (
  id uuid primary key default gen_random_uuid(),
  weekly_scorecard_id uuid references public.weekly_scorecards on delete cascade not null,
  kpi_id uuid references public.kpis on delete cascade not null,
  target_value numeric not null default 0,
  unique (weekly_scorecard_id, kpi_id)
);

alter table public.weekly_kpi_targets enable row level security;

create policy "Members can read targets"
  on public.weekly_kpi_targets for select
  using (
    exists (
      select 1 from public.weekly_scorecards sc
      join public.workspace_members wm on wm.workspace_id = sc.workspace_id
      where sc.id = weekly_kpi_targets.weekly_scorecard_id and wm.user_id = auth.uid()
    )
  );

create policy "Owners can manage targets"
  on public.weekly_kpi_targets for all
  using (
    exists (
      select 1 from public.weekly_scorecards sc
      join public.workspaces w on w.id = sc.workspace_id
      where sc.id = weekly_kpi_targets.weekly_scorecard_id and w.owner_id = auth.uid()
    )
  );


-- 8. Weekly KPI Values
create table if not exists public.weekly_kpi_values (
  id uuid primary key default gen_random_uuid(),
  weekly_scorecard_id uuid references public.weekly_scorecards on delete cascade not null,
  kpi_id uuid references public.kpis on delete cascade not null,
  actual_value numeric not null default 0,
  unique (weekly_scorecard_id, kpi_id)
);

alter table public.weekly_kpi_values enable row level security;

create policy "Members can read values"
  on public.weekly_kpi_values for select
  using (
    exists (
      select 1 from public.weekly_scorecards sc
      join public.workspace_members wm on wm.workspace_id = sc.workspace_id
      where sc.id = weekly_kpi_values.weekly_scorecard_id and wm.user_id = auth.uid()
    )
  );

create policy "Owners can manage values"
  on public.weekly_kpi_values for all
  using (
    exists (
      select 1 from public.weekly_scorecards sc
      join public.workspaces w on w.id = sc.workspace_id
      where sc.id = weekly_kpi_values.weekly_scorecard_id and w.owner_id = auth.uid()
    )
  );


-- Indexes for performance
create index if not exists idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_kpi_categories_workspace on public.kpi_categories(workspace_id);
create index if not exists idx_kpis_workspace on public.kpis(workspace_id);
create index if not exists idx_kpis_category on public.kpis(category_id);
create index if not exists idx_scorecards_workspace on public.weekly_scorecards(workspace_id);
create index if not exists idx_scorecards_week on public.weekly_scorecards(week_start_date);
create index if not exists idx_targets_scorecard on public.weekly_kpi_targets(weekly_scorecard_id);
create index if not exists idx_values_scorecard on public.weekly_kpi_values(weekly_scorecard_id);
