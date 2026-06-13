-- ============================================================================
-- CampusGig — 0004 Chat & Notifications module
-- Tables: chats, messages, notifications + RLS + indexes + replication
-- ============================================================================

-- ----------------------------------------------------------------------------
-- chats (links poster and worker for a task)
-- ----------------------------------------------------------------------------
create table if not exists public.chats (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null unique references public.tasks (id) on delete cascade,
  poster_id  uuid not null references public.users (id) on delete cascade,
  worker_id  uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists chats_task_idx on public.chats (task_id);
create index if not exists chats_participants_idx on public.chats (poster_id, worker_id);

-- ----------------------------------------------------------------------------
-- messages (chat dialogue)
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats (id) on delete cascade,
  sender_id  uuid not null references public.users (id) on delete cascade,
  content    text not null check (length(trim(content)) > 0),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at asc);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  payload    jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on public.notifications (user_id, is_read, created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ----------------------------------------------------------------------------
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- chats: Read only by participants or admin; Insert/Update system or poster
drop policy if exists chats_select on public.chats;
create policy chats_select on public.chats
  for select using (
    auth.uid() = poster_id
    or auth.uid() = worker_id
    or public.is_admin()
  );

drop policy if exists chats_insert on public.chats;
create policy chats_insert on public.chats
  for insert with check (
    auth.uid() = poster_id
    or public.is_admin()
  );

-- messages: Read and Insert only by chat participants
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id
      and (c.poster_id = auth.uid() or c.worker_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
      and (c.poster_id = auth.uid() or c.worker_id = auth.uid())
    )
  );

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id
      and (c.poster_id = auth.uid() or c.worker_id = auth.uid())
    )
  );

-- notifications: Recipient read/update/insert
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (
    user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid()
  );

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (
    auth.uid() is not null
  );

-- ----------------------------------------------------------------------------
-- Supabase Realtime Replication Config
-- ----------------------------------------------------------------------------
-- Recreate publication link if needed or alter existing
begin;
  -- Add tables to replication
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.notifications;
commit;
