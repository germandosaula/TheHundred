create extension if not exists pgcrypto;

create table if not exists public.bottled_energy_imports (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid not null references public.users(id) on delete cascade,
  row_count integer not null default 0,
  inserted_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  source_preview text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bottled_energy_ledger (
  id uuid primary key default gen_random_uuid(),
  import_id uuid references public.bottled_energy_imports(id) on delete set null,
  happened_at timestamptz not null,
  albion_player text not null,
  albion_player_normalized text not null,
  reason text not null,
  amount integer not null,
  user_id uuid references public.users(id) on delete set null,
  row_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists bottled_energy_ledger_user_id_idx
  on public.bottled_energy_ledger(user_id);

create index if not exists bottled_energy_ledger_player_norm_idx
  on public.bottled_energy_ledger(albion_player_normalized);

create index if not exists bottled_energy_ledger_happened_at_idx
  on public.bottled_energy_ledger(happened_at desc);
