create table if not exists public.overview_announcements (
  id uuid primary key default gen_random_uuid(),
  position integer not null,
  title text not null,
  body text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users(id) on delete set null
);

create unique index if not exists overview_announcements_position_idx
  on public.overview_announcements(position);

insert into public.overview_announcements (position, title, body)
values
  (0, 'CTA principal', 'Revisa siempre el enlace directo desde esta vista para entrar al bloque correcto.'),
  (1, 'Estado de bot', 'Si no ves CTA en web, validar bot online y canal de signup en Discord.')
on conflict (position) do nothing;
