alter table public.users enable row level security;
alter table public.guild_members enable row level security;
alter table public.guild_config enable row level security;
alter table public.invites enable row level security;
alter table public.ctas enable row level security;
alter table public.attendance enable row level security;
alter table public.points_history enable row level security;
alter table public.builds enable row level security;
alter table public.regear_requests enable row level security;
alter table public.comps enable row level security;
alter table public.comp_slots enable row level security;
alter table public.recruitment_applications enable row level security;
alter table public.cta_signups enable row level security;

create policy "users_select_self_or_staff"
on public.users
for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.users as actor
    where actor.id = auth.uid()
      and actor.role in ('OFFICER', 'ADMIN')
  )
);

create policy "guild_members_select_self_or_staff"
on public.guild_members
for select
using (
  exists (
    select 1
    from public.users as subject
    where subject.id = guild_members.user_id
      and subject.id = auth.uid()
  )
  or exists (
    select 1
    from public.users as actor
    where actor.id = auth.uid()
      and actor.role in ('OFFICER', 'ADMIN')
  )
);

create policy "ctas_read_authenticated"
on public.ctas
for select
using (auth.uid() is not null);

create policy "ranking_read_authenticated"
on public.points_history
for select
using (auth.uid() is not null);

create policy "comps_read_authenticated"
on public.comps
for select
using (auth.uid() is not null);

create policy "comp_slots_read_authenticated"
on public.comp_slots
for select
using (auth.uid() is not null);

create policy "recruitment_applications_select_self_or_staff"
on public.recruitment_applications
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.users as actor
    where actor.id = auth.uid()
      and actor.role in ('OFFICER', 'ADMIN')
  )
);

create policy "cta_signups_read_authenticated"
on public.cta_signups
for select
using (auth.uid() is not null);

create policy "guild_config_admin_write"
on public.guild_config
for all
using (
  exists (
    select 1
    from public.users as actor
    where actor.id = auth.uid()
      and actor.role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.users as actor
    where actor.id = auth.uid()
      and actor.role = 'ADMIN'
  )
);
