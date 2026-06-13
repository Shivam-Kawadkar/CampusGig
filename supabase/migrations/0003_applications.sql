-- ============================================================================
-- CampusGig — 0003 Applications (Proposals/Bids) module
-- Tables: applications + RLS + indexes + triggers
-- Money is ALWAYS integer paise (BIGINT). See SPEC.md §4.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- applications (Proposals/Bids)
-- ----------------------------------------------------------------------------
create table if not exists public.applications (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references public.tasks (id) on delete cascade,
  worker_id          uuid not null references public.users (id) on delete cascade,
  bid_amount         bigint not null check (bid_amount > 0), -- integer paise
  message            text,
  estimated_delivery timestamptz,
  status             text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at         timestamptz not null default now(),
  unique (task_id, worker_id)
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists applications_task_idx on public.applications (task_id);
create index if not exists applications_worker_idx on public.applications (worker_id);
create index if not exists applications_status_idx on public.applications (status);

-- ----------------------------------------------------------------------------
-- Trigger: Auto-manage proposal_count on tasks
-- ----------------------------------------------------------------------------
create or replace function public.handle_application_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.tasks
    set proposal_count = proposal_count + 1
    where id = new.task_id;
  elsif (TG_OP = 'DELETE') then
    update public.tasks
    set proposal_count = greatest(0, proposal_count - 1)
    where id = old.task_id;
  elsif (TG_OP = 'UPDATE') then
    if (old.status <> 'withdrawn' and new.status = 'withdrawn') then
      update public.tasks
      set proposal_count = greatest(0, proposal_count - 1)
      where id = new.task_id;
    elsif (old.status = 'withdrawn' and new.status <> 'withdrawn') then
      update public.tasks
      set proposal_count = proposal_count + 1
      where id = new.task_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists on_application_changes on public.applications;
create trigger on_application_changes
  after insert or delete or update of status on public.applications
  for each row execute function public.handle_application_changes();

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ----------------------------------------------------------------------------
alter table public.applications enable row level security;

-- Select:
-- 1. The worker who submitted the proposal.
-- 2. The poster of the parent task.
-- 3. Admins.
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select using (
    worker_id = auth.uid()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id and t.poster_id = auth.uid()
    )
    or public.is_admin()
  );

-- Insert:
-- 1. Authenticated user must be the worker (worker_id = auth.uid()).
-- 2. Worker cannot bid on their own task.
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.poster_id <> auth.uid()
    )
  );

-- Update:
-- 1. Worker can update their own pending application (e.g. withdraw/edit).
-- 2. Task poster can update applications on their own tasks (e.g. accept/reject).
drop policy if exists applications_update_own on public.applications;
create policy applications_update_own on public.applications
  for update using (
    worker_id = auth.uid() and status = 'pending'
  ) with check (
    worker_id = auth.uid() and status in ('pending', 'withdrawn')
  );

drop policy if exists applications_update_poster on public.applications;
create policy applications_update_poster on public.applications
  for update using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.poster_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.poster_id = auth.uid()
    )
  );
