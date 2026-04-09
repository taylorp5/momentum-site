-- Unify distribution posts into timeline_entries as type 'distribution'.
-- Requires migration `20260407145000_timeline_entry_type_event_values.sql` first.

-- -----------------------------------------------------------------------------
-- timeline_entries: distribution-specific columns
-- -----------------------------------------------------------------------------
alter table public.timeline_entries
  add column if not exists platform public.distribution_platform,
  add column if not exists metrics jsonb;

create index if not exists timeline_entries_type_idx
  on public.timeline_entries (type);

create index if not exists timeline_entries_distribution_platform_idx
  on public.timeline_entries (platform)
  where type = 'distribution';

comment on column public.timeline_entries.platform is
  'Set when type = distribution (channel where the post ran).';

comment on column public.timeline_entries.metrics is
  'Optional performance JSON when type = distribution (views, likes, comments, etc.).';

-- -----------------------------------------------------------------------------
-- Migrate distribution_entries → timeline_entries (preserve ids for attachments)
-- -----------------------------------------------------------------------------
insert into public.timeline_entries (
  id,
  project_id,
  user_id,
  type,
  title,
  description,
  image_url,
  external_url,
  entry_date,
  source_type,
  source_metadata,
  platform,
  metrics,
  created_at,
  updated_at
)
select
  d.id,
  d.project_id,
  d.user_id,
  'distribution'::public.timeline_entry_type,
  coalesce(nullif(btrim(d.title), ''), 'Distribution post'),
  coalesce(d.notes, ''),
  null,
  nullif(btrim(d.url), ''),
  d.date_posted,
  d.source_type,
  d.source_metadata,
  d.platform,
  d.metrics,
  d.created_at,
  d.updated_at
from public.distribution_entries d
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- distribution_attachments → link to timeline_entries
-- -----------------------------------------------------------------------------
alter table public.distribution_attachments
  add column if not exists timeline_entry_id uuid references public.timeline_entries (id) on delete cascade;

update public.distribution_attachments a
set timeline_entry_id = a.distribution_entry_id
where a.timeline_entry_id is null;

drop policy if exists "distribution_attachments_select_via_entry" on public.distribution_attachments;
drop policy if exists "distribution_attachments_insert_via_entry" on public.distribution_attachments;
drop policy if exists "distribution_attachments_delete_via_entry" on public.distribution_attachments;

alter table public.distribution_attachments
  drop constraint if exists distribution_attachments_distribution_entry_id_fkey;

alter table public.distribution_attachments
  drop column if exists distribution_entry_id;

alter table public.distribution_attachments
  alter column timeline_entry_id set not null;

drop index if exists distribution_attachments_entry_idx;

create index if not exists distribution_attachments_timeline_entry_idx
  on public.distribution_attachments (timeline_entry_id, created_at desc);

create policy "distribution_attachments_select_via_timeline"
  on public.distribution_attachments for select
  using (
    exists (
      select 1
      from public.timeline_entries t
      join public.projects p on p.id = t.project_id
      where t.id = distribution_attachments.timeline_entry_id
        and p.user_id = auth.uid()
    )
  );

create policy "distribution_attachments_insert_via_timeline"
  on public.distribution_attachments for insert
  with check (
    exists (
      select 1
      from public.timeline_entries t
      join public.projects p on p.id = t.project_id
      where t.id = distribution_attachments.timeline_entry_id
        and p.user_id = auth.uid()
    )
  );

create policy "distribution_attachments_delete_via_timeline"
  on public.distribution_attachments for delete
  using (
    exists (
      select 1
      from public.timeline_entries t
      join public.projects p on p.id = t.project_id
      where t.id = distribution_attachments.timeline_entry_id
        and p.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- distribution_metric_snapshots → timeline_entry_id
-- -----------------------------------------------------------------------------
alter table public.distribution_metric_snapshots
  add column if not exists timeline_entry_id uuid references public.timeline_entries (id) on delete cascade;

update public.distribution_metric_snapshots s
set timeline_entry_id = s.distribution_entry_id
where s.timeline_entry_id is null;

drop policy if exists "distribution_metric_snapshots_select_via_entry" on public.distribution_metric_snapshots;
drop policy if exists "distribution_metric_snapshots_insert_via_entry" on public.distribution_metric_snapshots;

alter table public.distribution_metric_snapshots
  drop constraint if exists distribution_metric_snapshots_distribution_entry_id_fkey;

alter table public.distribution_metric_snapshots
  drop column if exists distribution_entry_id;

alter table public.distribution_metric_snapshots
  alter column timeline_entry_id set not null;

drop index if exists distribution_metric_snapshots_entry_idx;

create index if not exists distribution_metric_snapshots_timeline_entry_idx
  on public.distribution_metric_snapshots (timeline_entry_id, captured_at desc);

create policy "distribution_metric_snapshots_select_via_timeline"
  on public.distribution_metric_snapshots for select
  using (
    exists (
      select 1
      from public.timeline_entries t
      join public.projects p on p.id = t.project_id
      where t.id = distribution_metric_snapshots.timeline_entry_id
        and p.user_id = auth.uid()
    )
  );

create policy "distribution_metric_snapshots_insert_via_timeline"
  on public.distribution_metric_snapshots for insert
  with check (
    exists (
      select 1
      from public.timeline_entries t
      join public.projects p on p.id = t.project_id
      where t.id = distribution_metric_snapshots.timeline_entry_id
        and p.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Drop legacy distribution_entries
-- -----------------------------------------------------------------------------
drop table if exists public.distribution_entries;
