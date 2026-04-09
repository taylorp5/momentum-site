-- Financial timeline events: cost, revenue, and deal.

ALTER TYPE public.timeline_entry_type ADD VALUE IF NOT EXISTS 'cost';
ALTER TYPE public.timeline_entry_type ADD VALUE IF NOT EXISTS 'revenue';
ALTER TYPE public.timeline_entry_type ADD VALUE IF NOT EXISTS 'deal';

alter table public.timeline_entries
  add column if not exists amount numeric(12, 2),
  add column if not exists category text,
  add column if not exists revenue_source text,
  add column if not exists partner_name text,
  add column if not exists revenue_share_percentage numeric(5, 2);

alter table public.timeline_entries
  drop constraint if exists timeline_entries_revenue_share_percentage_check;

alter table public.timeline_entries
  add constraint timeline_entries_revenue_share_percentage_check
  check (
    revenue_share_percentage is null
    or (revenue_share_percentage >= 0 and revenue_share_percentage <= 100)
  );

create index if not exists timeline_entries_type_entry_date_idx
  on public.timeline_entries (type, entry_date desc);
