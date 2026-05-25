create or replace function public.get_stats_screen(profile_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  target_profile_id uuid := profile_id;
  rollup_payload jsonb;
  response_payload jsonb;
  finished_game_count integer := 0;
  win_count integer := 0;
  avg_total_prestige numeric := 0;
  avg_direct_prestige numeric := 0;
  avg_assists numeric := 0;
  avg_table_size numeric := 0;
  best_prestige numeric := 0;
  total_tracked_prestige numeric := 0;
  avg_objective_share numeric := 0;
  avg_assist_share numeric := 0;
  contract_conversion numeric := 0;
  corr_direct numeric := 0;
  corr_assists numeric := 0;
  corr_objectives numeric := 0;
  corr_failures numeric := 0;
  latest_game_date text := null;
  latest_result text := null;
  playstyle_label text := 'Direct-driven';
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select rollup.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = target_profile_id;

  if rollup_payload is not null and rollup_payload ? 'statsScreen' then
    response_payload := rollup_payload->'statsScreen';
  else
    response_payload := jsonb_build_object(
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
            'id', target_profile_id,
            'label', 'Current player',
            'playerName', null,
            'displayName', null
          )
        ),
        'selectedPlayerId', target_profile_id,
        'detail', jsonb_build_object(
          'playerId', target_profile_id,
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
  end if;

  with table_sizes as (
    select
      game_id,
      count(*)::numeric as player_count
    from public.game_participants
    group by game_id
  ),
  player_games as (
    select
      gp.game_id,
      gp.total_prestige,
      gp.direct_prestige,
      gp.assist_prestige_received,
      gp.objective_prestige,
      gp.assists,
      gp.failures,
      gp.contracts,
      gp.is_winner,
      coalesce(table_sizes.player_count, 0) as player_count
    from public.game_participants as gp
    join public.games as g
      on g.id = gp.game_id
    left join table_sizes
      on table_sizes.game_id = gp.game_id
    where gp.profile_id = target_profile_id
      and g.status = 'finished'
  )
  select
    count(*)::int,
    coalesce(sum(case when player_games.is_winner then 1 else 0 end), 0)::int,
    coalesce(avg(player_games.total_prestige), 0),
    coalesce(avg(player_games.direct_prestige), 0),
    coalesce(avg(player_games.assists), 0),
    coalesce(avg(player_games.player_count), 0),
    coalesce(max(player_games.total_prestige), 0),
    coalesce(sum(player_games.total_prestige), 0),
    coalesce(
      avg(
        case
          when player_games.total_prestige > 0 then player_games.objective_prestige / player_games.total_prestige
          else 0
        end
      ),
      0
    ),
    coalesce(
      avg(
        case
          when player_games.total_prestige > 0 then player_games.assist_prestige_received / player_games.total_prestige
          else 0
        end
      ),
      0
    ),
    coalesce(
      sum(player_games.contracts)::numeric / nullif(sum(player_games.contracts + player_games.failures), 0),
      0
    ),
    coalesce(
      corr(
        player_games.direct_prestige::double precision,
        case when player_games.is_winner then 1::double precision else 0::double precision end
      )::numeric,
      0
    ),
    coalesce(
      corr(
        player_games.assists::double precision,
        case when player_games.is_winner then 1::double precision else 0::double precision end
      )::numeric,
      0
    ),
    coalesce(
      corr(
        player_games.objective_prestige::double precision,
        case when player_games.is_winner then 1::double precision else 0::double precision end
      )::numeric,
      0
    ),
    coalesce(
      corr(
        player_games.failures::double precision,
        case when player_games.is_winner then 1::double precision else 0::double precision end
      )::numeric,
      0
    )
  into
    finished_game_count,
    win_count,
    avg_total_prestige,
    avg_direct_prestige,
    avg_assists,
    avg_table_size,
    best_prestige,
    total_tracked_prestige,
    avg_objective_share,
    avg_assist_share,
    contract_conversion,
    corr_direct,
    corr_assists,
    corr_objectives,
    corr_failures
  from player_games;

  select
    to_char(coalesce(g.finished_at, g.created_at) at time zone 'UTC', 'YYYY-MM-DD'),
    case
      when gp.is_winner then 'Won latest tracked game'
      else 'Finished latest tracked game'
    end
  into latest_game_date, latest_result
  from public.game_participants as gp
  join public.games as g
    on g.id = gp.game_id
  where gp.profile_id = target_profile_id
    and g.status = 'finished'
  order by coalesce(g.finished_at, g.created_at) desc, g.created_at desc
  limit 1;

  if finished_game_count > 0 then
    playstyle_label := case
      when avg_assist_share >= 0.33 then 'Support-leaning'
      when avg_objective_share >= 0.20 then 'Objective-heavy'
      when contract_conversion >= 0.62 then 'Conversion-first'
      else 'Direct-driven'
    end;

    response_payload := jsonb_set(
      response_payload,
      '{players,detail}',
      jsonb_build_object(
        'playerId', target_profile_id,
        'label', coalesce(response_payload #>> '{players,detail,label}', 'Current player'),
        'summary', format(
          'Server-authored player detail across %s finished game%s.',
          finished_game_count,
          case when finished_game_count = 1 then '' else 's' end
        ),
        'stats', jsonb_build_object(
          'games', finished_game_count,
          'wins', win_count,
          'winRate', concat(round((win_count::numeric / finished_game_count) * 100), '%'),
          'avgPrestige', round(avg_total_prestige, 1),
          'contractConversion', concat(round(contract_conversion * 100), '%')
        )
      ),
      true
    );

    response_payload := jsonb_set(
      response_payload,
      '{playstyle}',
      jsonb_build_object(
        'summary', format(
          '%s profile across %s finished game%s.',
          playstyle_label,
          finished_game_count,
          case when finished_game_count = 1 then '' else 's' end
        ),
        'highlights', jsonb_build_array(
          jsonb_build_object(
            'key', 'win-rate',
            'label', 'Win rate',
            'value', concat(round((win_count::numeric / finished_game_count) * 100), '%')
          ),
          jsonb_build_object(
            'key', 'direct-prestige-per-game',
            'label', 'Direct prestige / game',
            'value', round(avg_direct_prestige, 1)
          ),
          jsonb_build_object(
            'key', 'assists-per-game',
            'label', 'Assists / game',
            'value', round(avg_assists, 1)
          ),
          jsonb_build_object(
            'key', 'objective-share',
            'label', 'Objective share',
            'value', concat(round(avg_objective_share * 100), '%')
          )
        )
      ),
      true
    );

    response_payload := jsonb_set(
      response_payload,
      '{games}',
      jsonb_build_object(
        'items', jsonb_build_array(
          jsonb_build_object(
            'key', 'latest-finish',
            'label', 'Latest tracked game',
            'value', case
              when latest_game_date is null then 'Tracked game recorded'
              else latest_result || ' on ' || latest_game_date
            end
          ),
          jsonb_build_object(
            'key', 'wins',
            'label', 'Wins',
            'value', concat(win_count, ' / ', finished_game_count)
          ),
          jsonb_build_object(
            'key', 'avg-table-size',
            'label', 'Average table size',
            'value', round(avg_table_size, 1)
          ),
          jsonb_build_object(
            'key', 'best-prestige',
            'label', 'Best prestige',
            'value', round(best_prestige, 1)
          )
        ),
        'selectedGameId', null,
        'detail', jsonb_build_object(
          'latestGameDate', latest_game_date,
          'latestResult', latest_result,
          'trackedPrestige', round(total_tracked_prestige, 1)
        )
      ),
      true
    );
  end if;

  if finished_game_count >= 2 then
    response_payload := jsonb_set(
      response_payload,
      '{correlations}',
      jsonb_build_object(
        'summary', 'Outcome signals derived from your finished Supabase participant rows.',
        'items', jsonb_build_array(
          jsonb_build_object(
            'key', 'direct-prestige-vs-wins',
            'label', 'Direct prestige vs wins',
            'value', round(corr_direct, 2),
            'strength', case
              when abs(corr_direct) >= 0.5 then 'Strong'
              when abs(corr_direct) >= 0.25 then 'Moderate'
              else 'Light'
            end
          ),
          jsonb_build_object(
            'key', 'assists-vs-wins',
            'label', 'Assist volume vs wins',
            'value', round(corr_assists, 2),
            'strength', case
              when abs(corr_assists) >= 0.5 then 'Strong'
              when abs(corr_assists) >= 0.25 then 'Moderate'
              else 'Light'
            end
          ),
          jsonb_build_object(
            'key', 'objective-prestige-vs-wins',
            'label', 'Objective prestige vs wins',
            'value', round(corr_objectives, 2),
            'strength', case
              when abs(corr_objectives) >= 0.5 then 'Strong'
              when abs(corr_objectives) >= 0.25 then 'Moderate'
              else 'Light'
            end
          ),
          jsonb_build_object(
            'key', 'failures-vs-wins',
            'label', 'Failures vs wins',
            'value', round(corr_failures, 2),
            'strength', case
              when abs(corr_failures) >= 0.5 then 'Strong'
              when abs(corr_failures) >= 0.25 then 'Moderate'
              else 'Light'
            end
          )
        ),
        'selectedKey', null
      ),
      true
    );
  end if;

  return response_payload;
end;
$$;
