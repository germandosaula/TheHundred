create table if not exists public.scheduled_events (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  map_name text not null,
  target_utc timestamptz not null,
  created_by_discord_id text not null,
  created_by_display_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists scheduled_events_target_utc_idx
  on public.scheduled_events(target_utc);

alter table public.scheduled_events enable row level security;
alter table public.scheduled_events force row level security;

revoke all on table public.scheduled_events from anon;
revoke all on table public.scheduled_events from authenticated;
revoke all on table public.scheduled_events from public;

grant all on table public.scheduled_events to service_role;
