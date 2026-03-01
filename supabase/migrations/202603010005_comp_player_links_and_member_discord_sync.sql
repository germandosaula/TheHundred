alter table public.guild_members
  add column if not exists discord_role_status public.member_status,
  add column if not exists discord_role_synced_at timestamptz;

alter table public.comp_slots
  add column if not exists player_user_id uuid references public.users(id) on delete set null;

create index if not exists comp_slots_player_user_id_idx
  on public.comp_slots(player_user_id);
