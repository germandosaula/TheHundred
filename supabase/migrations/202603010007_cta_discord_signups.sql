alter table public.ctas
  add column if not exists comp_id uuid references public.comps(id) on delete set null,
  add column if not exists signup_channel_id text,
  add column if not exists signup_message_id text;

create unique index if not exists ctas_signup_message_id_key
  on public.ctas(signup_message_id)
  where signup_message_id is not null;

create table if not exists public.cta_signups (
  id uuid primary key default gen_random_uuid(),
  cta_id uuid not null references public.ctas(id) on delete cascade,
  member_id uuid not null references public.guild_members(id) on delete cascade,
  role text not null,
  player_name text not null,
  reacted_at timestamptz not null default now(),
  constraint cta_signups_cta_id_member_id_key unique (cta_id, member_id)
);

create index if not exists cta_signups_cta_id_idx
  on public.cta_signups(cta_id);
