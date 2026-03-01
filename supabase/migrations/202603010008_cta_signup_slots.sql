alter table public.cta_signups
  add column if not exists slot_key text not null default '',
  add column if not exists slot_label text not null default '',
  add column if not exists weapon_name text not null default '',
  add column if not exists reaction_emoji text not null default '';
