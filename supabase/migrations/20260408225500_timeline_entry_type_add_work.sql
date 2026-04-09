-- PostgreSQL does not allow using a new enum label in the same transaction as ADD VALUE (55P04).
-- This migration must run and commit before 20260408230000_timeline_event_family_metadata.sql.

alter type public.timeline_entry_type add value if not exists 'work';
