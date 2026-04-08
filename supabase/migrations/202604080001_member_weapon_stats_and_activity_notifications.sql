create table if not exists public.battle_member_weapon_stats (
  battle_id text not null references public.battle_performance_snapshots(battle_id) on delete cascade,
  member_id uuid not null references public.guild_members(id) on delete cascade,
  weapon_name text not null,
  kills integer not null default 0,
  deaths integer not null default 0,
  primary key (battle_id, member_id, weapon_name)
);

create index if not exists battle_member_weapon_stats_member_id_idx
  on public.battle_member_weapon_stats(member_id);

create index if not exists battle_member_weapon_stats_weapon_name_idx
  on public.battle_member_weapon_stats(weapon_name);

create table if not exists public.member_activity_notifications (
  member_id uuid primary key references public.guild_members(id) on delete cascade,
  last_notified_at timestamptz,
  last_ack_at timestamptz,
  notification_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists member_activity_notifications_last_notified_idx
  on public.member_activity_notifications(last_notified_at desc);
