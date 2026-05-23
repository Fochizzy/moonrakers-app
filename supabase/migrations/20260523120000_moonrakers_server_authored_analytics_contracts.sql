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
security definer
set search_path = ''
as $$
declare
  generated_at timestamptz := now();
  registered_player_count integer := 0;
  finished_game_count integer := 0;
  player_row_count integer := 0;
  base_chart_data jsonb := '[]'::jsonb;
  analytics_payload jsonb;
begin
  if target_profile_id is null or target_profile_id <> (select auth.uid()) then
    raise exception 'target_profile_id must match the authenticated profile';
  end if;

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
    base_chart_data := jsonb_build_array(
      jsonb_build_object(
        'x', 1,
        'y', finished_game_count,
        'label', 'Tracked games'
      )
    );
  end if;

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
      'players', '[]'::jsonb,
      'playstyle', jsonb_build_object(
        'summary', case
          when finished_game_count > 0 then 'More player-specific playstyle rollups can be layered onto this payload.'
          else 'Finish at least one tracked game to populate player-specific playstyle insights.'
        end,
        'highlights', '[]'::jsonb
      ),
      'correlations', '[]'::jsonb,
      'games', '[]'::jsonb
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
      'correlations', '[]'::jsonb
    ),
    'charts', jsonb_build_object(
      'default', jsonb_build_object(
        'chartKey', 'default',
        'generatedAt', generated_at,
        'title', 'Analytics chart',
        'subtitle', 'Server-authored placeholder dataset.',
        'emptyState', 'No chart data is available yet.',
        'data', base_chart_data
      ),
      'elo', jsonb_build_object(
        'chartKey', 'elo',
        'generatedAt', generated_at,
        'title', 'Elo trend',
        'subtitle', 'Server-authored placeholder dataset for Elo.',
        'emptyState', 'No Elo history is available yet.',
        'data', base_chart_data
      ),
      'prestige', jsonb_build_object(
        'chartKey', 'prestige',
        'generatedAt', generated_at,
        'title', 'Prestige totals',
        'subtitle', 'Server-authored placeholder dataset for prestige.',
        'emptyState', 'No prestige totals are available yet.',
        'data', base_chart_data
      ),
      'assists', jsonb_build_object(
        'chartKey', 'assists',
        'generatedAt', generated_at,
        'title', 'Assist volume',
        'subtitle', 'Server-authored placeholder dataset for assists.',
        'emptyState', 'No assist history is available yet.',
        'data', base_chart_data
      )
    )
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
security invoker
set search_path = public
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

  select public.personal_stats_rollups.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = profile_id;

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

  select public.personal_stats_rollups.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = profile_id;

  if rollup_payload is not null and rollup_payload ? 'statsScreen' then
    return rollup_payload->'statsScreen';
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'overview', jsonb_build_object(
      'hero', jsonb_build_object(
        'title', 'Stats overview',
        'takeaway', 'No stats rollup is available yet.'
      ),
      'cards', '[]'::jsonb,
      'topSignals', '[]'::jsonb
    ),
    'players', '[]'::jsonb,
    'playstyle', jsonb_build_object(
      'summary', 'No playstyle data is available yet.',
      'highlights', '[]'::jsonb
    ),
    'correlations', '[]'::jsonb,
    'games', '[]'::jsonb
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

  select public.personal_stats_rollups.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = profile_id;

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
    'correlations', '[]'::jsonb
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
begin
  if profile_id is null or profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  select public.personal_stats_rollups.payload
  into rollup_payload
  from public.personal_stats_rollups as rollup
  where rollup.profile_id = profile_id;

  if rollup_payload is not null and rollup_payload ? 'charts' then
    case normalized_chart_key
      when 'elo' then
        return coalesce(
          rollup_payload->'charts'->'elo',
          rollup_payload->'charts'->'default'
        );
      when 'prestige' then
        return coalesce(
          rollup_payload->'charts'->'prestige',
          rollup_payload->'charts'->'default'
        );
      when 'assists' then
        return coalesce(
          rollup_payload->'charts'->'assists',
          rollup_payload->'charts'->'default'
        );
      else
        return coalesce(
          rollup_payload->'charts'->normalized_chart_key,
          rollup_payload->'charts'->'default'
        );
    end case;
  end if;

  case normalized_chart_key
    when 'elo' then
      return jsonb_build_object(
        'chartKey', 'elo',
        'generatedAt', now(),
        'title', 'Elo trend',
        'subtitle', 'Server-authored placeholder dataset for Elo.',
        'emptyState', 'No Elo history is available yet.',
        'data', '[]'::jsonb
      );
    when 'prestige' then
      return jsonb_build_object(
        'chartKey', 'prestige',
        'generatedAt', now(),
        'title', 'Prestige totals',
        'subtitle', 'Server-authored placeholder dataset for prestige.',
        'emptyState', 'No prestige totals are available yet.',
        'data', '[]'::jsonb
      );
    when 'assists' then
      return jsonb_build_object(
        'chartKey', 'assists',
        'generatedAt', now(),
        'title', 'Assist volume',
        'subtitle', 'Server-authored placeholder dataset for assists.',
        'emptyState', 'No assist history is available yet.',
        'data', '[]'::jsonb
      );
    else
      return jsonb_build_object(
        'chartKey', normalized_chart_key,
        'generatedAt', now(),
        'title', 'Analytics chart',
        'subtitle', 'Server-authored placeholder dataset.',
        'emptyState', 'No chart data is available yet.',
        'data', '[]'::jsonb
      );
  end case;
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
revoke all on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) from public;
revoke all on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) from anon;

grant execute on function public.refresh_server_authored_analytics(uuid) to authenticated;
grant execute on function public.get_analytics_home(uuid) to authenticated;
grant execute on function public.get_stats_screen(uuid) to authenticated;
grant execute on function public.get_insights_screen(uuid) to authenticated;
grant execute on function public.get_chart_dataset(text, uuid, uuid, uuid, uuid[], uuid, text, text, text, uuid) to authenticated;
