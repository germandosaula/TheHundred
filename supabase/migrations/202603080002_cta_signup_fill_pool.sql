alter table public.cta_signups
  add column if not exists preferred_roles text[] not null default '{}',
  add column if not exists is_fill boolean not null default false;
