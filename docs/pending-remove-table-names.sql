-- Collapse each profile onto a single name: the username.
--
-- DO NOT RUN until the concurrent guest/passcode migration session has
-- finished. As of 2026-08-17 20:10 UTC that session was still applying
-- migrations to public.profiles (latest: 20260817201045
-- moonrakers_save_and_stats_profile_only). Two writers on this table at once
-- risks clobbering its work.
--
-- Goal: profiles.player_name currently holds real first names (Izzy, James,
-- Greg, Corey) while display_name holds the handle. The Cpl_Baloo row created
-- at 19:30 shows the intended shape -- player_name == display_name == username.
-- This brings the original four into line and clears the frozen per-game
-- snapshots so no real name survives anywhere in the data.
--
-- Safe to re-run: every statement is a no-op once applied.

begin;

-- 1. Refuse to run if collapsing would violate profiles_player_name_key, which
--    is unique on the exact string (the display_name index is on lower()).
--    Guests became rows in public.profiles on 2026-08-17, so this set may be
--    larger than the five profiles that existed when this was written.
do $$
declare
  collision text;
begin
  select string_agg(handle, ', ')
  into collision
  from (
    select coalesce(nullif(btrim(display_name), ''), player_name) as handle
    from public.profiles
    where deleted_at is null
    group by 1
    having count(*) > 1
  ) duplicates;

  if collision is not null then
    raise exception 'aborting: these handles are not unique across profiles: %', collision;
  end if;
end $$;

-- 2. Capture the before state. Keep this output -- it is the rollback.
select id, player_name, display_name
from public.profiles
order by created_at;

-- 3. The username becomes the only name.
update public.profiles
set player_name = btrim(display_name),
    updated_at  = now()
where deleted_at is null
  and nullif(btrim(display_name), '') is not null
  and player_name is distinct from btrim(display_name);

-- 4. Clear the real names frozen into finished games. get_game_history,
--    get_insights_screen and get_player_profile_screen read these snapshots
--    directly rather than joining live profiles, so leaving them would keep
--    real names on every historical game.
update public.game_participants gp
set player_name_snapshot  = p.player_name,
    display_name_snapshot = p.display_name
from public.profiles p
where gp.profile_id = p.id
  and (gp.player_name_snapshot  is distinct from p.player_name
    or gp.display_name_snapshot is distinct from p.display_name);

commit;

-- 5. Rebuild the derived caches. admin_refresh_analytics overwrites the whole
--    personal payload and drops eloProfile, so it must run BEFORE the ELO pass
--    puts it back.
select private.admin_refresh_analytics(id)
from public.profiles
where deleted_at is null;

select private.refresh_all_elo_snapshots();

-- 6. Verify: expect 0 across the board.
select 'profiles'      as location,
       count(*) filter (where player_name in ('Izzy','James','Greg','Corey')) as real_names
from public.profiles
union all
select 'participants',
       count(*) filter (where player_name_snapshot in ('Izzy','James','Greg','Corey'))
from public.game_participants
union all
select 'personal_rollups',
       count(*) filter (where payload::text similar to '%"(Izzy|James|Greg|Corey)"%')
from public.personal_stats_rollups
union all
select 'global_rollups',
       count(*) filter (where payload::text similar to '%"(Izzy|James|Greg|Corey)"%')
from public.global_stats_rollups;
