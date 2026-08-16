-- Give the stats Focus Player picker a real directory to pick from.
--
-- private.get_stats_screen_rollup returns personal_stats_rollups.payload->'statsScreen'
-- verbatim, and that stored payload carries a players.options list built for the
-- one profile the rollup belongs to. So the picker only ever offered a single
-- entry: your own name when viewing yourself, and — once focused — only the
-- focused player, with no way back.
--
-- app/stats.tsx already drives the picker off players.options and already passes
-- focusPlayerId back into the RPC, and get_stats_screen already resolves and
-- validates that focus. The directory was the only missing piece.
--
-- Both branches now publish the same active-profile directory. This is not a new
-- disclosure: the fallback branch below has always built options from every
-- active profile, and get_stats_screen already accepts any non-deleted profile as
-- a focus target and returns that player's full stats.

create or replace function public.get_stats_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null::uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requester_profile_id uuid := coalesce(profile_id, auth.uid());
  effective_focus_player_id uuid := null;
  rollup_stats jsonb := null;
  player_options jsonb := '[]'::jsonb;
  focus_label text := 'Selected player';
  form_closing jsonb := '{}'::jsonb;
  turn_order_overview jsonb := '[]'::jsonb;
  turn_order_by_table_size jsonb := '[]'::jsonb;
begin
  if requester_profile_id is null or requester_profile_id <> auth.uid() then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select coalesce(
    focus_player_id,
    requester_profile_id
  )
  into effective_focus_player_id;

  if focus_player_id is not null then
    select p.id
    into effective_focus_player_id
    from public.profiles as p
    where p.id = focus_player_id
      and p.deleted_at is null
    limit 1;

    if effective_focus_player_id is null then
      effective_focus_player_id := requester_profile_id;
    end if;
  end if;

  -- Built once, before the branch: the rollup path needs this just as much as
  -- the empty-state path, and it is what makes the picker navigable.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'label', coalesce(nullif(p.display_name, ''), p.player_name, 'Player'),
        'displayName', nullif(p.display_name, ''),
        'playerName', p.player_name
      )
      order by lower(coalesce(nullif(p.display_name, ''), p.player_name, 'Player')), p.id
    ),
    '[]'::jsonb
  )
  into player_options
  from public.profiles as p
  where p.deleted_at is null;

  select private.get_stats_screen_rollup(effective_focus_player_id)
  into rollup_stats;

  if rollup_stats is not null then
    form_closing := private.phase1_form_closing_cluster(rollup_stats);

    if jsonb_typeof(rollup_stats->'overview') = 'object'
      and form_closing <> '{}'::jsonb
    then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{overview,formClosing}',
        form_closing,
        true
      );
    end if;

    if jsonb_typeof(rollup_stats->'players') = 'object' then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{players,options}',
        player_options,
        true
      );

      rollup_stats := jsonb_set(
        rollup_stats,
        '{players,selectedPlayerId}',
        to_jsonb(effective_focus_player_id),
        true
      );
    end if;

    if jsonb_typeof(rollup_stats->'players'->'detail') = 'object' then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{players,detail,pressureContext}',
        private.phase1_pressure_context_cluster(effective_focus_player_id),
        true
      );
    end if;

    turn_order_overview := private.phase1_turn_order_overview(effective_focus_player_id);
    turn_order_by_table_size := private.phase1_turn_order_by_table_size(effective_focus_player_id);

    if jsonb_typeof(rollup_stats->'games') = 'object' then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{games,turnOrderOverview}',
        turn_order_overview,
        true
      );

      rollup_stats := jsonb_set(
        rollup_stats,
        '{games,turnOrderByTableSize}',
        turn_order_by_table_size,
        true
      );
    end if;

    if jsonb_typeof(rollup_stats->'correlations') = 'object' then
      rollup_stats := jsonb_set(
        rollup_stats,
        '{correlations,turnOrderSummary}',
        private.phase1_turn_order_summary(
          effective_focus_player_id,
          turn_order_overview
        ),
        true
      );
    end if;

    return rollup_stats;
  end if;

  select coalesce(nullif(p.display_name, ''), p.player_name, 'Selected player')
  into focus_label
  from public.profiles as p
  where p.id = effective_focus_player_id
  limit 1;

  return jsonb_build_object(
    'generatedAt', now(),
    'overview', jsonb_build_object(
      'hero', jsonb_build_object(
        'title', 'Stats overview',
        'takeaway', 'No finished games are available for this player yet.',
        'games', 0,
        'players', jsonb_array_length(player_options)
      ),
      'cards', '[]'::jsonb,
      'topSignals', '[]'::jsonb
    ),
    'players', jsonb_build_object(
      'options', player_options,
      'selectedPlayerId', effective_focus_player_id,
      'detail', jsonb_build_object(
        'playerId', effective_focus_player_id,
        'label', focus_label,
        'summary', 'No finished games are available for this player yet.',
        'stats', jsonb_build_object(
          'games', 0,
          'wins', 0,
          'winRate', '0%',
          'avgPrestige', 0,
          'contractConversion', '0%'
        )
      )
    ),
    'playstyle', jsonb_build_object(
      'summary', 'No playstyle data is available yet.',
      'highlights', '[]'::jsonb
    ),
    'correlations', jsonb_build_object(
      'summary', 'No correlations are available yet.',
      'items', '[]'::jsonb,
      'selectedKey', null
    ),
    'games', jsonb_build_object(
      'items', '[]'::jsonb,
      'selectedGameId', null,
      'detail', null
    ),
    'emptyState', jsonb_build_object(
      'title', 'No data yet',
      'description', 'Stats will appear after this player finishes a tracked game.'
    )
  );
end;
$$;

revoke all on function public.get_stats_screen(uuid, uuid) from public;
revoke all on function public.get_stats_screen(uuid, uuid) from anon;
grant execute on function public.get_stats_screen(uuid, uuid) to authenticated;
grant execute on function public.get_stats_screen(uuid, uuid) to service_role;
