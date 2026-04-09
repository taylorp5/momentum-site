-- Momentum V1 schema: profiles, projects, timeline_entries, distribution_entries
-- Run in Supabase SQL editor or via supabase db push

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.project_status as enum ('idea', 'building', 'launched', 'paused');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.timeline_entry_type as enum ('snapshot', 'note', 'link');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.distribution_platform as enum (
    'reddit',
    'tiktok',
    'twitter',
    'product_hunt',
    'instagram',
    'youtube',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_onboarding_idx on public.profiles (onboarding_completed);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  status public.project_status not null default 'idea',
  color text not null default '#6366f1',
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_status_idx on public.projects (status);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "projects_select_own"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "projects_insert_own"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "projects_update_own"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "projects_delete_own"
  on public.projects for delete
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- timeline_entries
-- -----------------------------------------------------------------------------
create table if not exists public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.timeline_entry_type not null,
  title text not null,
  description text not null default '',
  image_url text,
  external_url text,
  entry_date date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timeline_entries_project_id_idx on public.timeline_entries (project_id);
create index if not exists timeline_entries_user_id_idx on public.timeline_entries (user_id);
create index if not exists timeline_entries_entry_date_idx on public.timeline_entries (entry_date desc);

drop trigger if exists timeline_entries_set_updated_at on public.timeline_entries;
create trigger timeline_entries_set_updated_at
  before update on public.timeline_entries
  for each row execute function public.set_updated_at();

alter table public.timeline_entries enable row level security;

create policy "timeline_select_via_project"
  on public.timeline_entries for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = timeline_entries.project_id and p.user_id = auth.uid()
    )
  );

create policy "timeline_insert_via_project"
  on public.timeline_entries for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "timeline_update_via_project"
  on public.timeline_entries for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = timeline_entries.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "timeline_delete_via_project"
  on public.timeline_entries for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = timeline_entries.project_id and p.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- distribution_entries (metrics reserved for later — jsonb nullable)
-- -----------------------------------------------------------------------------
create table if not exists public.distribution_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform public.distribution_platform not null,
  title text,
  url text not null default '',
  notes text not null default '',
  date_posted date not null default (timezone('utc', now()))::date,
  metrics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists distribution_entries_project_id_idx on public.distribution_entries (project_id);
create index if not exists distribution_entries_platform_idx on public.distribution_entries (platform);
create index if not exists distribution_entries_date_posted_idx on public.distribution_entries (date_posted desc);

drop trigger if exists distribution_entries_set_updated_at on public.distribution_entries;
create trigger distribution_entries_set_updated_at
  before update on public.distribution_entries
  for each row execute function public.set_updated_at();

alter table public.distribution_entries enable row level security;

create policy "distribution_select_via_project"
  on public.distribution_entries for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = distribution_entries.project_id and p.user_id = auth.uid()
    )
  );

create policy "distribution_insert_via_project"
  on public.distribution_entries for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "distribution_update_via_project"
  on public.distribution_entries for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = distribution_entries.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "distribution_delete_via_project"
  on public.distribution_entries for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = distribution_entries.project_id and p.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Auth: create profile on signup
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Storage: timeline snapshot images
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('timeline-images', 'timeline-images', false)
on conflict (id) do nothing;

create policy "Timeline images read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'timeline-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Timeline images upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'timeline-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Timeline images update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'timeline-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'timeline-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Timeline images delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'timeline-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
