-- ============================================================================
-- CampusGig — 0009 Payments & Escrow engine
-- Tables: payments, transactions + atomic RPC helpers (simulated + Razorpay-ready)
-- Money is ALWAYS integer paise (BIGINT). See SPEC.md §4.15–4.16.
-- ============================================================================

-- Platform commission: 5% (500 basis points), deducted from worker payout on release.
-- Must stay in sync with lib/payments/constants.ts
create or replace function public.platform_commission(p_amount bigint)
returns bigint
language sql
immutable
as $$
  select floor(p_amount * 500 / 10000);
$$;

-- ----------------------------------------------------------------------------
-- payments
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  task_id             uuid not null references public.tasks (id) on delete cascade,
  application_id      uuid references public.applications (id) on delete set null,
  payer_id            uuid not null references public.users (id) on delete cascade,
  razorpay_order_id   text unique not null,
  razorpay_payment_id text unique,
  amount              bigint not null check (amount > 0),
  commission          bigint not null default 0 check (commission >= 0),
  status              text not null default 'created'
                        check (status in ('created', 'captured', 'failed', 'refunded')),
  escrow_status       text not null default 'pending'
                        check (escrow_status in ('pending', 'held', 'released', 'refunded', 'partial')),
  provider            text not null default 'simulated',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists payments_task_idx on public.payments (task_id);
create index if not exists payments_payer_idx on public.payments (payer_id);
create index if not exists payments_escrow_status_idx on public.payments (escrow_status);

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- transactions (append-only ledger)
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  task_id          uuid references public.tasks (id) on delete set null,
  payment_id       uuid references public.payments (id) on delete set null,
  type             text not null check (type in (
                     'deposit', 'hold', 'release', 'refund', 'withdrawal', 'commission'
                   )),
  amount           bigint not null check (amount > 0),
  direction        text not null check (direction in ('credit', 'debit')),
  status           text not null default 'success' check (status in ('pending', 'success', 'failed')),
  razorpay_ref     text,
  idempotency_key  text unique,
  metadata         jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists transactions_user_created_idx on public.transactions (user_id, created_at desc);
create index if not exists transactions_task_idx on public.transactions (task_id);
create index if not exists transactions_payment_idx on public.transactions (payment_id);

-- ============================================================================
-- Row Level Security — read-only for owners; writes via SECURITY DEFINER RPCs
-- ============================================================================
alter table public.payments enable row level security;
alter table public.transactions enable row level security;

drop policy if exists payments_select_participant on public.payments;
create policy payments_select_participant on public.payments
  for select using (
    payer_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.poster_id = auth.uid() or t.selected_worker_id = auth.uid())
    )
  );

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- RPC: wallet_deposit
-- ============================================================================
create or replace function public.wallet_deposit(
  p_user_id uuid,
  p_amount bigint,
  p_idempotency_key text default null,
  p_ref text default 'simulated'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id uuid;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  end if;

  if p_idempotency_key is not null and exists (
    select 1 from public.transactions where idempotency_key = p_idempotency_key
  ) then
    select id into v_tx_id from public.transactions where idempotency_key = p_idempotency_key;
    return jsonb_build_object('ok', true, 'transaction_id', v_tx_id, 'idempotent', true);
  end if;

  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Wallet not found');
  end if;

  update public.wallets
  set balance = balance + p_amount, updated_at = now()
  where user_id = p_user_id;

  insert into public.transactions (user_id, type, amount, direction, status, idempotency_key, razorpay_ref)
  values (p_user_id, 'deposit', p_amount, 'credit', 'success', p_idempotency_key, p_ref)
  returning id into v_tx_id;

  return jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
end;
$$;

-- ============================================================================
-- RPC: wallet_withdraw
-- ============================================================================
create or replace function public.wallet_withdraw(
  p_user_id uuid,
  p_amount bigint,
  p_idempotency_key text default null,
  p_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
  v_tx_id uuid;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  end if;

  if p_idempotency_key is not null and exists (
    select 1 from public.transactions where idempotency_key = p_idempotency_key
  ) then
    select id into v_tx_id from public.transactions where idempotency_key = p_idempotency_key;
    return jsonb_build_object('ok', true, 'transaction_id', v_tx_id, 'idempotent', true);
  end if;

  select * into v_wallet from public.wallets where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Wallet not found');
  end if;

  if v_wallet.balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'Insufficient available balance');
  end if;

  update public.wallets
  set balance = balance - p_amount, updated_at = now()
  where user_id = p_user_id;

  insert into public.transactions (user_id, type, amount, direction, status, idempotency_key, razorpay_ref)
  values (p_user_id, 'withdrawal', p_amount, 'debit', 'success', p_idempotency_key, p_ref)
  returning id into v_tx_id;

  return jsonb_build_object('ok', true, 'transaction_id', v_tx_id);
end;
$$;

-- ============================================================================
-- RPC: escrow_hold — fund task escrow from poster wallet (simulated instant capture)
-- ============================================================================
create or replace function public.escrow_hold(
  p_task_id uuid,
  p_application_id uuid,
  p_payer_id uuid,
  p_amount bigint,
  p_idempotency_key text default null,
  p_provider text default 'simulated'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_app public.applications%rowtype;
  v_wallet public.wallets%rowtype;
  v_payment_id uuid;
  v_order_id text;
  v_commission bigint;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  end if;

  if p_idempotency_key is not null and exists (
    select 1 from public.payments where razorpay_order_id = p_idempotency_key
  ) then
    select id into v_payment_id from public.payments where razorpay_order_id = p_idempotency_key;
    return jsonb_build_object('ok', true, 'payment_id', v_payment_id, 'idempotent', true);
  end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Task not found');
  end if;

  if v_task.poster_id <> p_payer_id then
    return jsonb_build_object('ok', false, 'error', 'Only the task poster can fund escrow');
  end if;

  if v_task.status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'Task is not open for funding');
  end if;

  select * into v_app from public.applications
  where id = p_application_id and task_id = p_task_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Proposal not found');
  end if;

  if v_app.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Proposal is not pending');
  end if;

  if exists (
    select 1 from public.payments
    where task_id = p_task_id and escrow_status = 'held'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Escrow is already held for this task');
  end if;

  select * into v_wallet from public.wallets where user_id = p_payer_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Wallet not found');
  end if;

  if v_wallet.balance < p_amount then
    return jsonb_build_object(
      'ok', false,
      'error', 'Insufficient wallet balance. Add funds before accepting a proposal.'
    );
  end if;

  v_commission := public.platform_commission(p_amount);
  v_order_id := coalesce(p_idempotency_key, 'sim_' || gen_random_uuid()::text);

  update public.wallets
  set balance = balance - p_amount,
      locked_balance = locked_balance + p_amount,
      updated_at = now()
  where user_id = p_payer_id;

  insert into public.payments (
    task_id, application_id, payer_id, razorpay_order_id, razorpay_payment_id,
    amount, commission, status, escrow_status, provider
  ) values (
    p_task_id, p_application_id, p_payer_id, v_order_id, 'sim_pay_' || gen_random_uuid()::text,
    p_amount, v_commission, 'captured', 'held', p_provider
  )
  returning id into v_payment_id;

  insert into public.transactions (user_id, task_id, payment_id, type, amount, direction, status, idempotency_key, razorpay_ref)
  values (p_payer_id, p_task_id, v_payment_id, 'hold', p_amount, 'debit', 'success',
          p_idempotency_key || ':hold', v_order_id);

  update public.tasks
  set escrow_amount = p_amount, updated_at = now()
  where id = p_task_id;

  return jsonb_build_object('ok', true, 'payment_id', v_payment_id);
end;
$$;

-- ============================================================================
-- RPC: escrow_release — pay worker on approval (minus platform commission)
-- ============================================================================
create or replace function public.escrow_release(
  p_payment_id uuid,
  p_worker_id uuid,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_poster_wallet public.wallets%rowtype;
  v_worker_wallet public.wallets%rowtype;
  v_worker_payout bigint;
begin
  if p_idempotency_key is not null and exists (
    select 1 from public.transactions where idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Payment not found');
  end if;

  if v_payment.escrow_status <> 'held' then
    return jsonb_build_object('ok', false, 'error', 'Escrow is not in held state');
  end if;

  v_worker_payout := v_payment.amount - v_payment.commission;

  select * into v_poster_wallet from public.wallets where user_id = v_payment.payer_id for update;
  if not found or v_poster_wallet.locked_balance < v_payment.amount then
    return jsonb_build_object('ok', false, 'error', 'Escrow balance mismatch');
  end if;

  select * into v_worker_wallet from public.wallets where user_id = p_worker_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Worker wallet not found');
  end if;

  update public.wallets
  set locked_balance = locked_balance - v_payment.amount, updated_at = now()
  where user_id = v_payment.payer_id;

  update public.wallets
  set balance = balance + v_worker_payout, updated_at = now()
  where user_id = p_worker_id;

  update public.payments
  set escrow_status = 'released', updated_at = now()
  where id = p_payment_id;

  insert into public.transactions (user_id, task_id, payment_id, type, amount, direction, status, idempotency_key)
  values (p_worker_id, v_payment.task_id, p_payment_id, 'release', v_worker_payout, 'credit', 'success', p_idempotency_key);

  if v_payment.commission > 0 then
    insert into public.transactions (user_id, task_id, payment_id, type, amount, direction, status, metadata)
    values (
      p_worker_id, v_payment.task_id, p_payment_id, 'commission', v_payment.commission, 'debit', 'success',
      jsonb_build_object('platform_fee_bps', 500)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'worker_payout', v_worker_payout,
    'commission', v_payment.commission
  );
end;
$$;

-- ============================================================================
-- RPC: escrow_refund — return held funds to poster
-- ============================================================================
create or replace function public.escrow_refund(
  p_payment_id uuid,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_wallet public.wallets%rowtype;
begin
  if p_idempotency_key is not null and exists (
    select 1 from public.transactions where idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Payment not found');
  end if;

  if v_payment.escrow_status <> 'held' then
    return jsonb_build_object('ok', false, 'error', 'Escrow is not in held state');
  end if;

  select * into v_wallet from public.wallets where user_id = v_payment.payer_id for update;
  if not found or v_wallet.locked_balance < v_payment.amount then
    return jsonb_build_object('ok', false, 'error', 'Escrow balance mismatch');
  end if;

  update public.wallets
  set locked_balance = locked_balance - v_payment.amount,
      balance = balance + v_payment.amount,
      updated_at = now()
  where user_id = v_payment.payer_id;

  update public.payments
  set escrow_status = 'refunded', status = 'refunded', updated_at = now()
  where id = p_payment_id;

  insert into public.transactions (user_id, task_id, payment_id, type, amount, direction, status, idempotency_key)
  values (v_payment.payer_id, v_payment.task_id, p_payment_id, 'refund', v_payment.amount, 'credit', 'success', p_idempotency_key);

  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================================
-- RPC: escrow_split — partial settlement (dispute resolution)
-- ============================================================================
create or replace function public.escrow_split(
  p_payment_id uuid,
  p_poster_id uuid,
  p_worker_id uuid,
  p_poster_share bigint,
  p_worker_share bigint,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_poster_wallet public.wallets%rowtype;
  v_worker_wallet public.wallets%rowtype;
begin
  if p_poster_share < 0 or p_worker_share < 0 then
    return jsonb_build_object('ok', false, 'error', 'Shares must be non-negative');
  end if;

  if p_poster_share + p_worker_share <> (
    select amount from public.payments where id = p_payment_id
  ) then
    -- allow mismatch check after lock
    null;
  end if;

  if p_idempotency_key is not null and exists (
    select 1 from public.transactions where idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Payment not found');
  end if;

  if v_payment.escrow_status <> 'held' then
    return jsonb_build_object('ok', false, 'error', 'Escrow is not in held state');
  end if;

  if p_poster_share + p_worker_share <> v_payment.amount then
    return jsonb_build_object('ok', false, 'error', 'Split shares must equal escrow amount');
  end if;

  if v_payment.payer_id <> p_poster_id then
    return jsonb_build_object('ok', false, 'error', 'Poster mismatch');
  end if;

  select * into v_poster_wallet from public.wallets where user_id = p_poster_id for update;
  if not found or v_poster_wallet.locked_balance < v_payment.amount then
    return jsonb_build_object('ok', false, 'error', 'Escrow balance mismatch');
  end if;

  update public.wallets
  set locked_balance = locked_balance - v_payment.amount,
      balance = balance + p_poster_share,
      updated_at = now()
  where user_id = p_poster_id;

  if p_worker_share > 0 then
    select * into v_worker_wallet from public.wallets where user_id = p_worker_id for update;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'Worker wallet not found');
    end if;

    update public.wallets
    set balance = balance + p_worker_share, updated_at = now()
    where user_id = p_worker_id;

    insert into public.transactions (user_id, task_id, payment_id, type, amount, direction, status)
    values (p_worker_id, v_payment.task_id, p_payment_id, 'release', p_worker_share, 'credit', 'success');
  end if;

  update public.payments
  set escrow_status = 'partial', updated_at = now()
  where id = p_payment_id;

  if p_poster_share > 0 then
    insert into public.transactions (user_id, task_id, payment_id, type, amount, direction, status, idempotency_key)
    values (p_poster_id, v_payment.task_id, p_payment_id, 'refund', p_poster_share, 'credit', 'success', p_idempotency_key);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- Lock down RPC execution to service role (called from server via admin client)
revoke all on function public.wallet_deposit(uuid, bigint, text, text) from public;
revoke all on function public.wallet_withdraw(uuid, bigint, text, text) from public;
revoke all on function public.escrow_hold(uuid, uuid, uuid, bigint, text, text) from public;
revoke all on function public.escrow_release(uuid, uuid, text) from public;
revoke all on function public.escrow_refund(uuid, text) from public;
revoke all on function public.escrow_split(uuid, uuid, uuid, bigint, bigint, text) from public;

grant execute on function public.wallet_deposit(uuid, bigint, text, text) to service_role;
grant execute on function public.wallet_withdraw(uuid, bigint, text, text) to service_role;
grant execute on function public.escrow_hold(uuid, uuid, uuid, bigint, text, text) to service_role;
grant execute on function public.escrow_release(uuid, uuid, text) to service_role;
grant execute on function public.escrow_refund(uuid, text) to service_role;
grant execute on function public.escrow_split(uuid, uuid, uuid, bigint, bigint, text) to service_role;
