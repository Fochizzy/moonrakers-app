create or replace function public.get_player_profile_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null,
  opponent_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  generated_at timestamptz := now();
  elo_payload jsonb := '{}'::jsonb;
  selected_player_id uuid := null;
  selected_opponent_id uuid := null;
  selected_summary jsonb := null;
  selected_player_option jsonb := null;
  player_options jsonb := '[]'::jsonb;
  opponent_options jsonb := '[]'::jsonb;
  top_opponent_options jsonb := '[]'::jsonb;
  top_cards jsonb := '[]'::jsonb;
  tabs jsonb := '{}'::jsonb;
  tab_insights jsonb := '{}'::jsonb;
  profile_insight jsonb := null;
  active_insight jsonb := null;
  recent_games jsonb := '[]'::jsonb;
  hero jsonb := null;
  moonrakers_intel jsonb := null;
  total_games integer := 0;
  total_wins integer := 0;
  win_rate numeric := 0;
  current_elo integer := 1000;
  peak_elo integer := 1000;
  player_name text := 'Player';
  player_color text := null;
  player_card_art_index integer := null;
  opponent_name text := null;
  direct_per_game numeric := 0;
  assist_received_per_game numeric := 0;
  objective_points_per_game numeric := 0;
  base_turns_per_game numeric := 0;
  base_rate numeric := 0;
  win_rate_with_base numeric := 0;
  win_rate_without_base numeric := 0;
  prestige_with_base numeric := 0;
  prestige_without_base numeric := 0;
  assists_given_per_game numeric := 0;
  assist_events_count integer := 0;
  timed_assist_events_count integer := 0;
  inferred_assist_events_count integer := 0;
  assist_prestige_gained numeric := 0;
  assist_prestige_per_assist numeric := 0;
  assist_gap_to_leader numeric := 0;
  assist_gap_to_target numeric := 0;
  assists_at_six_plus integer := 0;
  assists_over_five_behind_leader integer := 0;
  tracked_games_label text := '0 tracked games';
  assist_events_label text := '0 assists';
  timed_assist_events_label text := '0 timed assists';
  import_health_label text := 'No assist context';
  import_health_tone text := 'red';
  import_health_sub_label text := 'No tracked or inferred assist data for this profile.';
  best_condition jsonb := null;
  worst_condition jsonb := null;
  best_support_partner jsonb := null;
  most_common_assist_target jsonb := null;
  support_style text := 'Balanced';
  style_read text := 'Balanced';
  games_with_objectives integer := 0;
  high_objective_games integer := 0;
  win_rate_with_objectives numeric := 0;
  win_rate_without_objectives numeric := 0;
  prestige_with_objectives numeric := 0;
  moonrakers_game_count integer := 0;
begin
  if profile_id is null or profile_id <> auth.uid() then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  elo_payload := public.get_elo_screen(profile_id, focus_player_id, opponent_id, 'elo');
  selected_player_id := nullif(elo_payload->>'selectedPlayerId', '')::uuid;
  selected_opponent_id := nullif(elo_payload->>'selectedOpponentId', '')::uuid;
  player_options := coalesce(elo_payload->'playerOptions', '[]'::jsonb);
  selected_summary := elo_payload->'summary';
  top_cards := coalesce(elo_payload->'topCards', '[]'::jsonb);
  tabs := coalesce(elo_payload->'sections', '{}'::jsonb);
  tab_insights := coalesce(elo_payload->'insights', '{}'::jsonb);

  if selected_player_id is null then
    return jsonb_build_object(
      'generatedAt', generated_at,
      'selectedPlayerId', null,
      'selectedOpponentId', null,
      'playerOptions', player_options,
      'hero', jsonb_build_object(
        'id', null,
        'name', 'Player',
        'color', null,
        'assignedCardArtIndex', null,
        'currentElo', 1000,
        'peakElo', 1000,
        'winRate', 0,
        'totalWins', 0,
        'totalGames', 0
      ),
      'quickActions', jsonb_build_object(
        'compareLabel', 'Compare with...',
        'chartsLabel', 'Open charts',
        'recentGamesLabel', 'Recent games'
      ),
      'topCards', top_cards,
      'activeInsight', null,
      'profileInsight', jsonb_build_object(
        'title', 'No player selected',
        'body', 'Choose a player from the shared analytics directory to load a full server-authored profile.'
      ),
      'tabs', tabs,
      'tabInsights', tab_insights,
      'moonrakersIntel', jsonb_build_object(
        'hasData', false,
        'emptyTitle', 'Not enough Moonrakers data yet',
        'emptyBody', 'Finish or import a few more games to unlock player-specific playstyle reads.'
      ),
      'opponentOptions', '[]'::jsonb,
      'topOpponentOptions', '[]'::jsonb,
      'recentGames', '[]'::jsonb,
      'emptyState', jsonb_build_object(
        'title', 'No player profile yet',
        'description', 'The shared analytics payload does not currently expose a player profile for this account.'
      )
    );
  end if;

  select entry
  into selected_player_option
  from jsonb_array_elements(player_options) as entry
  where nullif(entry->>'id', '')::uuid = selected_player_id
  limit 1;

  player_name := coalesce(
    nullif(selected_summary->>'name', ''),
    nullif(selected_player_option->>'name', ''),
    nullif(selected_player_option->>'label', ''),
    'Player'
  );
  player_color := nullif(selected_player_option->>'color', '');
  player_card_art_index := nullif(selected_player_option->>'assignedCardArtIndex', '')::integer;
  current_elo := coalesce(nullif(selected_summary->>'currentElo', '')::integer, 1000);
  peak_elo := coalesce(nullif(selected_summary->>'peakElo', '')::integer, current_elo);

  select
    count(*)::int,
    count(*) filter (where gp.is_winner)::int,
    coalesce(
      count(*) filter (where gp.is_winner)::numeric / nullif(count(*)::numeric, 0),
      0
    )::numeric
  into total_games, total_wins, win_rate
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id
  where gp.profile_id = selected_player_id
    and g.status = 'finished'
    and (
      selected_opponent_id is null or exists (
        select 1
        from public.game_participants as other_gp
        where other_gp.game_id = gp.game_id
          and other_gp.profile_id = selected_opponent_id
      )
    );

  if selected_opponent_id is not null then
    select coalesce(nullif(p.display_name, ''), p.player_name, 'Player')
    into opponent_name
    from public.profiles as p
    where p.id = selected_opponent_id
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', shared.opponent_id,
        'name', shared.opponent_name,
        'label', shared.opponent_name,
        'displayName', shared.opponent_display_name,
        'playerName', shared.opponent_player_name,
        'color', shared.favorite_color,
        'assignedCardArtIndex', shared.assigned_card_art_index,
        'gamesPlayed', shared.games_together,
        'currentElo', coalesce(nullif(shared.current_elo_text, '')::integer, 1000)
      )
      order by shared.games_together desc, lower(shared.opponent_name) asc, shared.opponent_id
    ),
    '[]'::jsonb
  )
  into opponent_options
  from (
    select
      other_profile.id as opponent_id,
      coalesce(nullif(other_profile.display_name, ''), other_profile.player_name, 'Player') as opponent_name,
      nullif(other_profile.display_name, '') as opponent_display_name,
      other_profile.player_name as opponent_player_name,
      other_profile.favorite_color,
      other_profile.assigned_card_art_index,
      count(distinct g.id)::int as games_together,
      max(player_option->>'currentElo') as current_elo_text
    from public.game_participants as gp
    join public.games as g on g.id = gp.game_id and g.status = 'finished'
    join public.game_participants as other_gp
      on other_gp.game_id = gp.game_id
      and other_gp.profile_id is not null
      and other_gp.profile_id <> gp.profile_id
    join public.profiles as other_profile on other_profile.id = other_gp.profile_id
    left join lateral jsonb_array_elements(player_options) as player_option
      on nullif(player_option->>'id', '')::uuid = other_profile.id
    where gp.profile_id = selected_player_id
    group by
      other_profile.id,
      other_profile.display_name,
      other_profile.player_name,
      other_profile.favorite_color,
      other_profile.assigned_card_art_index
  ) as shared;

  select coalesce(
    jsonb_agg(entry order by ordinality),
    '[]'::jsonb
  )
  into top_opponent_options
  from (
    select entry, ordinality
    from jsonb_array_elements(opponent_options) with ordinality as entry(entry, ordinality)
    order by coalesce(nullif(entry->>'gamesPlayed', '')::integer, 0) desc, lower(coalesce(entry->>'label', entry->>'name', 'player')) asc
    limit 4
  ) as top_entries;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'gameId', g.id,
        'createdAt', g.created_at,
        'finishedAt', g.finished_at,
        'winnerId', g.winner_profile_id,
        'groupId', g.group_id,
        'groupName', g.group_name_snapshot,
        'players', coalesce(participant_payload.players, '[]'::jsonb)
      )
      order by coalesce(g.finished_at, g.created_at) desc, g.id desc
    ),
    '[]'::jsonb
  )
  into recent_games
  from public.games as g
  join public.game_participants as focus_gp
    on focus_gp.game_id = g.id
    and focus_gp.profile_id = selected_player_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', gp.profile_id,
        'name', coalesce(nullif(gp.display_name_snapshot, ''), gp.player_name_snapshot, 'Player'),
        'color', gp.color_snapshot,
        'assignedCardArtIndex', gp.assigned_card_art_index_snapshot,
        'startOrder', gp.start_order
      )
      order by gp.start_order asc, gp.profile_id asc
    ) as players
    from public.game_participants as gp
    where gp.game_id = g.id
  ) as participant_payload on true
  where g.status = 'finished'
    and (
      selected_opponent_id is null or exists (
        select 1
        from public.game_participants as other_gp
        where other_gp.game_id = g.id
          and other_gp.profile_id = selected_opponent_id
      )
    )
  order by coalesce(g.finished_at, g.created_at) desc, g.id desc
  limit 60;

  select count(*)::int into moonrakers_game_count
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id
  where gp.profile_id = selected_player_id
    and g.status = 'finished';

  if moonrakers_game_count < 3 then
    moonrakers_intel := jsonb_build_object(
      'hasData', false,
      'emptyTitle', 'Not enough Moonrakers data yet',
      'emptyBody', 'Finish or import a few more games to unlock player-specific playstyle reads.'
    );
  else
    with player_games as (
      select
        g.id as game_id,
        g.winner_profile_id,
        gp.total_prestige,
        gp.direct_prestige,
        gp.assist_prestige_received,
        gp.objective_prestige,
        gp.assists,
        gp.failures,
        gp.contracts,
        gp.start_order,
        count(*) over (partition by g.id) as table_size
      from public.games as g
      join public.game_participants as gp on gp.game_id = g.id
      where gp.profile_id = selected_player_id
        and g.status = 'finished'
    ),
    per_game_base as (
      select
        gp.game_id,
        count(*)::int as total_turns,
        count(*) filter (
          where coalesce(gr.contracts, 0) = 0
            and coalesce(gr.failures, 0) = 0
            and coalesce(gr.objective_count, 0) = 0
            and coalesce(gr.objective_prestige, 0) = 0
        )::int as base_turns
      from player_games as gp
      left join public.game_rounds as gr
        on gr.game_id = gp.game_id
        and gr.participant_id in (
          select gp2.id
          from public.game_participants as gp2
          where gp2.game_id = gp.game_id
            and gp2.profile_id = selected_player_id
          limit 1
        )
      group by gp.game_id
    ),
    objective_games as (
      select
        count(*) filter (where coalesce(objective_prestige, 0) > 0)::int as with_objectives,
        count(*) filter (where coalesce(objective_prestige, 0) >= 2)::int as high_objectives,
        coalesce(avg(total_prestige) filter (where coalesce(objective_prestige, 0) > 0), 0)::numeric as prestige_with_objectives,
        coalesce(
          avg(case when winner_profile_id = selected_player_id then 1 else 0 end) filter (where coalesce(objective_prestige, 0) > 0),
          0
        )::numeric as win_rate_with_objectives,
        coalesce(
          avg(case when winner_profile_id = selected_player_id then 1 else 0 end) filter (where coalesce(objective_prestige, 0) = 0),
          0
        )::numeric as win_rate_without_objectives
      from player_games
    ),
    condition_candidates as (
      select
        case when table_size >= 5 then 'in 5p+' else format('in %sp', table_size) end as label,
        count(*)::int as sample_size,
        coalesce(avg(case when winner_profile_id = selected_player_id then 1 else 0 end), 0)::numeric as win_rate_value,
        coalesce(avg(total_prestige), 0)::numeric as avg_prestige_value
      from player_games
      group by case when table_size >= 5 then 'in 5p+' else format('in %sp', table_size) end
      having count(*) >= 3

      union all

      select
        case
          when start_order = 0 then 'from Early Seat'
          when start_order = table_size - 1 then 'from Late Seat'
          else 'from Middle Seat'
        end as label,
        count(*)::int as sample_size,
        coalesce(avg(case when winner_profile_id = selected_player_id then 1 else 0 end), 0)::numeric as win_rate_value,
        coalesce(avg(total_prestige), 0)::numeric as avg_prestige_value
      from player_games
      group by
        case
          when start_order = 0 then 'from Early Seat'
          when start_order = table_size - 1 then 'from Late Seat'
          else 'from Middle Seat'
        end
      having count(*) >= 3
    ),
    best_condition_candidate as (
      select *
      from condition_candidates
      order by win_rate_value desc, avg_prestige_value desc, label asc
      limit 1
    ),
    worst_condition_candidate as (
      select *
      from condition_candidates
      order by win_rate_value asc, avg_prestige_value asc, label asc
      limit 1
    ),
    support_partner_candidates as (
      select
        other_profile.id as player_id,
        coalesce(nullif(other_profile.display_name, ''), other_profile.player_name, 'Player') as player_name,
        count(distinct g.id)::int as sample_size,
        count(distinct g.id) filter (where g.winner_profile_id = selected_player_id)::int as wins,
        coalesce(avg(selected_gp.total_prestige), 0)::numeric as avg_prestige_value
      from public.games as g
      join public.game_participants as selected_gp
        on selected_gp.game_id = g.id
        and selected_gp.profile_id = selected_player_id
      join public.game_participants as other_gp
        on other_gp.game_id = g.id
        and other_gp.profile_id is not null
        and other_gp.profile_id <> selected_player_id
      join public.profiles as other_profile on other_profile.id = other_gp.profile_id
      where g.status = 'finished'
      group by other_profile.id, other_profile.display_name, other_profile.player_name
      having count(distinct g.id) >= 3
    ),
    assist_target_candidates as (
      select
        recipient.key::uuid as player_id,
        coalesce(nullif(profile.display_name, ''), profile.player_name, 'Player') as player_name,
        sum((recipient.value)::int)::int as assists_sent,
        count(distinct gr.game_id)::int as sample_size
      from public.games as g
      join public.game_participants as gp
        on gp.game_id = g.id
        and gp.profile_id = selected_player_id
      join public.game_rounds as gr on gr.game_id = g.id and gr.participant_id = gp.id
      join lateral jsonb_each_text(coalesce(gr.assist_recipients, '{}'::jsonb)) as recipient(key, value) on true
      left join public.profiles as profile on profile.id = recipient.key::uuid
      where g.status = 'finished'
      group by recipient.key, profile.display_name, profile.player_name
    ),
    assist_context as (
      select
        coalesce(sum((recipient.value)::int), 0)::int as assist_events,
        coalesce(sum((prestige_recipient.value)::numeric), 0)::numeric as assist_prestige_gained_value,
        coalesce(avg(leader.max_prestige - selected_gp.total_prestige), 0)::numeric as assist_gap_to_leader_value,
        coalesce(avg(coalesce(recipient_gp.total_prestige, selected_gp.total_prestige) - selected_gp.total_prestige), 0)::numeric as assist_gap_to_target_value,
        coalesce(sum(case when coalesce(recipient_gp.total_prestige, 0) >= 6 then (recipient.value)::int else 0 end), 0)::int as assists_at_six_plus_count,
        coalesce(sum(case when leader.max_prestige - selected_gp.total_prestige > 5 then (recipient.value)::int else 0 end), 0)::int as assists_over_five_behind_leader_count,
        count(*)::int as timed_events
      from public.games as g
      join public.game_participants as selected_gp
        on selected_gp.game_id = g.id
        and selected_gp.profile_id = selected_player_id
      join public.game_rounds as gr on gr.game_id = g.id and gr.participant_id = selected_gp.id
      join lateral jsonb_each_text(coalesce(gr.assist_recipients, '{}'::jsonb)) as recipient(key, value) on true
      left join lateral jsonb_each_text(coalesce(gr.assist_prestige_recipients, '{}'::jsonb)) as prestige_recipient(key, value)
        on prestige_recipient.key = recipient.key
      left join public.game_participants as recipient_gp
        on recipient_gp.game_id = g.id
        and recipient_gp.profile_id = recipient.key::uuid
      left join lateral (
        select max(other_gp.total_prestige)::numeric as max_prestige
        from public.game_participants as other_gp
        where other_gp.game_id = g.id
      ) as leader on true
      where g.status = 'finished'
    )
    select
      coalesce(avg(player_games.direct_prestige), 0)::numeric,
      coalesce(avg(player_games.assist_prestige_received), 0)::numeric,
      coalesce(avg(player_games.objective_prestige), 0)::numeric,
      coalesce(avg(per_game_base.base_turns), 0)::numeric,
      coalesce(sum(per_game_base.base_turns)::numeric / nullif(sum(per_game_base.total_turns)::numeric, 0), 0)::numeric,
      coalesce(
        avg(case when per_game_base.base_turns > 0 and player_games.winner_profile_id = selected_player_id then 1 else 0 end),
        0
      )::numeric,
      coalesce(
        avg(case when per_game_base.base_turns = 0 and player_games.winner_profile_id = selected_player_id then 1 else 0 end),
        0
      )::numeric,
      coalesce(avg(player_games.total_prestige) filter (where per_game_base.base_turns > 0), 0)::numeric,
      coalesce(avg(player_games.total_prestige) filter (where per_game_base.base_turns = 0), 0)::numeric,
      coalesce(avg(player_games.assists), 0)::numeric,
      objective_games.with_objectives,
      objective_games.high_objectives,
      objective_games.win_rate_with_objectives,
      objective_games.win_rate_without_objectives,
      objective_games.prestige_with_objectives,
      assist_context.assist_events,
      assist_context.timed_events,
      greatest(coalesce(round(avg(player_games.assists))::int, 0), assist_context.assist_events) - assist_context.timed_events,
      assist_context.assist_prestige_gained_value,
      case
        when assist_context.assist_events > 0
          then assist_context.assist_prestige_gained_value / assist_context.assist_events::numeric
        else 0::numeric
      end,
      assist_context.assist_gap_to_leader_value,
      assist_context.assist_gap_to_target_value,
      assist_context.assists_at_six_plus_count,
      assist_context.assists_over_five_behind_leader_count
    into
      direct_per_game,
      assist_received_per_game,
      objective_points_per_game,
      base_turns_per_game,
      base_rate,
      win_rate_with_base,
      win_rate_without_base,
      prestige_with_base,
      prestige_without_base,
      assists_given_per_game,
      games_with_objectives,
      high_objective_games,
      win_rate_with_objectives,
      win_rate_without_objectives,
      prestige_with_objectives,
      assist_events_count,
      timed_assist_events_count,
      inferred_assist_events_count,
      assist_prestige_gained,
      assist_prestige_per_assist,
      assist_gap_to_leader,
      assist_gap_to_target,
      assists_at_six_plus,
      assists_over_five_behind_leader
    from player_games
    left join per_game_base on per_game_base.game_id = player_games.game_id
    cross join objective_games
    cross join assist_context;

    select jsonb_build_object(
      'label', label,
      'winRate', win_rate_value,
      'avgPrestige', avg_prestige_value,
      'sampleSize', sample_size,
      'winRateLabel', concat(round(win_rate_value * 100)::int, '%'),
      'avgPrestigeLabel', trim(to_char(avg_prestige_value, 'FM999990.0')),
      'sampleSizeLabel', format('%s games', sample_size)
    )
    into best_condition
    from best_condition_candidate;

    select jsonb_build_object(
      'label', label,
      'winRate', win_rate_value,
      'avgPrestige', avg_prestige_value,
      'sampleSize', sample_size,
      'winRateLabel', concat(round(win_rate_value * 100)::int, '%'),
      'avgPrestigeLabel', trim(to_char(avg_prestige_value, 'FM999990.0')),
      'sampleSizeLabel', format('%s games', sample_size)
    )
    into worst_condition
    from worst_condition_candidate;

    select jsonb_build_object(
      'playerId', player_id,
      'playerName', player_name,
      'winRate', coalesce(wins::numeric / nullif(sample_size::numeric, 0), 0),
      'avgPrestige', avg_prestige_value,
      'sampleSize', sample_size,
      'winRateLabel', concat(round(coalesce(wins::numeric / nullif(sample_size::numeric, 0), 0) * 100)::int, '%'),
      'avgPrestigeLabel', trim(to_char(avg_prestige_value, 'FM999990.0')),
      'sampleSizeLabel', format('%s games', sample_size)
    )
    into best_support_partner
    from support_partner_candidates
    order by coalesce(wins::numeric / nullif(sample_size::numeric, 0), 0) desc, avg_prestige_value desc, lower(player_name) asc
    limit 1;

    select jsonb_build_object(
      'playerId', player_id,
      'playerName', player_name,
      'assistsSent', assists_sent,
      'sampleSize', sample_size,
      'assistsSentLabel', format('%s assists', assists_sent),
      'sampleSizeLabel', format('%s games', sample_size)
    )
    into most_common_assist_target
    from assist_target_candidates
    order by assists_sent desc, lower(player_name) asc
    limit 1;

    if direct_per_game >= assist_received_per_game + 0.75 and direct_per_game >= objective_points_per_game + 0.75 then
      style_read := 'Direct';
    elsif assist_received_per_game >= direct_per_game + 0.75 and assist_received_per_game >= objective_points_per_game + 0.75 then
      style_read := 'Support';
    elsif objective_points_per_game >= direct_per_game + 0.75 and objective_points_per_game >= assist_received_per_game + 0.75 then
      style_read := 'Objective';
    else
      style_read := 'Balanced';
    end if;

    if assists_given_per_game - assist_received_per_game >= 0.5 then
      support_style := 'Giver';
    elsif assist_received_per_game - assists_given_per_game >= 0.5 then
      support_style := 'Receiver';
    else
      support_style := 'Balanced';
    end if;

    tracked_games_label := format('%s tracked %s', moonrakers_game_count, case when moonrakers_game_count = 1 then 'game' else 'games' end);
    assist_events_label := format('%s %s', assist_events_count, case when assist_events_count = 1 then 'assist' else 'assists' end);
    timed_assist_events_label := format('%s timed %s', timed_assist_events_count, case when timed_assist_events_count = 1 then 'assist' else 'assists' end);

    if assist_events_count <= 0 and inferred_assist_events_count <= 0 then
      import_health_label := 'No assist context';
      import_health_tone := 'red';
      import_health_sub_label := 'No tracked or inferred assist data for this profile.';
    elsif timed_assist_events_count > 0 and inferred_assist_events_count <= 0 then
      import_health_label := 'Exact assist timing';
      import_health_tone := 'green';
      import_health_sub_label := format('%s across %s.', timed_assist_events_label, tracked_games_label);
    else
      import_health_label := 'Partial assist inference';
      import_health_tone := 'gold';
      import_health_sub_label := format(
        '%s plus %s inferred %s from saved totals.',
        timed_assist_events_label,
        inferred_assist_events_count,
        case when inferred_assist_events_count = 1 then 'assist' else 'assists' end
      );
    end if;

    moonrakers_intel := jsonb_build_object(
      'hasData', true,
      'playstyle', jsonb_build_object(
        'directPrestigePerGame', direct_per_game,
        'directPrestigePerGameLabel', trim(to_char(direct_per_game, 'FM999990.0')),
        'assistPrestigeReceivedPerGame', assist_received_per_game,
        'assistPrestigeReceivedPerGameLabel', trim(to_char(assist_received_per_game, 'FM999990.0')),
        'objectivePointsPerGame', objective_points_per_game,
        'objectivePointsPerGameLabel', trim(to_char(objective_points_per_game, 'FM999990.0')),
        'baseTurnsPerGame', base_turns_per_game,
        'baseTurnsPerGameLabel', trim(to_char(base_turns_per_game, 'FM999990.0')),
        'baseRate', base_rate,
        'baseRateLabel', concat(round(base_rate * 100)::int, '%'),
        'styleRead', style_read
      ),
      'bestCondition', best_condition,
      'worstCondition', worst_condition,
      'baseDiscipline', jsonb_build_object(
        'baseRateLabel', concat(round(base_rate * 100)::int, '%'),
        'baseTurnsPerGameLabel', trim(to_char(base_turns_per_game, 'FM999990.0')),
        'winRateWithBaseLabel', concat(round(win_rate_with_base * 100)::int, '%'),
        'winRateWithoutBaseLabel', concat(round(win_rate_without_base * 100)::int, '%'),
        'prestigeWithBaseLabel', trim(to_char(prestige_with_base, 'FM999990.0')),
        'prestigeWithoutBaseLabel', trim(to_char(prestige_without_base, 'FM999990.0'))
      ),
      'objectiveProfile', jsonb_build_object(
        'objectivePointsPerGameLabel', trim(to_char(objective_points_per_game, 'FM999990.0')),
        'gamesWithObjectivesLabel', format('%s/%s', games_with_objectives, moonrakers_game_count),
        'winRateWithObjectivesLabel', concat(round(win_rate_with_objectives * 100)::int, '%'),
        'winRateWithoutObjectivesLabel', concat(round(win_rate_without_objectives * 100)::int, '%'),
        'prestigeWithObjectivesLabel', trim(to_char(prestige_with_objectives, 'FM999990.0')),
        'highObjectiveGamesLabel', format('%s/%s', high_objective_games, moonrakers_game_count)
      ),
      'supportProfile', jsonb_build_object(
        'assistsGivenPerGameLabel', trim(to_char(assists_given_per_game, 'FM999990.0')),
        'assistsReceivedPerGameLabel', trim(to_char(assist_received_per_game, 'FM999990.0')),
        'bestSupportPartner', best_support_partner,
        'mostCommonAssistTarget', most_common_assist_target,
        'supportStyle', support_style
      ),
      'assistContext', jsonb_build_object(
        'assistGapToTargetLabel', trim(to_char(assist_gap_to_target, 'FM999990.0')),
        'assistGapToLeaderLabel', trim(to_char(assist_gap_to_leader, 'FM999990.0')),
        'assistsAtSixPlusLabel', format('%s (%s%%)', assists_at_six_plus, case when assist_events_count > 0 then round((assists_at_six_plus::numeric / assist_events_count::numeric) * 100)::int else 0 end),
        'assistsOverFiveBehindLeaderLabel', format('%s (%s%%)', assists_over_five_behind_leader, case when assist_events_count > 0 then round((assists_over_five_behind_leader::numeric / assist_events_count::numeric) * 100)::int else 0 end),
        'assistPrestigeGainedLabel', trim(to_char(assist_prestige_gained, 'FM999990.0')),
        'assistPrestigePerAssistLabel', trim(to_char(assist_prestige_per_assist, 'FM999990.0')),
        'importHealthLabel', import_health_label,
        'importHealthTone', import_health_tone,
        'importHealthSubLabel', import_health_sub_label,
        'assistEventsLabel', assist_events_label,
        'timedAssistEventsLabel', timed_assist_events_label,
        'trackedGamesLabel', tracked_games_label
      )
    );
  end if;

  hero := jsonb_build_object(
    'id', selected_player_id,
    'name', player_name,
    'color', player_color,
    'assignedCardArtIndex', player_card_art_index,
    'currentElo', current_elo,
    'peakElo', peak_elo,
    'winRate', win_rate,
    'totalWins', total_wins,
    'totalGames', total_games
  );

  profile_insight := jsonb_build_object(
    'title',
      case
        when total_games = 0 then 'Awaiting tracked results'
        when selected_opponent_id is not null and opponent_name is not null then format('Context against %s', opponent_name)
        when win_rate >= 0.6 then 'Winning profile'
        when win_rate <= 0.35 then 'Recovery window'
        else 'Balanced profile'
      end,
    'body',
      case
        when total_games = 0 then 'This player is in the shared directory, but there are no finished games in the published Moonrakers history yet.'
        when selected_opponent_id is not null and opponent_name is not null then
          format(
            '%s has %s wins across %s shared games against %s in the published Supabase record.',
            player_name,
            total_wins,
            total_games,
            opponent_name
          )
        when win_rate >= 0.6 then
          format('%s is converting %s%% of finished games with a current ELO of %s.', player_name, round(win_rate * 100)::int, current_elo)
        when win_rate <= 0.35 then
          format('%s is below break-even right now, so the current profile is more about stabilizing form than protecting peak rating.', player_name)
        else
          format('%s is operating near the league middle, with enough history to compare momentum, context, and projection in one place.', player_name)
      end
  );

  active_insight := coalesce(
    tab_insights->'Leaderboard',
    jsonb_build_object(
      'title', 'Profile insight',
      'body', format('%s now has a full server-authored analytics profile.', player_name)
    )
  );

  return jsonb_build_object(
    'generatedAt', generated_at,
    'selectedPlayerId', selected_player_id,
    'selectedOpponentId', selected_opponent_id,
    'playerOptions', player_options,
    'hero', hero,
    'quickActions', jsonb_build_object(
      'compareLabel', 'Compare with...',
      'chartsLabel', 'Open charts',
      'recentGamesLabel', 'Recent games'
    ),
    'topCards', top_cards,
    'activeInsight', active_insight,
    'profileInsight', profile_insight,
    'tabs', tabs,
    'tabInsights', tab_insights,
    'moonrakersIntel', moonrakers_intel,
    'opponentOptions', opponent_options,
    'topOpponentOptions', top_opponent_options,
    'recentGames', recent_games,
    'emptyState',
      case
        when total_games > 0 then null
        else jsonb_build_object(
          'title', 'No player analytics yet',
          'description', 'Track or import a few finished games so the full profile contract has live history to summarize.'
        )
      end
  );
end;
$$;
