alter table public.users
add column if not exists albion_name text;

create unique index if not exists users_albion_name_key
  on public.users (lower(albion_name))
  where albion_name is not null;
