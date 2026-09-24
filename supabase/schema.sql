create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active','completed','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text,
  status text not null default 'started' check (status in ('started','completed','failed')),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.missions enable row level security;
alter table public.ai_runs enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles own row" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles own update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "workspace owner access" on public.workspaces for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "member self access" on public.workspace_members for select to authenticated using ((select auth.uid()) = user_id);
create policy "mission owner access" on public.missions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai run owner access" on public.ai_runs for select to authenticated using ((select auth.uid()) = user_id);
create policy "audit own access" on public.audit_logs for select to authenticated using ((select auth.uid()) = user_id);


create table if not exists public.mission_milestones (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  status text not null default 'pending' check (status in ('pending','active','completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.mission_tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.mission_milestones(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','blocked')),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'manual' check (trigger_type in ('manual','schedule','event')),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.automation_workflows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  output jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);
create index if not exists idx_workspace_members_user_id on public.workspace_members(user_id);
create index if not exists idx_missions_user_created on public.missions(user_id, created_at desc);
create index if not exists idx_missions_workspace_status on public.missions(workspace_id, status);
create index if not exists idx_ai_runs_user_created on public.ai_runs(user_id, created_at desc);
create index if not exists idx_audit_logs_user_created on public.audit_logs(user_id, created_at desc);
create index if not exists idx_milestones_mission_position on public.mission_milestones(mission_id, position);
create index if not exists idx_tasks_milestone_position on public.mission_tasks(milestone_id, position);
create index if not exists idx_tasks_mission_status on public.mission_tasks(mission_id, status);
create index if not exists idx_automation_workflows_user on public.automation_workflows(user_id, created_at desc);
create index if not exists idx_automation_runs_workflow_created on public.automation_runs(workflow_id, created_at desc);

alter table public.mission_milestones enable row level security;
alter table public.mission_tasks enable row level security;
alter table public.automation_workflows enable row level security;
alter table public.automation_runs enable row level security;

create policy "milestone owner access" on public.mission_milestones for all to authenticated
using (exists (select 1 from public.missions m where m.id = mission_id and m.user_id = (select auth.uid())))
with check (exists (select 1 from public.missions m where m.id = mission_id and m.user_id = (select auth.uid())));

create policy "task owner access" on public.mission_tasks for all to authenticated
using (exists (select 1 from public.missions m where m.id = mission_id and m.user_id = (select auth.uid())))
with check (exists (select 1 from public.missions m where m.id = mission_id and m.user_id = (select auth.uid())));

create policy "automation workflow owner access" on public.automation_workflows for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "automation run owner access" on public.automation_runs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


alter table public.automation_workflows add column if not exists next_run_at timestamptz;
create index if not exists idx_automation_workflows_due on public.automation_workflows(enabled, trigger_type, next_run_at) where enabled = true and trigger_type = 'schedule';
