-- Backfill CTA signup displayed names to prefer Albion name over Discord display name.
-- For each signup:
--   player_name = users.albion_name (if non-empty) else users.display_name.
update public.cta_signups as signups
set player_name = coalesce(
  nullif(btrim(users.albion_name), ''),
  nullif(btrim(users.display_name), ''),
  signups.player_name
)
from public.guild_members as members
join public.users as users on users.id = members.user_id
where signups.member_id = members.id
  and signups.player_name is distinct from coalesce(
    nullif(btrim(users.albion_name), ''),
    nullif(btrim(users.display_name), ''),
    signups.player_name
  );
