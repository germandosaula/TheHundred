create table public.comps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.comp_slots (
  id uuid primary key default gen_random_uuid(),
  comp_id uuid not null references public.comps(id) on delete cascade,
  position integer not null check (position >= 1 and position <= 20),
  label text not null,
  player_name text,
  role text not null,
  weapon_id text not null,
  weapon_name text not null,
  notes text,
  constraint comp_slots_comp_id_position_key unique (comp_id, position)
);

create index comps_updated_at_idx on public.comps(updated_at desc);
create index comp_slots_comp_id_idx on public.comp_slots(comp_id);
