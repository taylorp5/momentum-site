-- Cost event recurrence metadata for read-only Costs ledger views.

alter table public.timeline_entries
  add column if not exists is_recurring boolean,
  add column if not exists recurrence_label text;

comment on column public.timeline_entries.is_recurring is
  'Used for cost events to indicate recurring charges.';

comment on column public.timeline_entries.recurrence_label is
  'Optional recurrence cadence for recurring cost events (e.g. monthly, yearly).';
