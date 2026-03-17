create table if not exists public.member_activity_exclusions (
  member_id uuid primary key references public.guild_members(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid not null references public.users(id) on delete restrict,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint member_activity_exclusions_range_check check (ends_at >= starts_at)
);

create index if not exists member_activity_exclusions_ends_at_idx
  on public.member_activity_exclusions (ends_at desc);
