-- Adds project logo support used by app queries/components.
-- Safe to run even if parts were already applied.

alter table public.projects
add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Project logos upload own'
  ) then
    create policy "Project logos upload own"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'project-logos'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Project logos update own'
  ) then
    create policy "Project logos update own"
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
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Project logos delete own'
  ) then
    create policy "Project logos delete own"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'project-logos'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end
$$;
