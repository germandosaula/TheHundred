create table if not exists public.battle_member_attendance (
  battle_id text not null references public.battle_performance_snapshots(battle_id) on delete cascade,
  member_id uuid not null references public.guild_members(id) on delete cascade,
  primary key (battle_id, member_id)
);

create index if not exists battle_member_attendance_member_id_idx
  on public.battle_member_attendance(member_id);
