create table if not exists public.distribution_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  distribution_entry_id uuid not null references public.distribution_entries (id) on delete cascade,
  source_attachment_id uuid references public.distribution_attachments (id) on delete set null,
  period_label text,
  views integer,
  likes integer,
  comments integer,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists distribution_metric_snapshots_entry_idx
  on public.distribution_metric_snapshots (distribution_entry_id, captured_at desc);

alter table public.distribution_metric_snapshots enable row level security;

create policy "distribution_metric_snapshots_select_via_entry"
  on public.distribution_metric_snapshots for select
  using (
    exists (
      select 1
      from public.distribution_entries d
      join public.projects p on p.id = d.project_id
      where d.id = distribution_metric_snapshots.distribution_entry_id
        and p.user_id = auth.uid()
    )
  );

create policy "distribution_metric_snapshots_insert_via_entry"
  on public.distribution_metric_snapshots for insert
  with check (
    exists (
      select 1
      from public.distribution_entries d
      join public.projects p on p.id = d.project_id
      where d.id = distribution_metric_snapshots.distribution_entry_id
        and p.user_id = auth.uid()
    )
  );
