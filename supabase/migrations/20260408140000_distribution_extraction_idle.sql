alter table public.distribution_attachments
  drop constraint if exists distribution_attachments_extraction_status_check;

alter table public.distribution_attachments
  add constraint distribution_attachments_extraction_status_check
  check (extraction_status in ('pending', 'completed', 'failed', 'idle'));
