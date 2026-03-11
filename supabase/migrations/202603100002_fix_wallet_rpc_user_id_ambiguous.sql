create or replace function public.apply_wallet_transaction(
  p_user_id uuid,
  p_cash_delta bigint,
  p_bank_delta bigint default 0,
  p_reason text default 'manual',
  p_created_by uuid default null,
  p_metadata jsonb default null
)
returns table (
  id uuid,
  user_id uuid,
  cash_delta bigint,
  bank_delta bigint,
  cash_balance_after bigint,
  bank_balance_after bigint,
  reason text,
  created_by uuid,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cash_after bigint;
  v_bank_after bigint;
begin
  insert into public.wallet_accounts as wa (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.wallet_accounts as wa
  set
    cash_balance = wa.cash_balance + p_cash_delta,
    bank_balance = wa.bank_balance + p_bank_delta,
    updated_at = timezone('utc'::text, now())
  where
    wa.user_id = p_user_id
    and wa.cash_balance + p_cash_delta >= 0
    and wa.bank_balance + p_bank_delta >= 0
  returning wa.cash_balance, wa.bank_balance into v_cash_after, v_bank_after;

  if not found then
    raise exception 'Saldo insuficiente.'
      using errcode = 'P0001';
  end if;

  return query
  insert into public.wallet_transactions as wt (
    user_id,
    cash_delta,
    bank_delta,
    cash_balance_after,
    bank_balance_after,
    reason,
    created_by,
    metadata
  )
  values (
    p_user_id,
    p_cash_delta,
    p_bank_delta,
    v_cash_after,
    v_bank_after,
    p_reason,
    p_created_by,
    p_metadata
  )
  returning
    wt.id,
    wt.user_id,
    wt.cash_delta,
    wt.bank_delta,
    wt.cash_balance_after,
    wt.bank_balance_after,
    wt.reason,
    wt.created_by,
    wt.metadata,
    wt.created_at;
end;
$$;
