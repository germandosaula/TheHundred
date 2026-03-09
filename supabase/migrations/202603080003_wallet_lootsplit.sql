create table if not exists public.wallet_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  cash_balance bigint not null default 0,
  bank_balance bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint wallet_accounts_cash_non_negative check (cash_balance >= 0),
  constraint wallet_accounts_bank_non_negative check (bank_balance >= 0)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  cash_delta bigint not null,
  bank_delta bigint not null default 0,
  cash_balance_after bigint not null,
  bank_balance_after bigint not null,
  reason text not null,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists wallet_transactions_user_id_idx
  on public.wallet_transactions(user_id, created_at desc);

create table if not exists public.loot_split_payouts (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete restrict,
  battle_link text not null,
  battle_ids text[] not null default '{}',
  guild_name text not null,
  split_role text not null,
  est_value bigint not null,
  bags bigint not null,
  repair_cost bigint not null,
  tax_percent integer not null,
  gross_total bigint not null,
  net_after_rep bigint not null,
  tax_amount bigint not null,
  final_pool bigint not null,
  participant_count integer not null,
  per_person bigint not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists loot_split_payouts_created_at_idx
  on public.loot_split_payouts(created_at desc);

create table if not exists public.loot_split_payout_members (
  payout_id uuid not null references public.loot_split_payouts(id) on delete cascade,
  member_id uuid not null references public.guild_members(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  player_name text not null,
  amount bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (payout_id, member_id)
);

create index if not exists loot_split_payout_members_user_id_idx
  on public.loot_split_payout_members(user_id);
