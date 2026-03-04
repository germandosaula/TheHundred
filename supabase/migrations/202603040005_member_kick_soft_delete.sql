alter table public.guild_members
  add column if not exists kicked_at timestamptz,
  add column if not exists kicked_by_user_id uuid references public.users(id) on delete set null,
  add column if not exists kick_reason text;

create index if not exists guild_members_kicked_at_idx
  on public.guild_members(kicked_at);
