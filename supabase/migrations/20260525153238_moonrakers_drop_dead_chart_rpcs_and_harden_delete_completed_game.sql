-- Recovered from live supabase_migrations.schema_migrations on 2026-05-25 to reconcile local migration history.

-- #1: Drop get_chart_dataset and get_chart_setup.
-- Both read rollup.payload->'charts' which was removed in round 3 (50% payload reduction).
-- Every rollup has has_charts_key=0 so these functions always return empty fallback data.
-- They have 0 RLS refs and 0 function refs ? permanently broken dead code.
drop function if exists public.get_chart_dataset(
  text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid
);
drop function if exists public.get_chart_setup(text, uuid);


-- #2: Drop can_read_game ? 0 RLS refs, 0 function refs.
-- Was the original game read-gate before policies were replaced with qual=true.
-- Sitting in public schema as SECURITY DEFINER with no callers.
drop function if exists public.can_read_game(uuid);

-- Drop refresh_rollups_after_legacy_import (public wrapper + private impl).
-- 0 refs on both. Purpose fully covered by admin_refresh_analytics.
drop function if exists public.refresh_rollups_after_legacy_import(uuid);
drop function if exists private.refresh_rollups_after_legacy_import(uuid);


-- #3: group_stats_rollups has two SELECT policies; true shadows can_read_group_rollup.
-- All other group tables (groups, group_members) use _select_authenticated=true,
-- so open read access for authenticated users is the consistent intended pattern.
-- Drop the shadowed restrictive policy and its now-unused function.
drop policy if exists group_stats_rollups_select_authorized on public.group_stats_rollups;
drop function if exists public.can_read_group_rollup(uuid);

-- #4: get_chart_setup was dropped in #1, which also eliminates the deleted_at
-- omission in its player list queries. No separate action needed.


-- #5: Make public.delete_completed_game SECURITY DEFINER.
-- Currently it runs as the caller (no SECURITY DEFINER), meaning any authenticated
-- user can reach private.delete_completed_game and trigger its error paths.
-- SECURITY DEFINER establishes the auth boundary at the outermost layer,
-- consistent with save_completed_game and delete_my_profile.
create or replace function public.delete_completed_game(target_game_id uuid)
returns uuid
language sql
security definer
set search_path = 'public'
as $$
  select private.delete_completed_game(target_game_id);
$$;

