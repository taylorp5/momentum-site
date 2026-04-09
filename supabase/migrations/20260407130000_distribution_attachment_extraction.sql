alter table public.distribution_attachments
  add column if not exists extraction_status text not null default 'pending',
  add column if not exists extracted_platform text,
  add column if not exists extracted_views integer,
  add column if not exists extracted_likes integer,
  add column if not exists extracted_comments integer,
  add column if not exists extracted_payload jsonb,
  add column if not exists extracted_at timestamptz,
  add column if not exists extraction_error text;

alter table public.distribution_attachments
  drop constraint if exists distribution_attachments_extraction_status_check;

alter table public.distribution_attachments
  add constraint distribution_attachments_extraction_status_check
  check (extraction_status in ('pending', 'completed', 'failed'));
