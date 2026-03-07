create table if not exists public.build_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  weapon_id text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.build_template_items (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.build_templates(id) on delete cascade,
  slot text not null check (slot in ('MAIN_HAND', 'OFF_HAND', 'HEAD', 'ARMOR', 'SHOES', 'CAPE', 'BAG', 'MOUNT', 'FOOD', 'POTION')),
  item_id text not null,
  item_name text not null,
  position integer not null default 1,
  unique (build_id, slot)
);

alter table public.comp_slots
  add column if not exists build_id uuid references public.build_templates(id) on delete set null;

create index if not exists build_templates_updated_at_idx on public.build_templates(updated_at desc);
create index if not exists build_template_items_build_id_idx on public.build_template_items(build_id, position);
create index if not exists comp_slots_build_id_idx on public.comp_slots(build_id);
