-- A guest's passcode is the only thing standing between anyone who can read a
-- guest's username and permanently taking over that guest's game history, so
-- wrong guesses are now limited per guest across every account, not only per
-- caller-and-guest pair.
--
-- Two gaps this closes:
--
-- * claim_guest_profile recorded failures in private.player_passcode_failures
--   keyed by the claimer's profile id -- but a claimer by definition has no
--   profile yet, so the foreign key rejected the insert. Every wrong claim
--   failed with a constraint error, nothing was ever recorded, and claiming
--   had no attempt limit at all.
-- * verify_player_passcode limits each caller to 5 guesses per 10 minutes per
--   subject, but any signed-in account can call it against any guest (profile
--   ids are readable) with any draft id. Each new account was a fresh budget,
--   and a guessed guest passcode can then be used to claim.
--
-- Wrong guesses against one guest, from everyone combined: 10 per hour, then
-- the guest is locked for an hour. A correct passcode clears the count.
--
-- lookup_claimable_guest also stops returning the guest's favourite colour and
-- card art. The client never used them, and the lookup is callable without a
-- session.

create table private.guest_passcode_failures (
  guest_profile_id uuid primary key
    references public.profiles(id) on update cascade on delete cascade,
  window_started_at timestamptz not null default now(),
  failed_attempts int not null default 0,
  locked_until timestamptz
);

revoke all on table private.guest_passcode_failures from public, anon, authenticated;

create function private.guest_passcode_locked(p_guest_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $function$
  select exists (
    select 1
    from private.guest_passcode_failures as failure
    where failure.guest_profile_id = p_guest_id
      and failure.locked_until > now()
  );
$function$;

create function private.record_guest_passcode_failure(p_guest_id uuid)
returns void
language sql
set search_path = ''
as $function$
  insert into private.guest_passcode_failures as failure (
    guest_profile_id,
    window_started_at,
    failed_attempts,
    locked_until
  )
  values (p_guest_id, now(), 1, null)
  on conflict (guest_profile_id) do update
    set window_started_at = case
          when failure.window_started_at < now() - interval '1 hour'
            then now()
          else failure.window_started_at
        end,
        failed_attempts = case
          when failure.window_started_at < now() - interval '1 hour'
            then 1
          else failure.failed_attempts + 1
        end,
        locked_until = case
          when (
            case
              when failure.window_started_at < now() - interval '1 hour'
                then 1
              else failure.failed_attempts + 1
            end
          ) >= 10
            then now() + interval '1 hour'
          else null
        end;
$function$;

create function private.clear_guest_passcode_failures(p_guest_id uuid)
returns void
language sql
set search_path = ''
as $function$
  delete from private.guest_passcode_failures
  where guest_profile_id = p_guest_id;
$function$;

revoke all on function private.guest_passcode_locked(uuid) from public, anon, authenticated;
revoke all on function private.record_guest_passcode_failure(uuid) from public, anon, authenticated;
revoke all on function private.clear_guest_passcode_failures(uuid) from public, anon, authenticated;

-- The claimer has no profile, so the per-pair table could never hold its
-- failures; the per-guest count is the claim's limit.
create or replace function public.claim_guest_profile(p_player_name text, p_passcode text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_player_name text := btrim(coalesce(p_player_name, ''));
  v_passcode text := private.normalize_player_passcode(p_passcode);
  v_guest public.profiles;
  v_hash text;
  v_seats int := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_player_name = '' or v_passcode = '' then
    raise exception 'Guest username and passcode are required';
  end if;

  select profile.*
  into v_guest
  from public.profiles as profile
  where lower(btrim(profile.player_name)) = lower(v_player_name)
    and profile.is_guest
    and profile.deleted_at is null
  limit 1
  for update;

  if v_guest.id is null then
    return jsonb_build_object('claimed', false);
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'This account already has a player profile';
  end if;

  if private.guest_passcode_locked(v_guest.id) then
    raise exception 'Too many attempts. Try again later';
  end if;

  select passcode.passcode_hash
  into v_hash
  from private.player_passcodes as passcode
  where passcode.profile_id = v_guest.id;

  if v_hash is null
     or extensions.crypt(v_passcode, v_hash) <> v_hash then
    perform private.record_guest_passcode_failure(v_guest.id);
    return jsonb_build_object('claimed', false);
  end if;

  perform private.clear_guest_passcode_failures(v_guest.id);

  select count(*)::int
  into v_seats
  from public.game_participants
  where profile_id = v_guest.id;

  -- Assist maps use profile ids as JSON object keys and therefore cannot rely
  -- on foreign-key cascades.
  update public.game_rounds
  set assist_recipients =
    (assist_recipients - v_guest.id::text)
    || jsonb_build_object(v_user_id::text, assist_recipients->v_guest.id::text)
  where assist_recipients ? v_guest.id::text;

  update public.game_rounds
  set assist_prestige_recipients =
    (assist_prestige_recipients - v_guest.id::text)
    || jsonb_build_object(
      v_user_id::text,
      assist_prestige_recipients->v_guest.id::text
    )
  where assist_prestige_recipients ? v_guest.id::text;

  update public.profiles
  set id = v_user_id,
      is_guest = false,
      claimed_at = now(),
      updated_at = now()
  where id = v_guest.id;

  begin
    delete from public.personal_stats_rollups where profile_id = v_user_id;
    perform private.admin_refresh_analytics(v_user_id);
    perform private.post_process_analytics(v_user_id);
    perform private.refresh_all_elo_snapshots();
  exception
    when others then
      null;
  end;

  return jsonb_build_object(
    'claimed', true,
    'guestId', v_guest.id,
    'profileId', v_user_id,
    'guestUsername', v_guest.player_name,
    'seatsTransferred', v_seats
  );
end;
$function$;

-- Registered players keep the per-caller limit only. A guest's passcode also
-- unlocks claiming, so guests get the cross-account limit here too: otherwise
-- this would be the way round the claim's limit.
create or replace function public.verify_player_passcode(p_profile_id uuid, p_passcode text, p_draft_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_host_id uuid := auth.uid();
  v_hash text;
  v_passcode text := private.normalize_player_passcode(p_passcode);
  v_failure private.player_passcode_failures;
  v_is_guest boolean;
begin
  if v_host_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_profile_id is null or p_draft_id is null then
    raise exception 'Player and game draft are required';
  end if;

  if p_profile_id = v_host_id then
    return true;
  end if;

  select coalesce(profile.is_guest, false)
  into v_is_guest
  from public.profiles as profile
  where profile.id = p_profile_id
    and profile.deleted_at is null;

  if not found then
    return false;
  end if;

  select failure.*
  into v_failure
  from private.player_passcode_failures as failure
  where failure.host_profile_id = v_host_id
    and failure.subject_profile_id = p_profile_id;

  if v_failure.locked_until is not null and v_failure.locked_until > now() then
    raise exception 'Too many attempts. Try again later';
  end if;

  if v_is_guest and private.guest_passcode_locked(p_profile_id) then
    raise exception 'Too many attempts. Try again later';
  end if;

  select passcode.passcode_hash
  into v_hash
  from private.player_passcodes as passcode
  where passcode.profile_id = p_profile_id;

  if v_hash is not null
     and v_passcode <> ''
     and extensions.crypt(v_passcode, v_hash) = v_hash then
    delete from private.player_passcode_failures
    where host_profile_id = v_host_id
      and subject_profile_id = p_profile_id;

    if v_is_guest then
      perform private.clear_guest_passcode_failures(p_profile_id);
    end if;

    insert into private.player_add_authorizations as existing_authorization (
      host_profile_id,
      draft_id,
      subject_profile_id,
      expires_at
    )
    values (
      v_host_id,
      p_draft_id,
      p_profile_id,
      now() + private.player_add_authorization_ttl()
    )
    on conflict (host_profile_id, draft_id, subject_profile_id) do update
      set created_at = now(),
          expires_at = now() + private.player_add_authorization_ttl();

    return true;
  end if;

  insert into private.player_passcode_failures as failure (
    host_profile_id,
    subject_profile_id,
    window_started_at,
    failed_attempts,
    locked_until
  )
  values (v_host_id, p_profile_id, now(), 1, null)
  on conflict (host_profile_id, subject_profile_id) do update
    set window_started_at = case
          when failure.window_started_at < now() - interval '10 minutes'
            then now()
          else failure.window_started_at
        end,
        failed_attempts = case
          when failure.window_started_at < now() - interval '10 minutes'
            then 1
          else failure.failed_attempts + 1
        end,
        locked_until = case
          when (
            case
              when failure.window_started_at < now() - interval '10 minutes'
                then 1
              else failure.failed_attempts + 1
            end
          ) >= 5
            then now() + interval '10 minutes'
          else null
        end;

  if v_is_guest then
    perform private.record_guest_passcode_failure(p_profile_id);
  end if;

  return false;
end;
$function$;

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
    'gamesPlayed', v_seats
  );
end;
$function$;
