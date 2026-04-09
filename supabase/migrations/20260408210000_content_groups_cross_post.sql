-- Cross-post tracking: one content idea, many distribution posts (Pro).
-- Optional subreddit for Reddit rows (all plans).

create table if not exists public.content_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_groups_user_id_idx
  on public.content_groups (user_id, created_at desc);

drop trigger if exists content_groups_set_updated_at on public.content_groups;
create trigger content_groups_set_updated_at
  before update on public.content_groups
  for each row execute function public.set_updated_at();

alter table public.content_groups enable row level security;

create policy "content_groups_select_own"
  on public.content_groups for select
  using (auth.uid() = user_id);

create policy "content_groups_insert_own"
  on public.content_groups for insert
  with check (auth.uid() = user_id);

create policy "content_groups_update_own"
  on public.content_groups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "content_groups_delete_own"
  on public.content_groups for delete
  using (auth.uid() = user_id);

alter table public.timeline_entries
  add column if not exists content_group_id uuid references public.content_groups (id) on delete set null,
  add column if not exists subreddit text;

create index if not exists timeline_entries_content_group_id_idx
  on public.timeline_entries (content_group_id)
  where content_group_id is not null;

comment on table public.content_groups is
  'User-defined group linking multiple distribution timeline rows (same idea, different platforms/dates).';

comment on column public.timeline_entries.content_group_id is
  'When type = distribution, optional link to a shared content idea (cross-post tracking).';

comment on column public.timeline_entries.subreddit is
  'When platform = reddit, optional subreddit name (without r/) for per-community comparison.';
