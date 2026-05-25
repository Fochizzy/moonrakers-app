
-- Patch existing rollups with scoringRoundRate + avgPrestigePerScoringRound
-- then update admin_refresh_analytics to compute these on every future refresh

-- 1. Patch existing rollups directly
update public.personal_stats_rollups as psr
set payload = jsonb_set(
  jsonb_set(
    psr.payload,
    array['statsScreen','consistencyProfile','scoringRoundRate'],
    to_jsonb(scoring.rate)
  ),
  array['statsScreen','consistencyProfile','avgPrestigePerScoringRound'],
  to_jsonb(scoring.avg_pps)
)
from (
  select
    gp.profile_id,
    round(
      sum(rc.scoring_r)::numeric / nullif(sum(rc.total_r), 0),
      3
    ) as rate,
    round(
      sum(rc.scoring_p)::numeric / nullif(sum(rc.scoring_r), 0),
      2
    ) as avg_pps
  from public.game_participants as gp
  join public.games as g on g.id = gp.game_id and g.status = 'finished'
  join lateral (
    select
      count(*) filter (where gr.prestige > 0)::int              as scoring_r,
      coalesce(sum(gr.prestige) filter (where gr.prestige > 0), 0) as scoring_p,
      count(*)::int                                               as total_r
    from public.game_rounds as gr
    where gr.participant_id = gp.id
  ) as rc on true
  where gp.profile_id is not null
  group by gp.profile_id
) as scoring
where psr.profile_id = scoring.profile_id;

-- 2. Also patch the description text to reflect new fields
update public.personal_stats_rollups as psr
set payload = jsonb_set(
  psr.payload,
  array['statsScreen','consistencyProfile','description'],
  to_jsonb(
    concat(
      round((psr.payload->'statsScreen'->'consistencyProfile'->>'scoringRoundRate')::numeric * 100, 0)::int::text,
      '% of rounds score prestige (avg ',
      (psr.payload->'statsScreen'->'consistencyProfile'->>'avgPrestigePerScoringRound'),
      ' per scoring round; best single round: ',
      psr.payload->'statsScreen'->'consistencyProfile'->>'bestSingleRound',
      ').'
    )
  )
)
where payload->'statsScreen'->'consistencyProfile' ? 'scoringRoundRate'
  and (payload->'statsScreen'->'consistencyProfile'->>'avgPrestigePerScoringRound') is not null;
;
