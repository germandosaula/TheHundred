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

create or replace function public.process_loot_split_payout(
  p_created_by uuid,
  p_battle_link text,
  p_battle_ids text[],
  p_guild_name text,
  p_split_role text,
  p_est_value bigint,
  p_bags bigint,
  p_repair_cost bigint,
  p_tax_percent integer,
  p_gross_total bigint,
  p_net_after_rep bigint,
  p_tax_amount bigint,
  p_final_pool bigint,
  p_participant_count integer,
  p_per_person bigint,
  p_payouts jsonb,
  p_idempotency_key text default null
)
returns table (
  payout_id uuid,
  already_processed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_payout_id uuid;
  v_entry jsonb;
begin
  if p_idempotency_key is not null then
    select lsp.id
    into v_existing_id
    from public.loot_split_payouts as lsp
    where lsp.idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return query select v_existing_id, true;
      return;
    end if;
  end if;

  begin
    insert into public.loot_split_payouts (
      created_by,
      battle_link,
      battle_ids,
      guild_name,
      split_role,
      est_value,
      bags,
      repair_cost,
      tax_percent,
      gross_total,
      net_after_rep,
      tax_amount,
      final_pool,
      participant_count,
      per_person,
      idempotency_key
    )
    values (
      p_created_by,
      p_battle_link,
      coalesce(p_battle_ids, '{}'::text[]),
      p_guild_name,
      p_split_role,
      p_est_value,
      p_bags,
      p_repair_cost,
      p_tax_percent,
      p_gross_total,
      p_net_after_rep,
      p_tax_amount,
      p_final_pool,
      p_participant_count,
      p_per_person,
      p_idempotency_key
    )
    returning id into v_payout_id;
  exception
    when unique_violation then
      if p_idempotency_key is not null then
        select lsp.id
        into v_existing_id
        from public.loot_split_payouts as lsp
        where lsp.idempotency_key = p_idempotency_key
        limit 1;

        if found then
          return query select v_existing_id, true;
          return;
        end if;
      end if;
      raise;
  end;

  for v_entry in
    select j.value
    from jsonb_array_elements(coalesce(p_payouts, '[]'::jsonb)) as j(value)
  loop
    perform public.apply_wallet_transaction(
      (v_entry ->> 'userId')::uuid,
      coalesce((v_entry ->> 'amount')::bigint, 0),
      0,
      'loot_split_payout',
      p_created_by,
      jsonb_build_object(
        'payoutId', v_payout_id,
        'memberId', v_entry ->> 'memberId',
        'playerName', v_entry ->> 'playerName',
        'battleIds', to_jsonb(coalesce(p_battle_ids, '{}'::text[]))
      )
    );

    insert into public.loot_split_payout_members (
      payout_id,
      member_id,
      user_id,
      player_name,
      amount
    )
    values (
      v_payout_id,
      (v_entry ->> 'memberId')::uuid,
      (v_entry ->> 'userId')::uuid,
      coalesce(v_entry ->> 'playerName', ''),
      coalesce((v_entry ->> 'amount')::bigint, 0)
    );
  end loop;

  return query select v_payout_id, false;
end;
$$;
