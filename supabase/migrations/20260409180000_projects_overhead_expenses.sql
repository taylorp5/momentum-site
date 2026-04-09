-- Synthetic "General / overhead" project per user for expenses not tied to a product bet.

alter table public.projects
  add column if not exists is_overhead boolean not null default false;

create unique index if not exists projects_one_overhead_per_user
  on public.projects (user_id)
  where is_overhead = true;

comment on column public.projects.is_overhead is
  'True for the auto-created General / overhead bucket (non-project expenses).';
