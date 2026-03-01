alter table public.comp_slots
  add column if not exists party_key text not null default 'party-1',
  add column if not exists party_name text not null default 'Party 1',
  add column if not exists party_position integer not null default 1;

alter table public.comp_slots
  drop constraint if exists comp_slots_comp_id_position_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comp_slots_comp_id_party_key_position_key'
  ) then
    alter table public.comp_slots
      add constraint comp_slots_comp_id_party_key_position_key unique (comp_id, party_key, position);
  end if;
end $$;

create index if not exists comp_slots_comp_id_party_key_idx on public.comp_slots(comp_id, party_key);
