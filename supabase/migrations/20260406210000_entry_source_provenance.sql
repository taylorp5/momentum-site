-- Provenance for timeline and distribution rows (manual UI vs future AI capture).
-- Add enum values later: ALTER TYPE public.entry_source_type ADD VALUE 'import';

do $$ begin
  create type public.entry_source_type as enum ('manual', 'ai_capture');
exception
  when duplicate_object then null;
end $$;

alter table public.timeline_entries
  add column if not exists source_type public.entry_source_type not null default 'manual';

alter table public.timeline_entries
  add column if not exists source_metadata jsonb;

comment on column public.timeline_entries.source_type is
  'manual: user-created; ai_capture: ingested from screenshot/vision pipeline';

comment on column public.timeline_entries.source_metadata is
  'Optional pipeline context (job id, model id, capture storage path, parse version).';

alter table public.distribution_entries
  add column if not exists source_type public.entry_source_type not null default 'manual';

alter table public.distribution_entries
  add column if not exists source_metadata jsonb;

comment on column public.distribution_entries.source_type is
  'manual: user-created; ai_capture: ingested from screenshot/vision pipeline';

comment on column public.distribution_entries.source_metadata is
  'Optional pipeline context (job id, model id, suggested platform confidence).';

create index if not exists timeline_entries_source_type_idx
  on public.timeline_entries (source_type);

create index if not exists distribution_entries_source_type_idx
  on public.distribution_entries (source_type);
