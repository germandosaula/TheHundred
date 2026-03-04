create table if not exists public.battle_performance_snapshots (
  battle_id text primary key,
  start_time timestamptz not null,
  guild_name text not null,
  guild_players integer not null default 0,
  guild_kills integer not null default 0,
  guild_deaths integer not null default 0,
  main_kills integer not null default 0,
  main_deaths integer not null default 0,
  processed_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.battle_performance_bombs (
  battle_id text not null references public.battle_performance_snapshots(battle_id) on delete cascade,
  bomb_group_name text not null,
  players integer not null default 0,
  kills integer not null default 0,
  deaths integer not null default 0,
  primary key (battle_id, bomb_group_name)
);

create index if not exists battle_performance_snapshots_start_time_idx
  on public.battle_performance_snapshots(start_time desc);
