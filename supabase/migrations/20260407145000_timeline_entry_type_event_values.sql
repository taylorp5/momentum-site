-- Add new timeline entry enum values in their own migration.
-- Postgres requires committing enum additions before using them.

ALTER TYPE public.timeline_entry_type ADD VALUE IF NOT EXISTS 'distribution';
ALTER TYPE public.timeline_entry_type ADD VALUE IF NOT EXISTS 'build';
ALTER TYPE public.timeline_entry_type ADD VALUE IF NOT EXISTS 'insight';
ALTER TYPE public.timeline_entry_type ADD VALUE IF NOT EXISTS 'experiment';
