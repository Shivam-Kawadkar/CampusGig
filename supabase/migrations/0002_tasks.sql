-- ============================================================================
-- CampusGig — 0002 Tasks module
-- Tables: categories, files, tasks, task_attachments  + RLS + indexes + seed
-- Money is ALWAYS integer paise (BIGINT). See SPEC.md §4.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type task_status as enum
    ('draft', 'open', 'in_progress', 'submitted', 'completed', 'disputed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_type as enum ('fixed', 'open_bid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type file_context as enum ('task_attachment', 'submission', 'message', 'avatar');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  slug        text unique not null,
  description text,
  icon        text
);

-- ----------------------------------------------------------------------------
-- files  (metadata for Supabase Storage objects)
-- ----------------------------------------------------------------------------
create table if not exists public.files (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.users (id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  file_type    text not null,
  size_bytes   bigint not null,
  context      file_context not null,
  created_at   timestamptz not null default now()
);

create index if not exists files_owner_idx on public.files (owner_id);

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  poster_id     uuid not null references public.users (id) on delete cascade,
  title         text not null,
  description   text not null,
  category_id   uuid not null references public.categories (id),
  budget        bigint not null check (budget > 0),         -- integer paise
  deadline      timestamptz not null,
  task_type     task_type not null default 'open_bid',
  status        task_status not null default 'open',
  skills        text[] not null default '{}',
  college_scope text,
  escrow_amount bigint not null default 0,
  proposal_count integer not null default 0,
  selected_worker_id uuid references public.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tasks_status_idx        on public.tasks (status);
create index if not exists tasks_category_idx       on public.tasks (category_id);
create index if not exists tasks_poster_idx         on public.tasks (poster_id);
create index if not exists tasks_deadline_idx       on public.tasks (deadline);
create index if not exists tasks_college_scope_idx  on public.tasks (college_scope);
create index if not exists tasks_created_idx        on public.tasks (created_at desc);

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- task_attachments  (join tasks ↔ files)
-- ----------------------------------------------------------------------------
create table if not exists public.task_attachments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  file_id    uuid not null references public.files (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, file_id)
);

create index if not exists task_attachments_task_idx on public.task_attachments (task_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.categories       enable row level security;
alter table public.files            enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_attachments enable row level security;

-- categories: world-readable (reference data); writes admin-only.
drop policy if exists categories_select_all on public.categories;
create policy categories_select_all on public.categories
  for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- files: owner-only read/write (signed URLs handle participant access separately).
drop policy if exists files_select_own on public.files;
create policy files_select_own on public.files
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists files_insert_own on public.files;
create policy files_insert_own on public.files
  for insert with check (owner_id = auth.uid());

drop policy if exists files_delete_own on public.files;
create policy files_delete_own on public.files
  for delete using (owner_id = auth.uid());

-- tasks:
--  • Any authenticated user can read OPEN tasks (the marketplace) or their own tasks.
--  • Only the poster can create/update/delete their own tasks.
drop policy if exists tasks_select_open_or_own on public.tasks;
create policy tasks_select_open_or_own on public.tasks
  for select using (
    status <> 'draft'
    or poster_id = auth.uid()
    or selected_worker_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks
  for insert with check (poster_id = auth.uid());

drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks
  for update using (poster_id = auth.uid()) with check (poster_id = auth.uid());

drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own on public.tasks
  for delete using (poster_id = auth.uid() and status in ('draft', 'open'));

-- task_attachments: readable if you can read the parent task; writable by the poster.
drop policy if exists task_attachments_select on public.task_attachments;
create policy task_attachments_select on public.task_attachments
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id)
  );

drop policy if exists task_attachments_insert on public.task_attachments;
create policy task_attachments_insert on public.task_attachments
  for insert with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.poster_id = auth.uid()
    )
  );

-- ============================================================================
-- Seed categories
-- ============================================================================
insert into public.categories (name, slug, description, icon) values
  ('Design',       'design',       'Logos, posters, UI, branding',          'palette'),
  ('Coding',       'coding',       'Web, apps, bug fixes, scripts',         'code'),
  ('Writing',      'writing',      'Essays, content, editing, research',    'pen-line'),
  ('Tutoring',     'tutoring',     'Subject help, exam prep, doubts',       'graduation-cap'),
  ('Photography',  'photography',  'Events, portraits, product shots',      'camera'),
  ('Marketing',    'marketing',    'Social media, promotion, campaigns',    'megaphone'),
  ('Data Entry',   'data-entry',   'Spreadsheets, formatting, research',    'file-spreadsheet'),
  ('Translation',  'translation',  'Language translation & transcription',  'languages')
on conflict (slug) do nothing;
