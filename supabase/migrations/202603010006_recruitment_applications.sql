create table if not exists public.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  display_name text not null,
  timezone text not null,
  main_role text not null,
  zvz_experience text not null,
  notes text,
  status text not null default 'SUBMITTED',
  ticket_channel_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recruitment_applications_status_check
    check (status in ('SUBMITTED', 'TICKET_OPEN', 'APPROVED', 'REJECTED'))
);

create index if not exists recruitment_applications_status_idx
  on public.recruitment_applications(status);
