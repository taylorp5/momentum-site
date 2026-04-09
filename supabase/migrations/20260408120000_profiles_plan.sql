-- Subscription plan for feature gating (free default; pro unlocks AI + advanced analytics).

alter table public.profiles
  add column if not exists plan text not null default 'free';

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'pro'));

comment on column public.profiles.plan is 'free | pro — used for feature gating; upgrade via billing when connected.';
