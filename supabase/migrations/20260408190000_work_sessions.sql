create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  last_resumed_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null check (status in ('running', 'paused', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists work_sessions_one_running_per_user
  on public.work_sessions (user_id)
  where status = 'running';

create index if not exists work_sessions_user_project_idx
  on public.work_sessions (user_id, project_id, created_at desc);

alter table public.work_sessions enable row level security;

create policy "Users can read own work sessions"
  on public.work_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own work sessions"
  on public.work_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own work sessions"
  on public.work_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
