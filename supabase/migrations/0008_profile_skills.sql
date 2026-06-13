-- ============================================================================
-- CampusGig — 0008 Profile Skills
-- Adds skills[] column to profiles table
-- ============================================================================

alter table public.profiles
  add column if not exists skills text[] not null default '{}';

create index if not exists profiles_skills_idx on public.profiles using gin (skills);
