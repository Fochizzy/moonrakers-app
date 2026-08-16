-- 20260527213500 rewrote public.get_player_profile_screen to reach the intel
-- builder through the public security-definer wrapper, because the function
-- itself is security invoker and the authenticated role has no USAGE on the
-- private schema. 20260813180000 re-created the function from source and
-- restored the direct private.build_moonrakers_intel_payload() calls, so every
-- profile read for someone other than the signed-in player has been failing
-- with "permission denied for schema private" ever since.
--
-- Re-apply the wrapper swap, then assert it stuck so the next `create or
-- replace` of this function cannot silently reopen the same hole.

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
    'gn'
  );

  patched_function_sql := regexp_replace(
    patched_function_sql,
    E'private\\.build_moonrakers_intel_payload\\(selected_player_id, null\\)',
    'public.get_player_profile_moonrakers_intel(profile_id, selected_player_id, null)',
    'gn'
  );

  if patched_function_sql <> function_sql then
    execute regexp_replace(patched_function_sql, ';\s*$', '');
  end if;
end;
$patch$;

do $verify$
declare
  function_sql text := pg_get_functiondef(
    'public.get_player_profile_screen(uuid,uuid,uuid)'::regprocedure
  );
begin
  if function_sql ~ 'private\.' then
    raise exception
      'public.get_player_profile_screen still reaches into the private schema; authenticated has no USAGE there.';
  end if;

  if function_sql !~ 'public\.get_player_profile_moonrakers_intel\(' then
    raise exception
      'public.get_player_profile_screen no longer routes intel through the public security-definer wrapper.';
  end if;
end;
$verify$;

notify pgrst, 'reload schema';
