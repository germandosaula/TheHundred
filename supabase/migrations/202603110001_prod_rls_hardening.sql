-- Security hardening for public schema tables flagged by Supabase linter.
-- Strategy:
-- 1) Enable + force RLS on exposed tables.
-- 2) Revoke direct table access from anon/authenticated/public.
-- 3) Keep backend/bot access through service_role.

do $$
declare
  table_name text;
  target_tables text[] := array[
    'users',
    'guild_config',
    'invites',
    'ctas',
    'attendance',
    'points_history',
    'builds',
    'regear_requests',
    'guild_members',
    'recruitment_applications',
    'comps',
    'battle_performance_snapshots',
    'battle_performance_bombs',
    'comp_slots',
    'cta_signups',
    'battle_member_attendance',
    'build_templates',
    'council_tasks',
    'build_template_items',
    'wallet_transactions',
    'overview_announcements',
    'wallet_accounts',
    'loot_split_payout_members',
    'loot_split_payouts',
    'bottled_energy_imports',
    'bottled_energy_ledger'
  ];
begin
  foreach table_name in array target_tables loop
    execute format('alter table if exists public.%I enable row level security', table_name);
    execute format('alter table if exists public.%I force row level security', table_name);

    execute format('revoke all on table public.%I from anon', table_name);
    execute format('revoke all on table public.%I from authenticated', table_name);
    execute format('revoke all on table public.%I from public', table_name);

    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end
$$;

-- Keep service role sequence access (safe/idempotent).
grant usage, select, update on all sequences in schema public to service_role;
