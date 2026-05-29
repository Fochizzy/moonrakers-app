create or replace function public.get_player_profile_moonrakers_intel(
  profile_id uuid default auth.uid(),
  target_profile_id uuid default null,
  opponent_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer_profile_id uuid := coalesce(profile_id, auth.uid());
  moonrakers_intel jsonb := null;
begin
  if viewer_profile_id is null or viewer_profile_id <> (select auth.uid()) then
    raise exception 'profile_id must match the authenticated profile';
  end if;

  if target_profile_id is null then
    return null;
  end if;

  moonrakers_intel := private.build_moonrakers_intel_payload(
    target_profile_id,
    opponent_id
  );

  if moonrakers_intel is not null
    and coalesce((moonrakers_intel->>'hasData')::boolean, false) = true then
    moonrakers_intel := jsonb_set(
      moonrakers_intel,
      '{supportProfile,mostCommonAssistTarget}',
      coalesce(
        private.build_most_common_assist_target_summary(
          target_profile_id,
          opponent_id
        ),
        'null'::jsonb
      ),
      true
    );
  end if;

  return moonrakers_intel;
end;
$$;

revoke all on function public.get_player_profile_moonrakers_intel(uuid, uuid, uuid) from public;
revoke all on function public.get_player_profile_moonrakers_intel(uuid, uuid, uuid) from anon;
grant execute on function public.get_player_profile_moonrakers_intel(uuid, uuid, uuid) to authenticated;
grant execute on function public.get_player_profile_moonrakers_intel(uuid, uuid, uuid) to service_role;

do $patch$
declare
  target_function regprocedure := 'public.get_player_profile_screen(uuid,uuid,uuid)'::regprocedure;
  function_sql text;
  patched_function_sql text;
begin
  function_sql := pg_get_functiondef(target_function);
  patched_function_sql := function_sql;

  patched_function_sql := regexp_replace(
    patched_function_sql,
    E'private\\.build_moonrakers_intel_payload\\(selected_player_id, selected_opponent_id\\)',
    'public.get_player_profile_moonrakers_intel(profile_id, selected_player_id, selected_opponent_id)',
    'n'
  );

  patched_function_sql := regexp_replace(
    patched_function_sql,
    E'private\\.build_moonrakers_intel_payload\\(selected_player_id, null\\)',
    'public.get_player_profile_moonrakers_intel(profile_id, selected_player_id, null)',
    'n'
  );

  patched_function_sql := regexp_replace(
    patched_function_sql,
    E'\\s*if moonrakers_intel is not null and coalesce\\(\\(moonrakers_intel->>''hasData''\\)::boolean,false\\)=true then\\s+moonrakers_intel := jsonb_set\\(\\s+moonrakers_intel,\\s+''\\{supportProfile,mostCommonAssistTarget\\}'',\\s+coalesce\\(private\\.build_most_common_assist_target_summary\\(selected_player_id, selected_opponent_id\\), ''null''::jsonb\\),\\s+true\\s+\\);\\s+end if;',
    '',
    'n'
  );

  if patched_function_sql = function_sql then
    if function_sql ~ E'public\\.get_player_profile_moonrakers_intel\\(profile_id, selected_player_id, selected_opponent_id\\)'
      and function_sql !~ E'private\\.build_most_common_assist_target_summary\\(selected_player_id, selected_opponent_id\\)' then
      return;
    end if;

    raise exception 'Could not restore private-schema-safe player profile RPC wrapper.';
  end if;

  patched_function_sql := regexp_replace(patched_function_sql, ';\s*$', '');

  execute patched_function_sql;
end;
$patch$;
