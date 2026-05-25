create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists public.personal_stats_rollups (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.personal_stats_rollups enable row level security;

drop policy if exists "personal_stats_rollups_select_owner" on public.personal_stats_rollups;

create policy "personal_stats_rollups_select_owner"
on public.personal_stats_rollups
for select
to authenticated
using (profile_id = (select auth.uid()));

create or replace function private.refresh_server_authored_analytics(target_profile_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  generated_at timestamptz := now();
  registered_player_count integer := 0;
  finished_game_count integer := 0;
  player_row_count integer := 0;
  base_chart_points jsonb := '[]'::jsonb;
  base_chart_data jsonb := '{}'::jsonb;
  chart_rollups jsonb := '{}'::jsonb;
  player_options jsonb := '[]'::jsonb;
  player_detail jsonb := '{}'::jsonb;
  analytics_payload jsonb;
  target_player_name text := null;
  target_display_name text := null;
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'target_profile_id must match the authenticated profile';
  end if;

  select
    public.profiles.player_name,
    nullif(public.profiles.display_name, '')
  into target_player_name, target_display_name
  from public.profiles
  where public.profiles.id = target_profile_id;

  select count(*)
  into registered_player_count
  from public.profiles;

  select count(distinct public.game_participants.game_id)
  into finished_game_count
  from public.game_participants
  join public.games
    on public.games.id = public.game_participants.game_id
  where public.game_participants.profile_id = target_profile_id
    and public.games.status = 'finished';

  select count(*)
  into player_row_count
  from public.game_participants
  where public.game_participants.profile_id = target_profile_id;

  if finished_game_count > 0 then
    base_chart_points := jsonb_build_array(
      jsonb_build_object(
        'x', 1,
        'y', finished_game_count,
        'label', 'Tracked games'
      )
    );
  end if;

  player_options := jsonb_build_array(
    jsonb_build_object(
      'id', target_profile_id,
      'label', coalesce(target_display_name, target_player_name, 'Current player'),
      'playerName', target_player_name,
      'displayName', target_display_name
    )
  );

  player_detail := jsonb_build_object(
    'playerId', target_profile_id,
    'label', coalesce(target_display_name, target_player_name, 'Current player'),
    'summary', case
      when finished_game_count > 0 then 'Server-authored player detail is available for this profile.'
      else 'No finished games are available for this player yet.'
    end,
    'stats', jsonb_build_object(
      'games', finished_game_count,
      'playerRows', player_row_count
    )
  );

  base_chart_data := jsonb_build_object(
    'points', base_chart_points,
    'series', case
      when jsonb_array_length(base_chart_points) > 0 then jsonb_build_array(
        jsonb_build_object(
          'key', 'tracked-games',
          'label', 'Tracked games',
          'points', base_chart_points
        )
      )
      else '[]'::jsonb
    end,
    'meta', jsonb_build_object(
      'hasData', jsonb_array_length(base_chart_points) > 0,
      'pointCount', jsonb_array_length(base_chart_points)
    )
  );

  chart_rollups := jsonb_build_object(
    'default', jsonb_build_object(
      'chartKey', 'default',
      'generatedAt', generated_at,
      'title', 'Analytics chart',
      'subtitle', 'Server-authored placeholder dataset.',
      'emptyState', jsonb_build_object(
        'title', 'No chart data yet',
        'description', 'Finish at least one tracked game to populate this chart.'
      ),
      'data', base_chart_data
    ),
    'elo', jsonb_build_object(
      'chartKey', 'elo',
      'generatedAt', generated_at,
      'title', 'Elo trend',
      'subtitle', 'Server-authored placeholder dataset for Elo.',
      'emptyState', jsonb_build_object(
        'title', 'No Elo history yet',
        'description', 'Finish at least one tracked game to populate Elo history.'
      ),
      'data', jsonb_build_object(
        'games', '[]'::jsonb,
        'players', '[]'::jsonb
      )
    ),
    'prestige', jsonb_build_object(
      'chartKey', 'prestige',
      'generatedAt', generated_at,
      'title', 'Prestige totals',
      'subtitle', 'Server-authored placeholder dataset for prestige.',
      'emptyState', jsonb_build_object(
        'title', 'No prestige totals yet',
        'description', 'Finish at least one tracked game to populate prestige totals.'
      ),
      'data', base_chart_data
    ),
    'assists', jsonb_build_object(
      'chartKey', 'assists',
      'generatedAt', generated_at,
      'title', 'Assist volume',
      'subtitle', 'Server-authored placeholder dataset for assists.',
      'emptyState', jsonb_build_object(
        'title', 'No assist history yet',
        'description', 'Finish at least one tracked game to populate assist history.'
      ),
      'data', base_chart_data
    ),
    'radar', jsonb_build_object(
      'chartKey', 'radar',
      'generatedAt', generated_at,
      'title', 'Radar comparison',
      'subtitle', 'Server-authored placeholder dataset for radar comparisons.',
      'emptyState', jsonb_build_object(
        'title', 'No radar comparison yet',
        'description', 'Finish at least one tracked game to populate radar comparisons.'
      ),
      'data', jsonb_build_object(
        'primary', null,
        'comparison', null,
        'labels', '[]'::jsonb
      )
    ),
    'relationship_graph', jsonb_build_object(
      'chartKey', 'relationship_graph',
      'generatedAt', generated_at,
      'title', 'Relationship graph',
      'subtitle', 'Server-authored placeholder dataset for player relationships.',
      'emptyState', jsonb_build_object(
        'title', 'No relationship graph yet',
        'description', 'Finish at least one tracked game to populate relationship links.'
      ),
      'data', jsonb_build_object(
        'nodes', '[]'::jsonb,
        'edges', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb,
        'exactScopePlayerIds', '[]'::jsonb,
        'mode', 'network'
      )
    ),
    'line_chart', jsonb_build_object(
      'chartKey', 'line_chart',
      'generatedAt', generated_at,
      'title', 'Line chart',
      'subtitle', 'Server-authored placeholder dataset for line charts.',
      'emptyState', jsonb_build_object(
        'title', 'No line chart yet',
        'description', 'Finish at least one tracked game to populate line-chart history.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb,
        'mode', 'raw'
      )
    ),
    'line', jsonb_build_object(
      'chartKey', 'line',
      'generatedAt', generated_at,
      'title', 'Line chart',
      'subtitle', 'Server-authored placeholder dataset for line charts.',
      'emptyState', jsonb_build_object(
        'title', 'No line chart yet',
        'description', 'Finish at least one tracked game to populate line-chart history.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb,
        'mode', 'raw'
      )
    ),
    'multi_line_chart', jsonb_build_object(
      'chartKey', 'multi_line_chart',
      'generatedAt', generated_at,
      'title', 'Multi-line chart',
      'subtitle', 'Server-authored placeholder dataset for multi-line charts.',
      'emptyState', jsonb_build_object(
        'title', 'No multi-line chart yet',
        'description', 'Finish at least one tracked game to populate multi-line history.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb,
        'mode', 'raw'
      )
    ),
    'multi-line-chart', jsonb_build_object(
      'chartKey', 'multi-line-chart',
      'generatedAt', generated_at,
      'title', 'Multi-line chart',
      'subtitle', 'Server-authored placeholder dataset for multi-line charts.',
      'emptyState', jsonb_build_object(
        'title', 'No multi-line chart yet',
        'description', 'Finish at least one tracked game to populate multi-line history.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb,
        'mode', 'raw'
      )
    ),
    'multi-line', jsonb_build_object(
      'chartKey', 'multi-line',
      'generatedAt', generated_at,
      'title', 'Multi-line chart',
      'subtitle', 'Server-authored placeholder dataset for multi-line charts.',
      'emptyState', jsonb_build_object(
        'title', 'No multi-line chart yet',
        'description', 'Finish at least one tracked game to populate multi-line history.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb,
        'mode', 'raw'
      )
    ),
    'prestige_over_time', jsonb_build_object(
      'chartKey', 'prestige_over_time',
      'generatedAt', generated_at,
      'title', 'Prestige over time',
      'subtitle', 'Server-authored placeholder dataset for prestige-over-time charts.',
      'emptyState', jsonb_build_object(
        'title', 'No prestige-over-time chart yet',
        'description', 'Finish at least one tracked game to populate prestige-over-time history.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb,
        'mode', 'raw'
      )
    ),
    'bar_chart', jsonb_build_object(
      'chartKey', 'bar_chart',
      'generatedAt', generated_at,
      'title', 'Bar chart',
      'subtitle', 'Server-authored placeholder dataset for bar charts.',
      'emptyState', jsonb_build_object(
        'title', 'No bar chart yet',
        'description', 'Finish at least one tracked game to populate bar-chart comparisons.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'scopedPlayerIds', '[]'::jsonb
      )
    ),
    'bar', jsonb_build_object(
      'chartKey', 'bar',
      'generatedAt', generated_at,
      'title', 'Bar chart',
      'subtitle', 'Server-authored placeholder dataset for bar charts.',
      'emptyState', jsonb_build_object(
        'title', 'No bar chart yet',
        'description', 'Finish at least one tracked game to populate bar-chart comparisons.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'scopedPlayerIds', '[]'::jsonb
      )
    ),
    'bump_chart', jsonb_build_object(
      'chartKey', 'bump_chart',
      'generatedAt', generated_at,
      'title', 'Bump chart',
      'subtitle', 'Server-authored placeholder dataset for bump charts.',
      'emptyState', jsonb_build_object(
        'title', 'No bump chart yet',
        'description', 'Finish at least one tracked game to populate bump-chart rankings.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb
      )
    ),
    'consistency_band', jsonb_build_object(
      'chartKey', 'consistency_band',
      'generatedAt', generated_at,
      'title', 'Consistency band',
      'subtitle', 'Server-authored placeholder dataset for consistency bands.',
      'emptyState', jsonb_build_object(
        'title', 'No consistency band yet',
        'description', 'Finish at least one tracked game to populate consistency-band trends.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb
      )
    ),
    'heatmap', jsonb_build_object(
      'chartKey', 'heatmap',
      'generatedAt', generated_at,
      'title', 'Heatmap',
      'subtitle', 'Server-authored placeholder dataset for heatmaps.',
      'emptyState', jsonb_build_object(
        'title', 'No heatmap yet',
        'description', 'Finish at least one tracked game to populate heatmap data.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'scopedPlayerIds', '[]'::jsonb
      )
    ),
    'efficiency_failure_scatter', jsonb_build_object(
      'chartKey', 'efficiency_failure_scatter',
      'generatedAt', generated_at,
      'title', 'Efficiency scatter',
      'subtitle', 'Server-authored placeholder dataset for efficiency-versus-failure scatter plots.',
      'emptyState', jsonb_build_object(
        'title', 'No efficiency scatter yet',
        'description', 'Finish at least one tracked game to populate efficiency scatter data.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'players', '[]'::jsonb,
        'scopedPlayerIds', '[]'::jsonb
      )
    ),
    'replay_chart', jsonb_build_object(
      'chartKey', 'replay_chart',
      'generatedAt', generated_at,
      'title', 'Replay chart',
      'subtitle', 'Server-authored placeholder dataset for replay charts.',
      'emptyState', jsonb_build_object(
        'title', 'No replay chart yet',
        'description', 'Finish at least one tracked game to populate replay timelines.'
      ),
      'data', jsonb_build_object(
        'replay', '[]'::jsonb,
        'players', '[]'::jsonb,
        'statKey', 'totalPrestige',
        'selectedGameId', null
      )
    ),
    'rivalry_graph', jsonb_build_object(
      'chartKey', 'rivalry_graph',
      'generatedAt', generated_at,
      'title', 'Rivalry graph',
      'subtitle', 'Server-authored placeholder dataset for rivalry graphs.',
      'emptyState', jsonb_build_object(
        'title', 'No rivalry graph yet',
        'description', 'Finish at least one tracked game to populate rivalry data.'
      ),
      'data', jsonb_build_object(
        'games', '[]'::jsonb,
        'players', '[]'::jsonb,
        'playerId', null
      )
    ),
    'head_to_head', jsonb_build_object(
      'chartKey', 'head_to_head',
      'generatedAt', generated_at,
      'title', 'Head-to-head',
      'subtitle', 'Server-authored placeholder dataset for head-to-head comparisons.',
      'emptyState', jsonb_build_object(
        'title', 'No head-to-head data yet',
        'description', 'Finish at least one tracked game to populate head-to-head comparisons.'
      ),
      'data', jsonb_build_object(
        'games', '[]'::jsonb,
        'players', '[]'::jsonb,
        'playerId', null,
        'compareId', null
      )
    ),
    'sparkline', jsonb_build_object(
      'chartKey', 'sparkline',
      'generatedAt', generated_at,
      'title', 'Sparkline',
      'subtitle', 'Server-authored placeholder dataset for sparkline summaries.',
      'emptyState', jsonb_build_object(
        'title', 'No sparkline data yet',
        'description', 'Finish at least one tracked game to populate sparkline summaries.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'comparisonData', '[]'::jsonb,
        'metricKey', 'totalPrestige',
        'primaryLabel', null,
        'comparisonLabel', null
      )
    ),
    'stacked_bar_chart', jsonb_build_object(
      'chartKey', 'stacked_bar_chart',
      'generatedAt', generated_at,
      'title', 'Stacked bar chart',
      'subtitle', 'Server-authored placeholder dataset for stacked bar charts.',
      'emptyState', jsonb_build_object(
        'title', 'No stacked bar chart yet',
        'description', 'Finish at least one tracked game to populate stacked-bar comparisons.'
      ),
      'data', jsonb_build_object(
        'data', '[]'::jsonb,
        'metricDataMap', '{}'::jsonb,
        'metricOptions', '[]'::jsonb,
        'activeMetricKey', 'totalPrestige',
        'selectedPlayerIds', '[]'::jsonb
      )
    ),
    'compare', jsonb_build_object(
      'chartKey', 'compare',
      'generatedAt', generated_at,
      'title', 'Compare players',
      'subtitle', 'Server-authored placeholder dataset for compare views.',
      'emptyState', jsonb_build_object(
        'title', 'No compare data yet',
        'description', 'Finish at least one tracked game to populate player comparisons.'
      ),
      'data', jsonb_build_object(
        'focusPlayerId', null,
        'comparePlayerId', null,
        'scopedPlayerIds', '[]'::jsonb,
        'rows', '[]'::jsonb
      )
    )
  );

  analytics_payload := jsonb_build_object(
    'generatedAt', generated_at,
    'analyticsHome', jsonb_build_object(
      'generatedAt', generated_at,
      'hero', jsonb_build_object(
        'players', registered_player_count,
        'games', finished_game_count,
        'views', player_row_count
      ),
      'cards', jsonb_build_array(
        jsonb_build_object(
          'key', 'registered-players',
          'title', 'Registered players',
          'value', registered_player_count,
          'description', 'Players currently available to analytics.'
        ),
        jsonb_build_object(
          'key', 'tracked-games',
          'title', 'Tracked games',
          'value', finished_game_count,
          'description', 'Finished games involving this profile.'
        ),
        jsonb_build_object(
          'key', 'player-rows',
          'title', 'Player rows',
          'value', player_row_count,
          'description', 'Saved participant rows available to summarize.'
        )
      )
    ),
    'statsScreen', jsonb_build_object(
      'generatedAt', generated_at,
      'overview', jsonb_build_object(
        'hero', jsonb_build_object(
          'title', 'Stats overview',
          'takeaway', case
            when finished_game_count > 0 then 'Server-authored stats are available for this profile.'
            else 'No finished games are available for this profile yet.'
          end,
          'games', finished_game_count,
          'players', registered_player_count
        ),
        'cards', jsonb_build_array(
          jsonb_build_object(
            'key', 'games-played',
            'title', 'Games played',
            'value', finished_game_count
          ),
          jsonb_build_object(
            'key', 'players-seen',
            'title', 'Players in network',
            'value', registered_player_count
          )
        ),
        'topSignals', jsonb_build_array(
          jsonb_build_object(
            'key', 'refresh-status',
            'label', 'Refresh status',
            'value', 'fresh'
          ),
          jsonb_build_object(
            'key', 'player-rows',
            'label', 'Participant rows',
            'value', player_row_count
          )
        )
      ),
      'players', jsonb_build_object(
        'options', player_options,
        'selectedPlayerId', target_profile_id,
        'detail', player_detail
      ),
      'playstyle', jsonb_build_object(
        'summary', case
          when finished_game_count > 0 then 'More player-specific playstyle rollups can be layered onto this payload.'
          else 'Finish at least one tracked game to populate player-specific playstyle insights.'
        end,
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
      )
    ),
    'insightsScreen', jsonb_build_object(
      'generatedAt', generated_at,
      'meta', jsonb_build_object(
        'games', finished_game_count,
        'playerRows', player_row_count
      ),
      'topSignals', jsonb_build_array(
        jsonb_build_object(
          'key', 'games',
          'label', 'Tracked games',
          'value', finished_game_count
        ),
        jsonb_build_object(
          'key', 'players',
          'label', 'Registered players',
          'value', registered_player_count
        )
      ),
      'assistNetwork', jsonb_build_object(
        'nodes', '[]'::jsonb,
        'edges', '[]'::jsonb
      ),
      'correlations', jsonb_build_object(
        'summary', 'No insight correlations are available yet.',
        'items', '[]'::jsonb,
        'selectedKey', null
      )
    ),
    'charts', chart_rollups
  );

  insert into public.personal_stats_rollups as personal_rollup (profile_id, payload, updated_at)
  values (
    target_profile_id,
    analytics_payload,
    generated_at
  )
  on conflict (profile_id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  return jsonb_build_object(
    'refreshed', true,
    'profileId', target_profile_id,
    'generatedAt', generated_at
  );
end;
$$;

revoke all on function private.refresh_server_authored_analytics(uuid) from public;
revoke all on function private.refresh_server_authored_analytics(uuid) from anon;
revoke all on function private.refresh_server_authored_analytics(uuid) from authenticated;

create or replace function public.refresh_server_authored_analytics(target_profile_id uuid default auth.uid())
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.refresh_server_authored_analytics(target_profile_id);
$$;

create or replace function public.get_analytics_home(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = get_analytics_home.profile_id;

  if rollup_payload is not null and rollup_payload ? 'analyticsHome' then
    return rollup_payload->'analyticsHome';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'hero', jsonb_build_object(
      'players', 0,
      'games', 0,
      'views', 0
    ),
    'cards', '[]'::jsonb
  );
end;
$$;

create or replace function public.get_stats_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = get_stats_screen.profile_id;

  if rollup_payload is not null and rollup_payload ? 'statsScreen' then
    return rollup_payload->'statsScreen';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'overview', jsonb_build_object(
      'hero', jsonb_build_object(
        'title', 'Stats overview',
        'takeaway', 'No stats rollup is available yet.',
        'games', 0,
        'players', 0
      ),
      'cards', '[]'::jsonb,
      'topSignals', '[]'::jsonb
    ),
    'players', jsonb_build_object(
      'options', jsonb_build_array(
        jsonb_build_object(
          'id', profile_id,
          'label', 'Current player',
          'playerName', null,
          'displayName', null
        )
      ),
      'selectedPlayerId', profile_id,
      'detail', jsonb_build_object(
        'playerId', profile_id,
        'label', 'Current player',
        'summary', 'No player detail is available yet.',
        'stats', jsonb_build_object(
          'games', 0,
          'playerRows', 0
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
    )
  );
end;
$$;

create or replace function public.get_insights_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = get_insights_screen.profile_id;

  if rollup_payload is not null and rollup_payload ? 'insightsScreen' then
    return rollup_payload->'insightsScreen';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'meta', jsonb_build_object(
      'games', 0,
      'playerRows', 0
    ),
    'topSignals', '[]'::jsonb,
    'assistNetwork', jsonb_build_object(
      'nodes', '[]'::jsonb,
      'edges', '[]'::jsonb
    ),
    'correlations', jsonb_build_object(
      'summary', 'No insight correlations are available yet.',
      'items', '[]'::jsonb,
      'selectedKey', null
    )
  );
end;
$$;

create or replace function public.get_chart_setup(
  chart_key text,
  profile_id uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  normalized_chart_key text := lower(coalesce(chart_key, 'default'));
  focus_player_options jsonb := '[]'::jsonb;
  compare_player_options jsonb := '[]'::jsonb;
  scope_player_options jsonb := '[]'::jsonb;
  metric_options jsonb := '[]'::jsonb;
  line_mode_options jsonb := '[]'::jsonb;
  elo_view_options jsonb := '[]'::jsonb;
  opponent_options jsonb := '[]'::jsonb;
  default_focus_player_id uuid := null;
  default_compare_player_id uuid := null;
  default_scoped_player_ids uuid[] := array[]::uuid[];
  default_metric_key text := null;
  default_line_mode text := null;
  default_elo_tab text := null;
  total_players integer := 0;
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select count(*)
  into total_players
  from public.profiles;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', public.profiles.id,
        'label', coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player')
      )
      order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
    ),
    '[]'::jsonb
  )
  into focus_player_options
  from public.profiles;

  if exists (
    select 1
    from public.profiles
    where public.profiles.id = profile_id
  ) then
    default_focus_player_id := profile_id;
  else
    select public.profiles.id
    into default_focus_player_id
    from public.profiles
    order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', public.profiles.id,
        'label', coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player')
      )
      order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
    ),
    '[]'::jsonb
  )
  into compare_player_options
  from public.profiles
  where public.profiles.id is distinct from default_focus_player_id;

  select public.profiles.id
  into default_compare_player_id
  from public.profiles
  where public.profiles.id is distinct from default_focus_player_id
  order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
  limit 1;

  if normalized_chart_key in (
    'elo',
    'prestige_over_time',
    'line_chart',
    'line',
    'multi_line_chart',
    'multi-line-chart',
    'multi-line',
    'bump_chart',
    'bar_chart',
    'bar',
    'heatmap',
    'efficiency_failure_scatter',
    'relationship_graph',
    'consistency_band',
    'stacked_bar_chart',
    'compare'
  ) then
    scope_player_options := focus_player_options;

    select coalesce(array_agg(choice.id), array[]::uuid[])
    into default_scoped_player_ids
    from (
      select public.profiles.id
      from public.profiles
      order by lower(coalesce(nullif(public.profiles.display_name, ''), public.profiles.player_name, 'Player'))
      limit 4
    ) as choice;
  end if;

  if normalized_chart_key not in ('head_to_head', 'rivalry_graph', 'sparkline', 'compare') then
    compare_player_options := '[]'::jsonb;
    default_compare_player_id := null;
  end if;

  if normalized_chart_key in (
    'line_chart',
    'line',
    'multi_line_chart',
    'multi-line-chart',
    'multi-line',
    'prestige_over_time',
    'sparkline',
    'bar_chart',
    'bar',
    'bump_chart',
    'consistency_band',
    'heatmap'
  ) then
    metric_options := jsonb_build_array(
      jsonb_build_object('key', 'score', 'label', 'Score'),
      jsonb_build_object('key', 'totalPrestige', 'label', 'Total Prestige'),
      jsonb_build_object('key', 'prestige', 'label', 'Prestige'),
      jsonb_build_object('key', 'directPrestige', 'label', 'Direct Prestige'),
      jsonb_build_object('key', 'assistPrestigeReceived', 'label', 'Assist Prestige Received'),
      jsonb_build_object('key', 'objectivePrestige', 'label', 'Objective Prestige'),
      jsonb_build_object('key', 'assists', 'label', 'Assists'),
      jsonb_build_object('key', 'contracts', 'label', 'Contracts'),
      jsonb_build_object('key', 'failures', 'label', 'Failures'),
      jsonb_build_object('key', 'turns', 'label', 'Turns'),
      jsonb_build_object('key', 'efficiency', 'label', 'Efficiency'),
      jsonb_build_object('key', 'assistEfficiency', 'label', 'Assist Efficiency'),
      jsonb_build_object('key', 'directEfficiency', 'label', 'Direct Efficiency'),
      jsonb_build_object('key', 'contractSuccessRate', 'label', 'Contract Success Rate'),
      jsonb_build_object('key', 'netPrestige', 'label', 'Net Prestige'),
      jsonb_build_object('key', 'supportBalance', 'label', 'Support Balance')
    );
    default_metric_key := 'totalPrestige';
  elsif normalized_chart_key = 'stacked_bar_chart' then
    metric_options := jsonb_build_array(
      jsonb_build_object('key', 'totalPrestige', 'label', 'Total Prestige'),
      jsonb_build_object('key', 'score', 'label', 'Score'),
      jsonb_build_object('key', 'contracts', 'label', 'Contracts'),
      jsonb_build_object('key', 'assists', 'label', 'Assists'),
      jsonb_build_object('key', 'failures', 'label', 'Failures')
    );
    default_metric_key := 'totalPrestige';
  elsif normalized_chart_key in ('replay_chart', 'replay') then
    metric_options := jsonb_build_array(
      jsonb_build_object('key', 'totalPrestige', 'label', 'Total Prestige'),
      jsonb_build_object('key', 'directPrestige', 'label', 'Direct Prestige'),
      jsonb_build_object('key', 'assistPrestigeReceived', 'label', 'Assist Prestige Received'),
      jsonb_build_object('key', 'assists', 'label', 'Assists'),
      jsonb_build_object('key', 'contracts', 'label', 'Contracts'),
      jsonb_build_object('key', 'failures', 'label', 'Failures')
    );
    default_metric_key := 'totalPrestige';
  end if;

  if normalized_chart_key in (
    'line_chart',
    'line',
    'multi_line_chart',
    'multi-line-chart',
    'multi-line',
    'prestige_over_time'
  ) then
    line_mode_options := jsonb_build_array(
      jsonb_build_object('key', 'raw', 'label', 'Raw'),
      jsonb_build_object('key', 'cumulative', 'label', 'Cumulative'),
      jsonb_build_object('key', 'average', 'label', 'Average')
    );
    default_line_mode := 'raw';
  end if;

  if normalized_chart_key = 'elo' then
    elo_view_options := jsonb_build_array(
      jsonb_build_object('key', 'Leaderboard', 'label', 'Leaderboard'),
      jsonb_build_object('key', 'Momentum', 'label', 'Momentum'),
      jsonb_build_object('key', 'Skills', 'label', 'Skills'),
      jsonb_build_object('key', 'Context', 'label', 'Context'),
      jsonb_build_object('key', 'Projection', 'label', 'Projection')
    );
    default_elo_tab := 'Leaderboard';
    opponent_options := jsonb_build_array(
      jsonb_build_object('key', 'none', 'label', 'None')
    ) || compare_player_options;
  end if;

  return jsonb_build_object(
    'chartKey', normalized_chart_key,
    'generatedAt', now(),
    'focusPlayerOptions', focus_player_options,
    'comparePlayerOptions', compare_player_options,
    'scopePlayerOptions', scope_player_options,
    'metricOptions', metric_options,
    'lineModeOptions', line_mode_options,
    'eloViewOptions', elo_view_options,
    'opponentOptions', opponent_options,
    'defaults', jsonb_build_object(
      'focusPlayerId', default_focus_player_id,
      'comparePlayerId', default_compare_player_id,
      'scopedPlayerIds', to_jsonb(default_scoped_player_ids),
      'metricKey', default_metric_key,
      'lineMode', default_line_mode,
      'eloTab', default_elo_tab,
      'opponentId', null
    ),
    'emptyState', case
      when total_players = 0 then jsonb_build_object(
        'title', 'No chart setup data yet',
        'description', 'Create at least one profile in Supabase to unlock chart setup options.'
      )
      else null
    end
  );
end;
$$;

create or replace function public.get_chart_dataset(
  chart_key text,
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  compare_player_id uuid default null,
  scoped_player_ids uuid[] default null,
  selected_game_id uuid default null,
  metric_key text default null,
  line_mode text default null,
  graph_mode text default null,
  opponent_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  rollup_payload jsonb;
  normalized_chart_key text := lower(coalesce(chart_key, 'default'));
  recognized_chart_keys text[] := array[
    'default',
    'elo',
    'prestige',
    'assists',
    'radar',
    'relationship_graph',
    'line_chart',
    'line',
    'multi_line_chart',
    'multi-line-chart',
    'multi-line',
    'prestige_over_time',
    'bar_chart',
    'bar',
    'bump_chart',
    'consistency_band',
    'heatmap',
    'efficiency_failure_scatter',
    'replay_chart',
    'rivalry_graph',
    'head_to_head',
    'sparkline',
    'stacked_bar_chart',
    'compare'
  ];
  stored_chart jsonb := null;
  fallback_title text := 'Analytics chart';
  fallback_subtitle text := 'Server-authored placeholder dataset.';
  fallback_empty_state jsonb := jsonb_build_object(
    'title', 'No chart data yet',
    'description', 'Finish at least one tracked game to populate this chart.'
  );
  effective_chart jsonb := '{}'::jsonb;
  effective_data jsonb := '{}'::jsonb;
  effective_generic_data jsonb := '{}'::jsonb;
  effective_points jsonb := '[]'::jsonb;
  effective_series jsonb := '[]'::jsonb;
  effective_meta jsonb := '{}'::jsonb;
  effective_generated_at jsonb := 'null'::jsonb;
  effective_point_count integer := 0;
  scoped_player_ids_jsonb jsonb := coalesce(to_jsonb(scoped_player_ids), '[]'::jsonb);
  exact_scope_player_ids_jsonb jsonb := case
    when coalesce(array_length(scoped_player_ids, 1), 0) >= 2 then coalesce(to_jsonb(scoped_player_ids), '[]'::jsonb)
    else '[]'::jsonb
  end;
  default_metric_key text := coalesce(metric_key, 'totalPrestige');
  default_line_mode text := coalesce(line_mode, 'raw');
  default_graph_mode text := coalesce(graph_mode, 'network');
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = get_chart_dataset.profile_id;

  if rollup_payload is not null and rollup_payload ? 'charts' then
    stored_chart := rollup_payload->'charts'->normalized_chart_key;
  end if;

  case normalized_chart_key
    when 'elo' then
      fallback_title := 'Elo trend';
      fallback_subtitle := 'Server-authored placeholder dataset for Elo.';
      fallback_empty_state := jsonb_build_object(
        'title', 'No Elo history yet',
        'description', 'Finish at least one tracked game to populate Elo history.'
      );
    when 'prestige' then
      fallback_title := 'Prestige totals';
      fallback_subtitle := 'Server-authored placeholder dataset for prestige.';
      fallback_empty_state := jsonb_build_object(
        'title', 'No prestige totals yet',
        'description', 'Finish at least one tracked game to populate prestige totals.'
      );
    when 'assists' then
      fallback_title := 'Assist volume';
      fallback_subtitle := 'Server-authored placeholder dataset for assists.';
      fallback_empty_state := jsonb_build_object(
        'title', 'No assist history yet',
        'description', 'Finish at least one tracked game to populate assist history.'
      );
    else
      null;
  end case;

  if jsonb_typeof(stored_chart) = 'object' then
    effective_chart := stored_chart;
  elsif rollup_payload is not null
    and normalized_chart_key = any(recognized_chart_keys)
    and jsonb_typeof(rollup_payload->'charts'->'default') = 'object' then
    effective_chart := rollup_payload->'charts'->'default';
  end if;

  if effective_chart ? 'generatedAt' then
    effective_generated_at := effective_chart->'generatedAt';
  elsif rollup_payload is not null and rollup_payload ? 'generatedAt' then
    effective_generated_at := rollup_payload->'generatedAt';
  else
    effective_generated_at := to_jsonb(now());
  end if;

  if jsonb_typeof(effective_chart->'data') = 'object' then
    effective_data := effective_chart->'data';
  end if;

  if jsonb_typeof(effective_data->'points') = 'array' then
    effective_points := effective_data->'points';
  end if;

  if jsonb_typeof(effective_data->'series') = 'array' then
    effective_series := effective_data->'series';
  end if;

  if jsonb_typeof(effective_data->'meta') = 'object' then
    effective_meta := effective_data->'meta';
  end if;

  effective_point_count := case
    when jsonb_typeof(effective_meta->'pointCount') = 'number' then
      (effective_meta->>'pointCount')::int
    else
      jsonb_array_length(effective_points)
  end;

  effective_meta := effective_meta || jsonb_build_object(
    'hasData', effective_point_count > 0,
    'pointCount', effective_point_count,
    'profileId', profile_id,
    'focusPlayerId', focus_player_id,
    'comparePlayerId', compare_player_id,
    'scopedPlayerIds', coalesce(to_jsonb(scoped_player_ids), '[]'::jsonb),
    'selectedGameId', selected_game_id,
    'metricKey', metric_key,
    'lineMode', line_mode,
    'graphMode', graph_mode,
    'opponentId', opponent_id
  );

  effective_generic_data := jsonb_build_object(
    'points', effective_points,
    'series', effective_series,
    'meta', effective_meta
  );

  effective_data := case
    when normalized_chart_key = 'elo' then jsonb_build_object(
      'games', case
        when jsonb_typeof(effective_data->'games') = 'array' then effective_data->'games'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end
    )
    when normalized_chart_key = 'radar' then jsonb_build_object(
      'primary', case
        when effective_data ? 'primary' then effective_data->'primary'
        else 'null'::jsonb
      end,
      'comparison', case
        when effective_data ? 'comparison' then effective_data->'comparison'
        else 'null'::jsonb
      end,
      'labels', case
        when jsonb_typeof(effective_data->'labels') = 'array' then effective_data->'labels'
        else '[]'::jsonb
      end
    )
    when normalized_chart_key = 'relationship_graph' then jsonb_build_object(
      'nodes', case
        when jsonb_typeof(effective_data->'nodes') = 'array' then effective_data->'nodes'
        else '[]'::jsonb
      end,
      'edges', case
        when jsonb_typeof(effective_data->'edges') = 'array' then effective_data->'edges'
        else '[]'::jsonb
      end,
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'exactScopePlayerIds', case
        when jsonb_typeof(effective_data->'exactScopePlayerIds') = 'array' then effective_data->'exactScopePlayerIds'
        else exact_scope_player_ids_jsonb
      end,
      'mode', to_jsonb(coalesce(effective_data->>'mode', default_graph_mode))
    )
    when normalized_chart_key in ('line_chart', 'line', 'multi_line_chart', 'multi-line-chart', 'multi-line', 'prestige_over_time') then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(
        coalesce(
          effective_data->>'statKey',
          case
            when normalized_chart_key = 'prestige_over_time' then 'totalPrestige'
            else default_metric_key
          end
        )
      ),
      'selectedPlayerIds', case
        when jsonb_typeof(effective_data->'selectedPlayerIds') = 'array' then effective_data->'selectedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'mode', to_jsonb(coalesce(effective_data->>'mode', default_line_mode))
    )
    when normalized_chart_key in ('bar_chart', 'bar') then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'bump_chart' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'selectedPlayerIds', case
        when jsonb_typeof(effective_data->'selectedPlayerIds') = 'array' then effective_data->'selectedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'consistency_band' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'selectedPlayerIds', case
        when jsonb_typeof(effective_data->'selectedPlayerIds') = 'array' then effective_data->'selectedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'heatmap' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'efficiency_failure_scatter' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'replay_chart' then jsonb_build_object(
      'replay', case
        when jsonb_typeof(effective_data->'replay') = 'array' then effective_data->'replay'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'statKey', to_jsonb(coalesce(effective_data->>'statKey', default_metric_key)),
      'selectedGameId', coalesce(effective_data->'selectedGameId', to_jsonb(selected_game_id))
    )
    when normalized_chart_key = 'rivalry_graph' then jsonb_build_object(
      'games', case
        when jsonb_typeof(effective_data->'games') = 'array' then effective_data->'games'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'playerId', coalesce(effective_data->'playerId', to_jsonb(focus_player_id))
    )
    when normalized_chart_key = 'head_to_head' then jsonb_build_object(
      'games', case
        when jsonb_typeof(effective_data->'games') = 'array' then effective_data->'games'
        else '[]'::jsonb
      end,
      'players', case
        when jsonb_typeof(effective_data->'players') = 'array' then effective_data->'players'
        else '[]'::jsonb
      end,
      'playerId', coalesce(effective_data->'playerId', to_jsonb(focus_player_id)),
      'compareId', coalesce(effective_data->'compareId', to_jsonb(compare_player_id))
    )
    when normalized_chart_key = 'sparkline' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'comparisonData', case
        when jsonb_typeof(effective_data->'comparisonData') = 'array' then effective_data->'comparisonData'
        else '[]'::jsonb
      end,
      'metricKey', to_jsonb(coalesce(effective_data->>'metricKey', default_metric_key)),
      'primaryLabel', case
        when effective_data ? 'primaryLabel' then effective_data->'primaryLabel'
        else 'null'::jsonb
      end,
      'comparisonLabel', case
        when effective_data ? 'comparisonLabel' then effective_data->'comparisonLabel'
        else 'null'::jsonb
      end
    )
    when normalized_chart_key = 'stacked_bar_chart' then jsonb_build_object(
      'data', case
        when jsonb_typeof(effective_data->'data') = 'array' then effective_data->'data'
        else '[]'::jsonb
      end,
      'metricDataMap', case
        when jsonb_typeof(effective_data->'metricDataMap') = 'object' then effective_data->'metricDataMap'
        else '{}'::jsonb
      end,
      'metricOptions', case
        when jsonb_typeof(effective_data->'metricOptions') = 'array' then effective_data->'metricOptions'
        else '[]'::jsonb
      end,
      'activeMetricKey', to_jsonb(coalesce(effective_data->>'activeMetricKey', default_metric_key)),
      'selectedPlayerIds', case
        when jsonb_typeof(effective_data->'selectedPlayerIds') = 'array' then effective_data->'selectedPlayerIds'
        else scoped_player_ids_jsonb
      end
    )
    when normalized_chart_key = 'compare' then jsonb_build_object(
      'focusPlayerId', coalesce(effective_data->'focusPlayerId', to_jsonb(focus_player_id)),
      'comparePlayerId', coalesce(effective_data->'comparePlayerId', to_jsonb(compare_player_id)),
      'scopedPlayerIds', case
        when jsonb_typeof(effective_data->'scopedPlayerIds') = 'array' then effective_data->'scopedPlayerIds'
        else scoped_player_ids_jsonb
      end,
      'rows', case
        when jsonb_typeof(effective_data->'rows') = 'array' then effective_data->'rows'
        else '[]'::jsonb
      end
    )
    else effective_generic_data
  end;

  return jsonb_build_object(
    'chartKey', normalized_chart_key,
    'generatedAt', effective_generated_at,
    'title', coalesce(effective_chart->>'title', fallback_title),
    'subtitle', coalesce(effective_chart->>'subtitle', fallback_subtitle),
    'emptyState', case
      when jsonb_typeof(effective_chart->'emptyState') = 'object' then effective_chart->'emptyState'
      else fallback_empty_state
    end,
    'data', effective_data
  );
end;
$$;

revoke all on function public.refresh_server_authored_analytics(uuid) from public;
revoke all on function public.refresh_server_authored_analytics(uuid) from anon;
revoke all on function public.get_analytics_home(uuid) from public;
revoke all on function public.get_analytics_home(uuid) from anon;
revoke all on function public.get_stats_screen(uuid) from public;
revoke all on function public.get_stats_screen(uuid) from anon;
revoke all on function public.get_insights_screen(uuid) from public;
revoke all on function public.get_insights_screen(uuid) from anon;
revoke all on function public.get_chart_setup(text, uuid) from public;
revoke all on function public.get_chart_setup(text, uuid) from anon;
revoke all on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) from public;
revoke all on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) from anon;

grant execute on function public.refresh_server_authored_analytics(uuid) to authenticated;
grant execute on function public.get_analytics_home(uuid) to authenticated;
grant execute on function public.get_stats_screen(uuid) to authenticated;
grant execute on function public.get_insights_screen(uuid) to authenticated;
grant execute on function public.get_chart_setup(text, uuid) to authenticated;
grant execute on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) to authenticated;
