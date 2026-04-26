create table public.global_stats_rollups (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.group_stats_rollups (
  group_id uuid primary key references public.groups(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.can_read_group_rollup(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups
    where public.groups.id = target_group_id
      and (
        public.groups.created_by = (select auth.uid())
        or exists (
          select 1
          from public.group_members
          where public.group_members.group_id = public.groups.id
            and public.group_members.profile_id = (select auth.uid())
        )
      )
  )
$$;

alter table public.global_stats_rollups enable row level security;
alter table public.group_stats_rollups enable row level security;

create policy "global_stats_rollups_select_authenticated"
on public.global_stats_rollups
for select
to authenticated
using (true);

create policy "group_stats_rollups_select_authorized"
on public.group_stats_rollups
for select
to authenticated
using (public.can_read_group_rollup(group_id));

create or replace function public.save_completed_game(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_game_id uuid;
  host_profile_id uuid;
  group_id uuid;
  winner_profile_id uuid;
  participant_count int;
begin
  host_profile_id := nullif(payload->>'host_profile_id', '')::uuid;
  group_id := nullif(payload->>'group_id', '')::uuid;
  winner_profile_id := nullif(payload->>'winner_profile_id', '')::uuid;
  participant_count := coalesce(jsonb_array_length(coalesce(payload->'participants', '[]'::jsonb)), 0);

  if host_profile_id is null or host_profile_id <> (select auth.uid()) then
    raise exception 'host_profile_id must match the authenticated profile';
  end if;

  if participant_count < 2 or participant_count > 5 then
    raise exception 'games must have between 2 and 5 participants';
  end if;

  -- all new-game participants are registered
  if exists (
    select 1
    from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb)) as participant_row(item)
    where nullif(participant_row.item->>'profile_id', '') is null
  ) then
    raise exception 'all new-game participants are registered';
  end if;

  insert into public.games (
    host_profile_id,
    group_id,
    group_name_snapshot,
    status,
    created_at,
    finished_at,
    winner_profile_id
  )
  values (
    host_profile_id,
    group_id,
    nullif(payload->>'group_name_snapshot', ''),
    'finished',
    case
      when nullif(payload->>'created_at', '') is null then now()
      else (payload->>'created_at')::timestamptz
    end,
    now(),
    winner_profile_id
  )
  returning id into new_game_id;

  with participant_rows as (
    select
      row_number() over () as row_num,
      item
    from jsonb_array_elements(coalesce(payload->'participants', '[]'::jsonb)) as participant_row(item)
  )
  insert into public.game_participants (
    game_id,
    profile_id,
    player_name_snapshot,
    display_name_snapshot,
    color_snapshot,
    assigned_card_art_index_snapshot,
    start_order,
    total_prestige,
    direct_prestige,
    assist_prestige_received,
    objective_prestige,
    score,
    assists,
    failures,
    contracts,
    is_winner
  )
  select
    new_game_id,
    nullif(participant_rows.item->>'profile_id', '')::uuid,
    coalesce(nullif(participant_rows.item->>'player_name_snapshot', ''), 'Unknown Player'),
    nullif(participant_rows.item->>'display_name_snapshot', ''),
    nullif(participant_rows.item->>'color_snapshot', ''),
    case
      when jsonb_typeof(participant_rows.item->'assigned_card_art_index_snapshot') = 'number'
        then (participant_rows.item->>'assigned_card_art_index_snapshot')::int
      else null
    end,
    coalesce((participant_rows.item->>'start_order')::int, participant_rows.row_num - 1),
    coalesce((participant_rows.item->>'total_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'direct_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'assist_prestige_received')::numeric, 0),
    coalesce((participant_rows.item->>'objective_prestige')::numeric, 0),
    coalesce((participant_rows.item->>'score')::numeric, 0),
    coalesce((participant_rows.item->>'assists')::int, 0),
    coalesce((participant_rows.item->>'failures')::int, 0),
    coalesce((participant_rows.item->>'contracts')::int, 0),
    coalesce(nullif(participant_rows.item->>'profile_id', '')::uuid = winner_profile_id, false)
  from participant_rows;

  insert into public.game_rounds (
    game_id,
    participant_id,
    round_index,
    prestige,
    contracts,
    failures,
    assist_recipients,
    assist_prestige_recipients,
    objective_count,
    objective_prestige,
    created_at
  )
  select
    new_game_id,
    participants.id,
    coalesce((round_rows.item->>'round_index')::int, 0),
    coalesce((round_rows.item->>'prestige')::numeric, 0),
    coalesce((round_rows.item->>'contracts')::int, 0),
    coalesce((round_rows.item->>'failures')::int, 0),
    coalesce(round_rows.item->'assist_recipients', '{}'::jsonb),
    coalesce(round_rows.item->'assist_prestige_recipients', '{}'::jsonb),
    coalesce((round_rows.item->>'objective_count')::int, 0),
    coalesce((round_rows.item->>'objective_prestige')::numeric, 0),
    now()
  from jsonb_array_elements(coalesce(payload->'rounds', '[]'::jsonb)) as round_rows(item)
  join public.game_participants as participants
    on participants.game_id = new_game_id
   and participants.profile_id = nullif(round_rows.item->>'participant_id', '')::uuid;

  insert into public.global_stats_rollups as global_rollup (key, payload, updated_at)
  values (
    'overview',
    jsonb_build_object(
      'gamesPlayed', (select count(*) from public.games where status = 'finished'),
      'playersRegistered', (select count(*) from public.profiles),
      'lastGameId', new_game_id
    ),
    now()
  )
  on conflict (key) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at;

  if group_id is not null then
    insert into public.group_stats_rollups as group_rollup (group_id, payload, updated_at)
    values (
      group_id,
      jsonb_build_object(
        'groupId', group_id,
        'gamesPlayed', (select count(*) from public.games where public.games.group_id = group_id),
        'lastGameId', new_game_id
      ),
      now()
    )
    on conflict (group_id) do update
      set payload = excluded.payload,
          updated_at = excluded.updated_at;
  end if;

  return new_game_id;
end;
$$;

grant execute on function public.save_completed_game(jsonb) to authenticated;
