alter table public.projects
add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true)
on conflict (id) do nothing;

create policy if not exists "Project logos upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Project logos update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy if not exists "Project logos delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
