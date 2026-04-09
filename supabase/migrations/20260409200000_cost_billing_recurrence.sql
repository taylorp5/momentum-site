-- Cost billing: one-time vs monthly/yearly rules with optional end date and active flag.

alter table public.timeline_entries
  add column if not exists billing_type text not null default 'one_time';

alter table public.timeline_entries
  drop constraint if exists timeline_entries_billing_type_check;

alter table public.timeline_entries
  add constraint timeline_entries_billing_type_check
  check (billing_type in ('one_time', 'monthly', 'yearly'));

alter table public.timeline_entries
  add column if not exists recurring_start_date date;

alter table public.timeline_entries
  add column if not exists recurring_end_date date;

alter table public.timeline_entries
  add column if not exists recurring_active boolean not null default true;

comment on column public.timeline_entries.billing_type is
  'Cost only: one_time, monthly, or yearly subscription-style expense.';

comment on column public.timeline_entries.recurring_start_date is
  'Cost only: first billing date for monthly/yearly rules.';

comment on column public.timeline_entries.recurring_end_date is
  'Cost only: optional last day the subscription is active (inclusive).';

comment on column public.timeline_entries.recurring_active is
  'Cost only: when false, recurring rule is ignored in period totals.';

-- Legacy recurring costs → monthly with start = entry date
update public.timeline_entries
set
  billing_type = 'monthly',
  recurring_start_date = coalesce(recurring_start_date, entry_date::date),
  recurring_active = true
where type = 'cost'
  and coalesce(is_recurring, false) = true
  and billing_type = 'one_time';
