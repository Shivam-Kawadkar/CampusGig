-- 0011_feedback.sql — Landing-page feedback submissions.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (user_id) on delete set null,
  name        text not null,
  email       text,
  rating      smallint not null check (rating between 1 and 5),
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_created_at_idx
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Anyone (incl. anonymous landing visitors) may submit feedback.
create policy feedback_insert on public.feedback
  for insert with check (true);

-- Only admins may read submissions.
create policy feedback_select on public.feedback
  for select using (public.is_admin());
