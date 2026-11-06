-- Applied to production on 2026-08-17 as version 20260817213328 and only
-- committed later: this body is copied from that version's recorded statement
-- in supabase_migrations.schema_migrations, so a database rebuilt from this
-- directory matches the live one.
--
-- Two answers the registration and new-guest forms need while they are still
-- being filled in: whether a username is free, and whether a guest someone was
-- told about exists. Both are anon-callable because registration asks before
-- there is a session. Neither returns profile ids; claiming a guest still
-- requires its passcode.
create or replace function public.lookup_claimable_guest(p_player_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_player_name text := btrim(coalesce(p_player_name, ''));
  v_guest public.profiles;
  v_seats int := 0;
begin
  if v_player_name !~ '^[A-Za-z0-9_-]{3,20}$' then
    return jsonb_build_object('found', false);
  end if;

  select profile.*
  into v_guest
  from public.profiles as profile
  where lower(btrim(profile.player_name)) = lower(v_player_name)
    and profile.is_guest
    and profile.deleted_at is null
  limit 1;

  if v_guest.id is null then
    return jsonb_build_object('found', false);
  end if;

  select count(*)::int
  into v_seats
  from public.game_participants
  where public.game_participants.profile_id = v_guest.id;

  return jsonb_build_object(
    'found', true,
    'username', v_guest.player_name,
    'favoriteColor', v_guest.favorite_color,
    'assignedCardArtIndex', v_guest.assigned_card_art_index,
    'gamesPlayed', v_seats
  );
end;
$function$;

create or replace function public.is_player_name_available(p_player_name text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select btrim(coalesce(p_player_name, '')) ~ '^[A-Za-z0-9_-]{3,20}$'
    and not exists (
      select 1
      from public.profiles
      where lower(btrim(public.profiles.player_name))
            = lower(btrim(coalesce(p_player_name, '')))
        and public.profiles.deleted_at is null
    );
$function$;

create or replace function public.is_display_name_available(p_display_name text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select btrim(coalesce(p_display_name, '')) <> ''
    and not exists (
      select 1
      from public.profiles
      where lower(btrim(coalesce(public.profiles.display_name, '')))
            = lower(btrim(coalesce(p_display_name, '')))
        and public.profiles.deleted_at is null
    );
$function$;

revoke all on function public.lookup_claimable_guest(text) from public;
revoke all on function public.is_player_name_available(text) from public;
revoke all on function public.is_display_name_available(text) from public;

grant execute on function public.lookup_claimable_guest(text) to anon, authenticated;
grant execute on function public.is_player_name_available(text) to anon, authenticated;
grant execute on function public.is_display_name_available(text) to anon, authenticated;
