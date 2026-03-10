-- Reclassify specific weapons to the new Pierce role.
update public.comp_slots
set role = 'Pierce'
where weapon_id in ('spirithunter', 'realmbreaker', 'damnation-staff', 'carving-sword');

update public.build_templates
set role = 'Pierce'
where weapon_id in ('spirithunter', 'realmbreaker', 'damnation-staff', 'carving-sword');

update public.cta_signups
set role = 'Pierce'
where lower(coalesce(weapon_name, '')) in (
  'spirithunter',
  'realmbreaker',
  'damnation staff',
  'carving sword'
);
