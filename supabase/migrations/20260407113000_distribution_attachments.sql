-- Distribution performance screenshots: storage + metadata table

create table if not exists public.distribution_attachments (
  id uuid primary key default gen_random_uuid(),
  distribution_entry_id uuid not null references public.distribution_entries (id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists distribution_attachments_entry_idx
  on public.distribution_attachments (distribution_entry_id, created_at desc);

alter table public.distribution_attachments enable row level security;

create policy "distribution_attachments_select_via_entry"
  on public.distribution_attachments for select
  using (
    exists (
      select 1
      from public.distribution_entries d
      join public.projects p on p.id = d.project_id
      where d.id = distribution_attachments.distribution_entry_id
        and p.user_id = auth.uid()
    )
  );

create policy "distribution_attachments_insert_via_entry"
  on public.distribution_attachments for insert
  with check (
    exists (
      select 1
      from public.distribution_entries d
      join public.projects p on p.id = d.project_id
      where d.id = distribution_attachments.distribution_entry_id
        and p.user_id = auth.uid()
    )
  );

create policy "distribution_attachments_delete_via_entry"
  on public.distribution_attachments for delete
  using (
    exists (
      select 1
      from public.distribution_entries d
      join public.projects p on p.id = d.project_id
      where d.id = distribution_attachments.distribution_entry_id
        and p.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('distribution-attachments', 'distribution-attachments', false)
on conflict (id) do nothing;

create policy "Distribution attachments read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'distribution-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Distribution attachments upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'distribution-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Distribution attachments delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'distribution-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
