-- Two additions in one pass:
--
-- 1. get_pace_screen: the first analytics surface built on the created_at stamp
--    every game_round already carries. A turn's length is the gap between the
--    previous saved round and this one, so it measures wall-clock table time.
--    Gaps under 10 seconds are linked bonus/head-to-head rows saved in the same
--    breath as their main turn; gaps over 30 minutes are interruptions. Both
--    are excluded, and medians are used throughout so one pizza delivery
--    cannot skew a whole league.
--
-- 2. client_error_reports: crash telemetry with no external vendor. The app
--    inserts a row when its global error handler or root error boundary fires;
--    only the reporting user can insert as themselves, nobody can read them
--    back through the API (service-role/dashboard only).

-- ---------------------------------------------------------------------------
-- Pace screen
-- ---------------------------------------------------------------------------
create or replace function public.get_pace_screen(
  profile_id uuid default auth.uid()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer_profile_id uuid := coalesce(profile_id, auth.uid());
  result jsonb;
begin
  if viewer_profile_id is null or viewer_profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  with round_stream as (
    select
      gr.game_id,
      gr.created_at,
      gp.profile_id as round_profile_id,
      coalesce(
        nullif(trim(p.player_name), ''),
        nullif(trim(gp.player_name_snapshot), ''),
        'Unknown'
      ) as player_name,
      lag(gr.created_at) over (
        partition by gr.game_id
        order by gr.created_at, gr.round_index, gr.id
      ) as prev_created_at
    from public.game_rounds gr
    join public.game_participants gp on gp.id = gr.participant_id
    join public.games g on g.id = gr.game_id
    left join public.profiles p on p.id = gp.profile_id
    where g.status = 'finished'
  ),
  gaps as (
    -- The gap before a round belongs to the player who saved that round.
    select
      game_id,
      round_profile_id,
      player_name,
      extract(epoch from (created_at - prev_created_at)) as gap_seconds
    from round_stream
    where prev_created_at is not null
      and extract(epoch from (created_at - prev_created_at)) between 10 and 1800
  ),
  game_lengths as (
    select
      gaps.game_id,
      sum(gaps.gap_seconds) as measured_seconds,
      count(*) as measured_turns
    from gaps
    group by gaps.game_id
    having count(*) >= 3
  ),
  game_player_counts as (
    select gp.game_id, count(*) as player_count
    from public.game_participants gp
    group by gp.game_id
  ),
  league as (
    select
      count(*) as games_measured,
      percentile_cont(0.5) within group (order by gl.measured_seconds) as median_game_seconds
    from game_lengths gl
  ),
  by_player_count as (
    select
      gpc.player_count,
      count(*) as games,
      percentile_cont(0.5) within group (order by gl.measured_seconds) as median_game_seconds
    from game_lengths gl
    join game_player_counts gpc on gpc.game_id = gl.game_id
    group by gpc.player_count
    order by gpc.player_count
  ),
  player_rows as (
    select
      gaps.round_profile_id,
      max(gaps.player_name) as player_name,
      count(*) as turns,
      percentile_cont(0.5) within group (order by gaps.gap_seconds) as median_turn_seconds,
      max(gaps.gap_seconds) as longest_turn_seconds,
      sum(gaps.gap_seconds) as total_turn_seconds
    from gaps
    where gaps.round_profile_id is not null
    group by gaps.round_profile_id
    having count(*) >= 5
  ),
  measured_total as (
    select coalesce(sum(total_turn_seconds), 0) as total_seconds from player_rows
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'generatedAt', now(),
      'source', 'supabase'
    ),
    'league', jsonb_build_object(
      'gamesMeasured', coalesce((select games_measured from league), 0),
      'medianGameSeconds', round(coalesce((select median_game_seconds from league), 0)),
      'medianTurnSeconds', round(coalesce(
        (select percentile_cont(0.5) within group (order by gap_seconds) from gaps), 0)),
      'lengthByPlayerCount', coalesce(
        (select jsonb_agg(jsonb_build_object(
          'playerCount', bpc.player_count,
          'games', bpc.games,
          'medianGameSeconds', round(bpc.median_game_seconds)
        ) order by bpc.player_count) from by_player_count bpc),
        '[]'::jsonb
      )
    ),
    'players', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'profileId', pr.round_profile_id,
        'name', pr.player_name,
        'turns', pr.turns,
        'medianTurnSeconds', round(pr.median_turn_seconds),
        'longestTurnSeconds', round(pr.longest_turn_seconds),
        'tableShare', case
          when (select total_seconds from measured_total) > 0
          then round(pr.total_turn_seconds / (select total_seconds from measured_total), 4)
          else 0
        end
      ) order by pr.median_turn_seconds desc) from player_rows pr),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_pace_screen(uuid) from public;
grant execute on function public.get_pace_screen(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Crash telemetry
-- ---------------------------------------------------------------------------
create table if not exists public.client_error_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  platform text not null default 'unknown',
  app_version text,
  is_fatal boolean not null default false,
  message text not null,
  stack text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.client_error_reports enable row level security;

-- Reporters may only file as themselves (or anonymously pre-auth). Nothing is
-- readable back through the API: triage happens in the dashboard.
create policy client_error_reports_insert_own
  on public.client_error_reports
  for insert
  to authenticated
  with check (profile_id is null or profile_id = (select auth.uid()));

create index if not exists client_error_reports_created_at_idx
  on public.client_error_reports (created_at desc);

revoke all on table public.client_error_reports from anon;
grant insert on table public.client_error_reports to authenticated;
