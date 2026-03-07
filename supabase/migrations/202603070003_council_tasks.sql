create type public.council_task_status as enum ('TODO', 'IN_PROGRESS', 'DONE');
create type public.council_task_category as enum ('LOGISTICA', 'ECONOMIA', 'CONTENT', 'ANUNCIOS');

create table public.council_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category public.council_task_category not null,
  status public.council_task_status not null default 'TODO',
  assigned_member_id uuid references public.guild_members(id) on delete set null,
  execute_at timestamptz,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index council_tasks_status_idx on public.council_tasks(status);
create index council_tasks_execute_at_idx on public.council_tasks(execute_at);
create index council_tasks_assigned_member_id_idx on public.council_tasks(assigned_member_id);
