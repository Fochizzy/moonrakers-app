-- The data audit found every chart dataset returning sourceGames but ZERO
-- sourcePlayers and empty series. Root cause: the fallback derives games and
-- players from the rollup's statsScreen.games.items, whose entries are
-- per-game summaries with no players array at all - so the fallback's player
-- extraction always came up empty, totals came up empty, and every chart's
-- server payload was hollow. The phone hides this behind its local fallback;
-- the Cloudflare dashboard has no local fallback and rendered nothing.
--
-- Fix: derive the fallback from the live tables instead (the function is
-- security invoker and the league is shared-read, so RLS already permits it).
-- The live function was last replaced out-of-band, so rather than restate all
-- 34k characters, this migration patches the current definition in place:
-- regex-swap the two derivation statements, then re-execute the definition.

do $do$
declare
  src text;
  patched text;
  new_games text := $sql$select coalesce(
    jsonb_agg(game_json order by game_sort asc),
    '[]'::jsonb
  )
  into fallback_source_games
  from (
    select
      coalesce(g.finished_at, g.created_at) as game_sort,
      jsonb_build_object(
        'id', to_jsonb(g.id::text),
        'createdAt', to_jsonb((extract(epoch from coalesce(g.finished_at, g.created_at)) * 1000)::bigint),
        'winnerId', to_jsonb(g.winner_profile_id::text),
        'selectedWinnerId', to_jsonb(g.winner_profile_id::text),
        'manualWinnerId', to_jsonb(g.winner_profile_id::text),
        'groupName', to_jsonb(g.group_name_snapshot),
        'players', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', coalesce(gp.profile_id::text, gp.id::text),
            'name', coalesce(nullif(pr.display_name, ''), nullif(gp.display_name_snapshot, ''), gp.player_name_snapshot, 'Player'),
            'color', gp.color_snapshot,
            'assignedCardArtIndex', gp.assigned_card_art_index_snapshot,
            'startOrder', gp.start_order,
            'totalPrestige', gp.total_prestige,
            'prestige', gp.total_prestige,
            'score', gp.score,
            'assists', gp.assists,
            'contracts', gp.contracts,
            'failures', gp.failures
          ) order by gp.start_order asc), '[]'::jsonb)
          from public.game_participants gp
          left join public.profiles pr on pr.id = gp.profile_id
          where gp.game_id = g.id
        ),
        'totals', (
          select coalesce(jsonb_object_agg(
            coalesce(gp.profile_id::text, gp.id::text),
            jsonb_build_object(
              'name', coalesce(nullif(pr.display_name, ''), nullif(gp.display_name_snapshot, ''), gp.player_name_snapshot, 'Player'),
              'playerName', coalesce(nullif(pr.display_name, ''), nullif(gp.display_name_snapshot, ''), gp.player_name_snapshot, 'Player'),
              'score', gp.score,
              'totalPrestige', gp.total_prestige,
              'prestige', gp.total_prestige,
              'directPrestige', gp.direct_prestige,
              'assistPrestigeReceived', gp.assist_prestige_received,
              'objectivePrestige', gp.objective_prestige,
              'assists', gp.assists,
              'contracts', gp.contracts,
              'failures', gp.failures
            )
          ), '{}'::jsonb)
          from public.game_participants gp
          left join public.profiles pr on pr.id = gp.profile_id
          where gp.game_id = g.id
        )
      ) as game_json
    from public.games g
    where g.status = 'finished'
      and exists (
        select 1 from public.game_participants vg
        where vg.game_id = g.id and vg.profile_id = target_profile_id
      )
  ) as source_games;$sql$;
  new_players text := $sql$select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', dedup.pid,
      'name', dedup.pname,
      'color', dedup.pcolor,
      'assignedCardArtIndex', dedup.part_art
    ) order by lower(dedup.pname) asc, dedup.pid asc),
    '[]'::jsonb
  )
  into fallback_source_players
  from (
    select distinct on (coalesce(gp.profile_id::text, gp.id::text))
      coalesce(gp.profile_id::text, gp.id::text) as pid,
      coalesce(nullif(pr.display_name, ''), nullif(gp.display_name_snapshot, ''), gp.player_name_snapshot, 'Player') as pname,
      gp.color_snapshot as pcolor,
      to_jsonb(gp.assigned_card_art_index_snapshot) as part_art
    from public.game_participants gp
    join public.games g on g.id = gp.game_id
    left join public.profiles pr on pr.id = gp.profile_id
    where g.status = 'finished'
      and exists (
        select 1 from public.game_participants vg
        where vg.game_id = g.id and vg.profile_id = target_profile_id
      )
    order by coalesce(gp.profile_id::text, gp.id::text), coalesce(g.finished_at, g.created_at) desc
  ) as dedup;$sql$;
begin
  select pg_get_functiondef(p.oid)
  into src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_chart_dataset';

  if src is null then
    raise exception 'public.get_chart_dataset not found';
  end if;

  -- Games derivation: uniquely anchored by history_game->'id' at its start and
  -- the only "as history_game;" terminator in the function.
  patched := regexp_replace(
    src,
    'select coalesce\(\s*jsonb_agg\(\s*jsonb_build_object\(\s*''id'', history_game->''id'',.*?from jsonb_array_elements\(rollup_game_history\) as history_game;',
    new_games
  );

  if patched = src then
    raise exception 'games fallback block did not match - live definition drifted';
  end if;
  src := patched;

  -- Players derivation: uniquely terminated by "as dedup_players;".
  patched := regexp_replace(
    src,
    'select coalesce\(\s*jsonb_agg\(player_value order by sort_name asc, player_id asc\),.*?as dedup_players;',
    new_players
  );

  if patched = src then
    raise exception 'players fallback block did not match - live definition drifted';
  end if;

  execute patched;
end
$do$;
