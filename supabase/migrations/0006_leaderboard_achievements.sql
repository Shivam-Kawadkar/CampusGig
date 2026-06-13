-- ============================================================================
-- CampusGig — 0006 Leaderboard & Achievements module
-- Tables: leaderboard, achievements + triggers + RLS + replication
-- ============================================================================

-- ----------------------------------------------------------------------------
-- leaderboard
-- ----------------------------------------------------------------------------
create table if not exists public.leaderboard (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users (id) on delete cascade,
  total_tasks       integer not null default 0,
  completed_tasks   integer not null default 0,
  average_rating    numeric(3,2) not null default 0,
  total_reviews     integer not null default 0,
  positive_reviews  integer not null default 0,
  on_time_rate      numeric(5,2) not null default 0,
  success_rate      numeric(5,2) not null default 0,
  reliability_score numeric(5,2) not null default 0,
  performance_score numeric(5,2) not null default 0,
  rank              integer,
  category          text, -- null means overall board
  period            text not null default 'all_time' check (period in ('weekly', 'monthly', 'all_time')),
  updated_at        timestamptz not null default now(),
  unique (user_id, period, category)
);

create index if not exists leaderboard_rank_idx on public.leaderboard (period, category, rank);
create index if not exists leaderboard_score_idx on public.leaderboard (period, category, performance_score desc);
create index if not exists leaderboard_user_idx on public.leaderboard (user_id);

-- ----------------------------------------------------------------------------
-- achievements
-- ----------------------------------------------------------------------------
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  badge_name  text not null check (badge_name in ('rising_star', 'top_performer', 'fast_delivery', 'trusted_worker')),
  earned_date timestamptz not null default now(),
  unique (user_id, badge_name)
);

create index if not exists achievements_user_idx on public.achievements (user_id);

-- ----------------------------------------------------------------------------
-- Ranking & Gamification Engine Function
-- Calculates composite performance score and updates rankings + awards badges
-- ----------------------------------------------------------------------------
create or replace function public.refresh_leaderboard_ranks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  w record;
  _total_assigned integer;
  _completed integer;
  _on_time integer;
  _total_reviews integer;
  _positive_reviews integer;
  
  _rating_avg numeric(3,2);
  _success_rate numeric(5,2);
  _on_time_rate numeric(5,2);
  _positive_ratio numeric(5,2);
  _performance_score numeric(5,2);
begin
  -- Loop through all workers (users with student role)
  for w in 
    select id from public.users where role = 'student'
  loop
    -- 1. Fetch metrics
    -- Total assigned tasks (not draft/open/cancelled)
    select count(*) into _total_assigned
    from public.tasks
    where selected_worker_id = w.id
      and status in ('in_progress', 'submitted', 'completed', 'disputed');

    -- Completed tasks
    select count(*) into _completed
    from public.tasks
    where selected_worker_id = w.id
      and status = 'completed';

    -- On time completed tasks (submitted <= deadline)
    select count(*) into _on_time
    from public.tasks t
    join public.submissions s on s.task_id = t.id
    where t.selected_worker_id = w.id
      and t.status = 'completed'
      and s.status = 'approved'
      and s.created_at <= t.deadline;

    -- Total reviews received
    select count(*) into _total_reviews
    from public.reviews
    where reviewee_id = w.id;

    -- Positive reviews (rating >= 4)
    select count(*) into _positive_reviews
    from public.reviews
    where reviewee_id = w.id
      and rating >= 4;

    -- Average rating from user profile
    select coalesce(rating_avg, 0) into _rating_avg
    from public.profiles
    where user_id = w.id;

    -- 2. Calculate rates
    _success_rate := case when _total_assigned > 0 then (_completed::numeric / _total_assigned::numeric) * 100.0 else 0.0 end;
    _on_time_rate := case when _completed > 0 then (_on_time::numeric / _completed::numeric) * 100.0 else 100.0 end;
    _positive_ratio := case when _total_reviews > 0 then (_positive_reviews::numeric / _total_reviews::numeric) * 100.0 else 0.0 end;

    -- Performance score formula:
    -- Rating (30%) + Success Rate (40%) + On-time Rate (15%) + Positive Ratio (15%)
    _performance_score := (_rating_avg * 20.0 * 0.3)
                        + (_success_rate * 0.4)
                        + (_on_time_rate * 0.15)
                        + (_positive_ratio * 0.15);

    -- Ensure within 0-100 limits
    _performance_score := greatest(0.0, least(100.0, _performance_score));

    -- 3. Upsert overall all_time leaderboard snapshot
    insert into public.leaderboard (
      user_id,
      total_tasks,
      completed_tasks,
      average_rating,
      total_reviews,
      positive_reviews,
      on_time_rate,
      success_rate,
      performance_score,
      period,
      category
    )
    values (
      w.id,
      _total_assigned,
      _completed,
      _rating_avg,
      _total_reviews,
      _positive_reviews,
      _on_time_rate,
      _success_rate,
      _performance_score,
      'all_time',
      null
    )
    on conflict (user_id, period, category)
    do update set
      total_tasks = excluded.total_tasks,
      completed_tasks = excluded.completed_tasks,
      average_rating = excluded.average_rating,
      total_reviews = excluded.total_reviews,
      positive_reviews = excluded.positive_reviews,
      on_time_rate = excluded.on_time_rate,
      success_rate = excluded.success_rate,
      performance_score = excluded.performance_score,
      updated_at = now();

    -- 4. Evaluate and grant achievements/badges
    -- Rising Star: Completed first gig with a 5-star rating
    if (_completed = 1) then
      if exists (
        select 1 from public.reviews
        where reviewee_id = w.id and rating = 5
      ) then
        insert into public.achievements (user_id, badge_name)
        values (w.id, 'rising_star')
        on conflict (user_id, badge_name) do nothing;
      end if;
    end if;

    -- Top Performer: Performance score >= 95 and completed >= 3 gigs
    if (_performance_score >= 95.0 and _completed >= 3) then
      insert into public.achievements (user_id, badge_name)
      values (w.id, 'top_performer')
      on conflict (user_id, badge_name) do nothing;
    end if;

    -- Fast Delivery: Completed at least 1 gig before deadline
    if (_on_time > 0) then
      insert into public.achievements (user_id, badge_name)
      values (w.id, 'fast_delivery')
      on conflict (user_id, badge_name) do nothing;
    end if;

    -- Trusted Worker: Completed >= 5 gigs with average rating >= 4.5
    if (_completed >= 5 and _rating_avg >= 4.50) then
      insert into public.achievements (user_id, badge_name)
      values (w.id, 'trusted_worker')
      on conflict (user_id, badge_name) do nothing;
    end if;

  end loop;

  -- 5. Calculate and update ranks for all_time overall
  for r in 
    select id, rank() over (order by performance_score desc, completed_tasks desc) as calculated_rank
    from public.leaderboard
    where period = 'all_time' and category is null
  loop
    update public.leaderboard
    set rank = r.calculated_rank
    where id = r.id;
  end loop;

end;
$$;

-- ----------------------------------------------------------------------------
-- Hook engine refresh to task and review updates
-- ----------------------------------------------------------------------------
create or replace function public.trigger_refresh_leaderboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_leaderboard_ranks();
  return null;
end;
$$;

-- Trigger on tasks status updates
drop trigger if exists on_task_completion_leaderboard on public.tasks;
create trigger on_task_completion_leaderboard
  after update of status on public.tasks
  for each row execute function public.trigger_refresh_leaderboard();

-- Trigger on review submissions
drop trigger if exists on_review_changes_leaderboard on public.reviews;
create trigger on_review_changes_leaderboard
  after insert or delete or update on public.reviews
  for each row execute function public.trigger_refresh_leaderboard();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
alter table public.leaderboard enable row level security;
alter table public.achievements enable row level security;

-- leaderboard: read by any authenticated user
drop policy if exists leaderboard_select on public.leaderboard;
create policy leaderboard_select on public.leaderboard
  for select using (
    auth.role() = 'authenticated'
  );

-- achievements: read by any authenticated user
drop policy if exists achievements_select on public.achievements;
create policy achievements_select on public.achievements
  for select using (
    auth.role() = 'authenticated'
  );
