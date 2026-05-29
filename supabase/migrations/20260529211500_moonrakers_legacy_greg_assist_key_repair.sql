create or replace function public.resolve_game_participant_profile_id(
  target_game_id uuid,
  raw_player_key text
)
returns uuid
language plpgsql
stable
set search_path = 'public'
as $$
declare
  trimmed_key text := btrim(coalesce(raw_player_key, ''));
  normalized_key text := regexp_replace(
    lower(regexp_replace(trimmed_key, '^(legacy|local)[-_ ]+', '')),
    '[^a-z0-9]+',
    '',
    'g'
  );
  direct_profile_id uuid;
  matched_profile_ids uuid[] := array[]::uuid[];
begin
  if trimmed_key = '' then
    return null;
  end if;

  select gp.profile_id
  into direct_profile_id
  from public.game_participants as gp
  where gp.game_id = target_game_id
    and gp.profile_id is not null
    and gp.profile_id::text = trimmed_key
  limit 1;

  if direct_profile_id is not null then
    return direct_profile_id;
  end if;

  if normalized_key = '' then
    return null;
  end if;

  -- Legacy imports could persist assist targets like "legacy-greg" instead of a profile UUID.
  select coalesce(array_agg(distinct candidate.profile_id), array[]::uuid[])
  into matched_profile_ids
  from (
    select gp.profile_id
    from public.game_participants as gp
    left join public.profiles as p
      on p.id = gp.profile_id
    cross join lateral (
      values
        (regexp_replace(lower(btrim(coalesce(gp.player_name_snapshot, ''))), '[^a-z0-9]+', '', 'g')),
        (regexp_replace(lower(btrim(coalesce(gp.display_name_snapshot, ''))), '[^a-z0-9]+', '', 'g')),
        (regexp_replace(lower(btrim(coalesce(p.player_name, ''))), '[^a-z0-9]+', '', 'g')),
        (regexp_replace(lower(btrim(coalesce(p.display_name, ''))), '[^a-z0-9]+', '', 'g'))
    ) as aliases(alias_key)
    where gp.game_id = target_game_id
      and gp.profile_id is not null
      and aliases.alias_key <> ''
      and aliases.alias_key = normalized_key
  ) as candidate;

  if coalesce(array_length(matched_profile_ids, 1), 0) = 1 then
    return matched_profile_ids[1];
  end if;

  return null;
end;
$$;

revoke all on function public.resolve_game_participant_profile_id(uuid, text) from public;
revoke all on function public.resolve_game_participant_profile_id(uuid, text) from anon;
grant execute on function public.resolve_game_participant_profile_id(uuid, text) to authenticated;

with repaired_rounds as (
  select
    gr.id,
    coalesce(
      (
        select jsonb_object_agg(repaired.key, to_jsonb(repaired.total_value))
        from (
          select
            coalesce(
              public.resolve_game_participant_profile_id(gr.game_id, edge.key)::text,
              btrim(edge.key)
            ) as key,
            sum(coalesce(nullif(edge.value, '')::numeric, 0)) as total_value
          from jsonb_each_text(coalesce(gr.assist_recipients, '{}'::jsonb)) as edge(key, value)
          where btrim(edge.key) <> ''
          group by 1
        ) as repaired
      ),
      '{}'::jsonb
    ) as repaired_assist_recipients,
    coalesce(
      (
        select jsonb_object_agg(repaired.key, to_jsonb(repaired.total_value))
        from (
          select
            coalesce(
              public.resolve_game_participant_profile_id(gr.game_id, edge.key)::text,
              btrim(edge.key)
            ) as key,
            sum(coalesce(nullif(edge.value, '')::numeric, 0)) as total_value
          from jsonb_each_text(coalesce(gr.assist_prestige_recipients, '{}'::jsonb)) as edge(key, value)
          where btrim(edge.key) <> ''
          group by 1
        ) as repaired
      ),
      '{}'::jsonb
    ) as repaired_assist_prestige_recipients
  from public.game_rounds as gr
  where exists (
    select 1
    from jsonb_each_text(coalesce(gr.assist_recipients, '{}'::jsonb)) as edge(key, value)
    where public.resolve_game_participant_profile_id(gr.game_id, edge.key) is not null
      and public.resolve_game_participant_profile_id(gr.game_id, edge.key)::text <> btrim(edge.key)
  )
  or exists (
    select 1
    from jsonb_each_text(coalesce(gr.assist_prestige_recipients, '{}'::jsonb)) as edge(key, value)
    where public.resolve_game_participant_profile_id(gr.game_id, edge.key) is not null
      and public.resolve_game_participant_profile_id(gr.game_id, edge.key)::text <> btrim(edge.key)
  )
)
update public.game_rounds as gr
set assist_recipients = repaired_rounds.repaired_assist_recipients,
    assist_prestige_recipients = repaired_rounds.repaired_assist_prestige_recipients
from repaired_rounds
where repaired_rounds.id = gr.id
  and (
    gr.assist_recipients is distinct from repaired_rounds.repaired_assist_recipients
    or gr.assist_prestige_recipients is distinct from repaired_rounds.repaired_assist_prestige_recipients
  );

do $$
declare
  current_definition text;
  patched_definition text;
begin
  select pg_get_functiondef('public.get_insights_screen(uuid)'::regprocedure)
  into current_definition;

  if position('public.resolve_game_participant_profile_id(gr.game_id, edge.key)' in current_definition) > 0 then
    patched_definition := current_definition;
  else
    patched_definition := regexp_replace(
      current_definition,
      E'join\\s+public\\.game_participants\\s+as\\s+recipient\\s*\\n\\s*on\\s+recipient\\.game_id\\s*=\\s*gr\\.game_id\\s*\\n\\s*and\\s+recipient\\.profile_id\\s*=\\s*nullif\\(edge\\.key,\\s*''''\\)::uuid',
$replacement$
      join lateral (
        select resolved.profile_id
        from (
          select public.resolve_game_participant_profile_id(gr.game_id, edge.key) as profile_id
        ) as resolved
        where resolved.profile_id is not null
      ) as recipient
        on true
$replacement$,
      'i'
    );
  end if;

  if patched_definition = current_definition
    and position('public.resolve_game_participant_profile_id(gr.game_id, edge.key)' in current_definition) = 0 then
    raise exception 'expected public.get_insights_screen(uuid) to contain the legacy assist recipient join';
  end if;

  if patched_definition <> current_definition then
    execute patched_definition;
  end if;
end
$$;
