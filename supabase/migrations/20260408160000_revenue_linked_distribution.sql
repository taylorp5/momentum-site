-- Optional link from revenue timeline rows to a distribution post (for ROI / attribution).

alter table public.timeline_entries
  add column if not exists linked_distribution_entry_id uuid
    references public.timeline_entries (id) on delete set null;

create index if not exists timeline_entries_linked_distribution_idx
  on public.timeline_entries (linked_distribution_entry_id)
  where linked_distribution_entry_id is not null;

comment on column public.timeline_entries.linked_distribution_entry_id is
  'When type=revenue, optional FK to a distribution timeline row in the same workspace (same project).';
