-- Two-level timeline taxonomy + flexible JSON metadata. Keeps existing `type` for queries/RLS.

do $$ begin
  create type public.timeline_event_family as enum (
    'work',
    'build',
    'distribution',
    'financial',
    'asset',
    'insight'
  );
exception
  when duplicate_object then null;
end $$;

-- Enum value `work` is added in 20260408225500_timeline_entry_type_add_work.sql (separate transaction).

alter table public.timeline_entries
  add column if not exists event_family public.timeline_event_family,
  add column if not exists event_subtype text,
  add column if not exists event_metadata jsonb not null default '{}'::jsonb;

-- Backfill by legacy `type` (and heuristics for notes).
update public.timeline_entries
set
  event_family = 'distribution',
  event_subtype = case
    when content_group_id is not null then 'cross_post'
    else 'distribution_post'
  end
where type = 'distribution';

update public.timeline_entries
set event_family = 'financial', event_subtype = 'cost'
where type = 'cost';

update public.timeline_entries
set event_family = 'financial', event_subtype = 'revenue'
where type = 'revenue';

update public.timeline_entries
set event_family = 'financial', event_subtype = 'deal'
where type = 'deal';

update public.timeline_entries
set event_family = 'build', event_subtype = 'build_note'
where type = 'build';

update public.timeline_entries
set event_family = 'build', event_subtype = 'experiment'
where type = 'experiment';

update public.timeline_entries
set event_family = 'insight', event_subtype = 'reflection'
where type = 'insight';

update public.timeline_entries
set event_family = 'asset', event_subtype = 'screenshot'
where type = 'snapshot';

update public.timeline_entries
set event_family = 'build', event_subtype = 'ship_update'
where type = 'link';

-- Work-session notes (previously generic notes)
update public.timeline_entries
set event_family = 'work', event_subtype = 'manual_time_entry'
where type = 'note' and title ilike 'worked %';

-- Remaining notes → insight/reflection
update public.timeline_entries
set event_family = 'insight', event_subtype = 'reflection'
where type = 'note' and event_family is null;

-- Safety: anything still null
update public.timeline_entries
set event_family = 'insight', event_subtype = 'reflection'
where event_family is null;

update public.timeline_entries
set event_subtype = 'reflection'
where event_subtype is null or trim(event_subtype) = '';

-- Promote work-session rows from generic `note` to dedicated `work` type
update public.timeline_entries
set type = 'work'::public.timeline_entry_type
where event_family = 'work' and type = 'note';

alter table public.timeline_entries
  alter column event_family set not null,
  alter column event_subtype set not null;

create index if not exists timeline_entries_project_family_date_idx
  on public.timeline_entries (project_id, event_family, entry_date desc);

comment on column public.timeline_entries.event_family is
  'High-level bucket for timeline UI: work, build, distribution, financial, asset, insight.';
comment on column public.timeline_entries.event_subtype is
  'Fine-grained kind within family (e.g. manual_time_entry, distribution_post).';
comment on column public.timeline_entries.event_metadata is
  'Flexible per-event fields (duration_seconds, metrics snapshot, etc.).';
