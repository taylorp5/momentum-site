-- Per-user dashboard layout: hidden widgets and insight cards (JSON).

alter table public.profiles
  add column if not exists dashboard_preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.dashboard_preferences is
  'Client shape: { hidden_widgets?: string[], hidden_insights?: string[] }. Empty = defaults.';
