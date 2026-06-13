-- ============================================================================
-- CampusGig — 0007 Disputes & Governance module
-- Tables: disputes, dispute_evidence + helpers + RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- disputes
-- ----------------------------------------------------------------------------
create table if not exists public.disputes (
  id                  uuid primary key default gen_random_uuid(),
  task_id             uuid not null references public.tasks (id) on delete cascade,
  disputer_id         uuid not null references public.users (id) on delete cascade,
  reason              text not null check (reason in (
                        'non_delivery', 'poor_quality', 'scope_creep',
                        'payment_issue', 'communication', 'other'
                      )),
  explanation         text not null,
  status              text not null default 'opened' check (status in ('opened', 'resolved')),
  resolution_decision text check (resolution_decision in (
                        'payout_worker', 'refund_poster', 'split', 'cancelled'
                      )),
  resolution_details  text,
  resolved_by         uuid references public.users (id),
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

create index if not exists disputes_task_idx     on public.disputes (task_id);
create index if not exists disputes_status_idx   on public.disputes (status);
create index if not exists disputes_disputer_idx on public.disputes (disputer_id);

-- ----------------------------------------------------------------------------
-- dispute_evidence
-- ----------------------------------------------------------------------------
create table if not exists public.dispute_evidence (
  id           uuid primary key default gen_random_uuid(),
  dispute_id   uuid not null references public.disputes (id) on delete cascade,
  submitter_id uuid not null references public.users (id) on delete cascade,
  comment      text not null,
  attachments  text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists evidence_dispute_idx on public.dispute_evidence (dispute_id);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.disputes        enable row level security;
alter table public.dispute_evidence enable row level security;

-- disputes: visible to task poster, task worker, or admin
drop policy if exists disputes_select on public.disputes;
create policy disputes_select on public.disputes
  for select using (
    public.is_admin()
    or disputer_id = auth.uid()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.poster_id = auth.uid() or t.selected_worker_id = auth.uid())
    )
  );

-- disputes: insert allowed for authenticated users who are party to the task
drop policy if exists disputes_insert on public.disputes;
create policy disputes_insert on public.disputes
  for insert with check (
    disputer_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.poster_id = auth.uid() or t.selected_worker_id = auth.uid())
        and t.status in ('in_progress', 'submitted', 'disputed')
    )
  );

-- disputes: update for admins only (resolution)
drop policy if exists disputes_update on public.disputes;
create policy disputes_update on public.disputes
  for update using (public.is_admin());

-- dispute_evidence: visible to task parties or admin
drop policy if exists evidence_select on public.dispute_evidence;
create policy evidence_select on public.dispute_evidence
  for select using (
    public.is_admin()
    or submitter_id = auth.uid()
    or exists (
      select 1 from public.disputes d
      join public.tasks t on t.id = d.task_id
      where d.id = dispute_id
        and (t.poster_id = auth.uid() or t.selected_worker_id = auth.uid() or d.disputer_id = auth.uid())
    )
  );

-- dispute_evidence: any authenticated party to the dispute can submit evidence
drop policy if exists evidence_insert on public.dispute_evidence;
create policy evidence_insert on public.dispute_evidence
  for insert with check (
    submitter_id = auth.uid()
    and exists (
      select 1 from public.disputes d
      join public.tasks t on t.id = d.task_id
      where d.id = dispute_id
        and d.status = 'opened'
        and (t.poster_id = auth.uid() or t.selected_worker_id = auth.uid() or public.is_admin())
    )
  );
