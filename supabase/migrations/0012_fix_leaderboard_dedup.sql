-- ============================================================================
-- CampusGig — 0012 Fix leaderboard duplicates & rating accuracy
-- Problem: NULL category breaks ON CONFLICT (NULL != NULL in SQL), creating
--          duplicate rows per user. Also, rating was read from cached profile
--          instead of computed live from reviews.
-- ============================================================================

-- 1. Clean up existing duplicate leaderboard rows.
--    Keep only the row with the highest performance_score per (user_id, period).
delete from public.leaderboard
where id not in (
  select distinct on (user_id, period, coalesce(category, '__null__'))
    id
  from public.leaderboard
  order by user_id, period, coalesce(category, '__null__'), performance_score desc
);

-- 2. Drop old unique constraint and replace with one that handles NULL category.
alter table public.leaderboard drop constraint if exists leaderboard_user_id_period_category_key;

-- Create a unique index using COALESCE so NULL category is treated as '__overall__'
drop index if exists leaderboard_user_period_category_uniq;
create unique index leaderboard_user_period_category_uniq
  on public.leaderboard (user_id, period, coalesce(category, '__overall__'));

-- 3. Replace the refresh function with a fixed version that:
--    a) Uses COALESCE-based upsert to avoid NULL duplicates
--    b) Calculates rating directly from reviews table (not stale profile cache)
--    c) Only includes users who have at least 1 completed task
--    d) Removes leaderboard rows for users with 0 completed tasks
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
  _existing_id uuid;
begin
  -- Loop through all users (students)
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

    -- Skip users with 0 completed tasks — remove their row if it exists
    if _completed = 0 then
      delete from public.leaderboard
        where user_id = w.id and period = 'all_time' and category is null;
      continue;
    end if;

    -- On-time completed tasks (submitted <= deadline)
    select count(*) into _on_time
    from public.tasks t
    join public.submissions s on s.task_id = t.id
    where t.selected_worker_id = w.id
      and t.status = 'completed'
      and s.status = 'approved'
      and s.created_at <= t.deadline;

    -- Calculate rating directly from reviews (not from cached profile)
    select 
      coalesce(avg(rating), 0)::numeric(3,2),
      count(*)::integer
    into _rating_avg, _total_reviews
    from public.reviews
    where reviewee_id = w.id;

    -- Positive reviews (rating >= 4)
    select count(*) into _positive_reviews
    from public.reviews
    where reviewee_id = w.id
      and rating >= 4;

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

    -- 3. Upsert: check if row already exists for this user
    select id into _existing_id
    from public.leaderboard
    where user_id = w.id and period = 'all_time' and category is null
    limit 1;

    if _existing_id is not null then
      -- UPDATE existing row
      update public.leaderboard set
        total_tasks = _total_assigned,
        completed_tasks = _completed,
        average_rating = _rating_avg,
        total_reviews = _total_reviews,
        positive_reviews = _positive_reviews,
        on_time_rate = _on_time_rate,
        success_rate = _success_rate,
        performance_score = _performance_score,
        updated_at = now()
      where id = _existing_id;
    else
      -- INSERT new row
      insert into public.leaderboard (
        user_id, total_tasks, completed_tasks, average_rating,
        total_reviews, positive_reviews, on_time_rate, success_rate,
        performance_score, period, category
      ) values (
        w.id, _total_assigned, _completed, _rating_avg,
        _total_reviews, _positive_reviews, _on_time_rate, _success_rate,
        _performance_score, 'all_time', null
      );
    end if;

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
  --    Only ranked entries remain (users with 0 completed were removed above)
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

-- 4. Re-run the refresh to clean up data immediately
select public.refresh_leaderboard_ranks();
