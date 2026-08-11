create or replace function private.get_stats_screen_rollup(target_player_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select psr.payload->'statsScreen'
  from public.personal_stats_rollups as psr
  where psr.profile_id = target_player_id
  limit 1;
$$;

revoke all on function private.get_stats_screen_rollup(uuid) from public;
revoke all on function private.get_stats_screen_rollup(uuid) from anon;
revoke all on function private.get_stats_screen_rollup(uuid) from authenticated;

drop function if exists public.get_stats_screen(uuid);

create or replace function public.get_stats_screen(
  profile_id uuid default auth.uid(),
  focus_player_id uuid default null
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

  select private.get_stats_screen_rollup(effective_focus_player_id)
  into rollup_stats;

  if rollup_stats is not null then
    return rollup_stats;
  end if;

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
