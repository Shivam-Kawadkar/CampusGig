-- ============================================================================
-- CampusGig — 0001 Core schema (auth foundation)
-- Tables: users, profiles, wallets  + RLS + signup trigger
-- Money is ALWAYS integer paise (BIGINT). See SPEC.md §4.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('student', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'suspended', 'banned');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- users  (mirrors auth.users; identity + status)
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text unique not null,
  phone         text unique,
  phone_verified boolean not null default false,
  role          user_role not null default 'student',
  status        user_status not null default 'active',
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- profiles  (public-facing student details; 1:1 with users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid unique not null references public.users (id) on delete cascade,
  full_name            text not null default '',
  avatar_url           text,
  bio                  text,
  college              text,
  course               text,
  year_of_study        smallint check (year_of_study between 1 and 6),
  is_verified_student  boolean not null default false,
  onboarding_completed boolean not null default false,
  rating_avg           numeric(3,2) not null default 0,
  rating_count         integer not null default 0,
  completed_gigs       integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists profiles_college_idx on public.profiles (college);

-- ----------------------------------------------------------------------------
-- wallets  (one per user; balances in integer paise)
-- ----------------------------------------------------------------------------
create table if not exists public.wallets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid unique not null references public.users (id) on delete cascade,
  balance        bigint not null default 0 check (balance >= 0),
  locked_balance bigint not null default 0 check (locked_balance >= 0),
  updated_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Helper: is the current user an admin?
-- SECURITY DEFINER avoids RLS recursion when checking the users table.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Trigger: on new auth user → create users + profiles + wallets rows
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;

  insert into public.profiles (user_id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;

  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- updated_at touch trigger
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.users    enable row level security;
alter table public.profiles enable row level security;
alter table public.wallets  enable row level security;

-- users: read own row or admin; update own non-privileged fields.
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- profiles: anyone authenticated can read (public profiles); only owner writes.
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (user_id = auth.uid());

-- wallets: strictly owner-only (or admin). No client writes (server/service-role only).
drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own on public.wallets
  for select using (user_id = auth.uid() or public.is_admin());

-- NOTE: wallet mutations happen only via service-role (payments engine),
-- so no INSERT/UPDATE policy is granted to authenticated users by design.
