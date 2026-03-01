create extension if not exists pgcrypto;

create type public.user_role as enum ('PLAYER', 'OFFICER', 'ADMIN');
create type public.member_status as enum ('PENDING', 'TRIAL', 'CORE', 'BENCHED', 'REJECTED');
create type public.attendance_decision as enum ('YES', 'NO', 'JUSTIFIED');
create type public.attendance_state as enum ('PRESENT', 'ABSENT');
create type public.cta_status as enum ('CREATED', 'OPEN', 'FINALIZED');
create type public.regear_status as enum ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  display_name text not null,
  role public.user_role not null default 'PLAYER',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.guild_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status public.member_status not null,
  joined_at timestamptz not null default timezone('utc', now()),
  constraint guild_members_user_id_key unique (user_id)
);

create table public.guild_config (
  id boolean primary key default true,
  attendance_points integer not null default 10,
  absence_penalty integer not null default 5,
  member_cap integer not null default 100,
  constraint guild_config_singleton check (id = true)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  consumed_by uuid references public.users(id) on delete set null,
  consumed_at timestamptz
);

create table public.ctas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  datetime_utc timestamptz not null,
  status public.cta_status not null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  finalized_at timestamptz
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  cta_id uuid not null references public.ctas(id) on delete cascade,
  member_id uuid not null references public.guild_members(id) on delete cascade,
  decision public.attendance_decision not null,
  state public.attendance_state not null,
  source text not null default 'discord_reaction',
  created_at timestamptz not null default timezone('utc', now()),
  constraint attendance_cta_id_member_id_key unique (cta_id, member_id)
);

create table public.points_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.guild_members(id) on delete cascade,
  cta_id uuid references public.ctas(id) on delete set null,
  reason text not null,
  points integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  reversed_at timestamptz
);

create table public.builds (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.guild_members(id) on delete cascade,
  name text not null,
  equipment jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.regear_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.guild_members(id) on delete cascade,
  cta_id uuid references public.ctas(id) on delete set null,
  status public.regear_status not null default 'PENDING',
  silver_amount bigint not null,
  notes text,
  approved_by uuid references public.users(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index ctas_datetime_utc_idx on public.ctas(datetime_utc);
create index attendance_member_id_idx on public.attendance(member_id);
create index points_history_member_id_idx on public.points_history(member_id);

insert into public.guild_config (id, attendance_points, absence_penalty, member_cap)
values (true, 10, 5, 100)
on conflict (id) do nothing;
