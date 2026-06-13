-- ============================================================================
-- CampusGig — 0005 Gig Delivery & Reviews module
-- Tables: submissions, reviews + RLS + indexes + triggers + replication
-- ============================================================================

-- ----------------------------------------------------------------------------
-- submissions (Work Deliverables)
-- ----------------------------------------------------------------------------
create table if not exists public.submissions (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  worker_id  uuid not null references public.users (id) on delete cascade,
  content    text,
  status     text not null default 'submitted' check (status in ('submitted', 'approved', 'revision_requested')),
  feedback   text,
  created_at timestamptz not null default now()
);

create index if not exists submissions_task_idx on public.submissions (task_id);

-- ----------------------------------------------------------------------------
-- reviews (Reputation & Ratings)
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks (id) on delete cascade,
  reviewer_id  uuid not null references public.users (id) on delete cascade,
  reviewee_id  uuid not null references public.users (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  comment      text,
  role_context text not null check (role_context in ('poster_to_worker', 'worker_to_poster')),
  created_at   timestamptz not null default now(),
  unique (task_id, reviewer_id, reviewee_id)
);

create index if not exists reviews_task_idx on public.reviews (task_id);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);

-- ----------------------------------------------------------------------------
-- Trigger: Auto-recalculate Profile average rating and review counts
-- ----------------------------------------------------------------------------
create or replace function public.handle_review_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _rating_avg numeric(3,2);
  _rating_count integer;
  _target_user_id uuid;
begin
  _target_user_id := coalesce(new.reviewee_id, old.reviewee_id);

  -- Calculate average rating and count of reviews for the target user
  select 
    coalesce(avg(rating), 0)::numeric(3,2),
    count(*)::integer
  into _rating_avg, _rating_count
  from public.reviews
  where reviewee_id = _target_user_id;

  -- Update target user's profile
  update public.profiles
  set 
    rating_avg = _rating_avg,
    rating_count = _rating_count
  where user_id = _target_user_id;

  return null;
end;
$$;

drop trigger if exists on_review_changes on public.reviews;
create trigger on_review_changes
  after insert or delete or update of rating on public.reviews
  for each row execute function public.handle_review_changes();

-- ----------------------------------------------------------------------------
-- Trigger: Auto-increment completed_gigs on profiles on task completion
-- ----------------------------------------------------------------------------
create or replace function public.handle_task_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.status <> 'completed' and new.status = 'completed' and new.selected_worker_id is not null) then
    update public.profiles
    set completed_gigs = completed_gigs + 1
    where user_id = new.selected_worker_id;
  elsif (old.status = 'completed' and new.status <> 'completed' and old.selected_worker_id is not null) then
    update public.profiles
    set completed_gigs = greatest(0, completed_gigs - 1)
    where user_id = old.selected_worker_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_task_completion on public.tasks;
create trigger on_task_completion
  after update of status on public.tasks
  for each row execute function public.handle_task_completion();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
alter table public.submissions enable row level security;
alter table public.reviews enable row level security;

-- submissions: read by participants or admin
drop policy if exists submissions_select on public.submissions;
create policy submissions_select on public.submissions
  for select using (
    worker_id = auth.uid()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id and t.poster_id = auth.uid()
    )
    or public.is_admin()
  );

-- submissions: insert only by assigned worker in active status
drop policy if exists submissions_insert on public.submissions;
create policy submissions_insert on public.submissions
  for insert with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.selected_worker_id = auth.uid() and t.status in ('in_progress', 'submitted', 'disputed')
    )
  );

-- submissions: update only by assigned worker
drop policy if exists submissions_update on public.submissions;
create policy submissions_update on public.submissions
  for update using (
    worker_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.selected_worker_id = auth.uid() and t.status in ('in_progress', 'submitted', 'disputed')
    )
  ) with check (
    worker_id = auth.uid()
  );

-- reviews: read by any authenticated user (public reviews)
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select using (
    auth.role() = 'authenticated'
  );

-- reviews: insert only by actual poster/worker on completed tasks
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
      and t.status = 'completed'
      and (
        (t.poster_id = auth.uid() and t.selected_worker_id = reviewee_id and role_context = 'poster_to_worker')
        or (t.selected_worker_id = auth.uid() and t.poster_id = reviewee_id and role_context = 'worker_to_poster')
      )
    )
  );

-- reviews: update only by author
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews
  for update using (
    reviewer_id = auth.uid()
  ) with check (
    reviewer_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- Supabase Realtime Replication Config
-- ----------------------------------------------------------------------------
begin;
  alter publication supabase_realtime add table public.submissions;
commit;
