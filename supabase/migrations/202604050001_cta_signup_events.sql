create table if not exists public.cta_signup_events (
  id uuid primary key default gen_random_uuid(),
  cta_id uuid not null references public.ctas(id) on delete cascade,
  member_id uuid not null references public.guild_members(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cta_signup_events_member_id_idx
  on public.cta_signup_events(member_id);

create index if not exists cta_signup_events_cta_id_idx
  on public.cta_signup_events(cta_id);

create index if not exists cta_signup_events_created_at_idx
  on public.cta_signup_events(created_at);
