# Moonrakers Phase 1 Additional Statistics Design

Date: 2026-05-27

## Summary

This design defines a focused phase-1 analytics expansion for Moonrakers that adds more useful player-story signals without widening the app into a new analytics system.

The batch should:

1. surface stronger trend, closing, pressure, and context reads on existing analytics routes,
2. reuse the current server-authored analytics flow and existing metric plumbing where possible,
3. expose a small, high-signal metric batch inside current chart workflows instead of creating new charts,
4. preserve the current route structure and interaction model across `Stats`, `Insights`, and `Charts`.

The intended result is that the app answers four questions faster:

- who is trending up or down,
- who closes games well,
- who holds up under pressure,
- who is especially shaped by seat or support context.

## Goals

- Make the existing analytics family feel more useful with a small set of high-signal additions.
- Treat `Stats` as the quick scouting surface.
- Treat `Insights` as the interpretive surface.
- Treat `Charts` as the comparison and inspection surface.
- Prefer metrics that already have credible repo support over speculative new composites.
- Keep the phase small enough that it can ship as a surfacing pass rather than a contract rewrite.

## Non-Goals

- No new top-level analytics route.
- No new chart family or standalone chart type in this batch.
- No analytics-contract rewrite or broad Supabase schema expansion.
- No projection-heavy or model-heavy rollout of speculative metrics such as `Future Peak Estimate` or `Meta Impact Score`.
- No universal analytics wrapper or shell rewrite across every route.
- No rework of chart provenance, fallback rules, or route-level data ownership in this batch.

## Current State

### Existing route roles

The current analytics family already has a usable split:

- `app/stats.tsx` behaves like the broad utility dashboard,
- `app/insights.tsx` behaves like the correlation and interpretation surface,
- `app/charts/index.tsx` and `app/charts/[chartKey].tsx` behave like guided exploration and visual drill-down.

That split is already good enough to support a phase-1 statistics expansion without changing route responsibilities.

### Existing server-authored data path

The repo already routes the main analytics surfaces through analytics wrappers and server-authored payloads. The design should preserve that direction and avoid reintroducing route-local analytics meaning.

### Existing metric groundwork

The repo already contains a meaningful amount of dormant or lightly surfaced metric support across:

- `utils/metricMap.ts`,
- `utils/derivedMetricsEngine.ts`,
- `utils/assistContextMetrics.ts`,
- `utils/turnOrderStats.ts`,
- existing chart metric selection and comparison components.

This means the most valuable phase-1 work is likely packaging and placement, not invention.

### Current gap

The app already shows totals, playstyle hints, correlations, and several chart comparisons, but some of the most actionable reads are not yet easy to find as first-class signals:

- recent trend versus baseline,
- how often players convert early or late advantages,
- how reliable players are under pressure,
- how much seat order or assist context affects outcomes.

## Candidate Metrics Review

The broad idea list was narrowed down using two filters:

1. does the metric answer a player-facing question quickly,
2. does the repo already appear to support the metric with low additional risk.

### Strong phase-1 candidates

- `Recent Form Delta`
- `Lead Conversion`
- `Late Lead Conversion`
- `Pressure Reliability`
- `Average Prestige Margin / Game`
- `Seat to Win Correlation`
- `Average Start Seat`
- `Tempo Control`
- `Interaction Index`
- one support-context spotlight such as `Net Support Balance` or an equivalent assist-context read

### Explicitly deferred

These may be useful later, but they should not define phase 1:

- `Trajectory Grade`
- `Future Peak Estimate`
- `Meta Impact Score`
- `Anti-Style Matchup Score`
- any new metric that needs heavy explanation before it feels trustworthy

The main reason to defer them is not that they are bad. It is that they are more abstract, more composite, and more likely to create explanation debt during a first surfacing pass.

## Proposed Design

### 1. Product framing

Phase 1 should be a surfacing pass, not a backend-expansion pass.

The design principle is:

- add a small number of stronger reads,
- place them where the existing route tone already supports them,
- avoid turning every analytics screen into another full metric grid.

This keeps the experience tighter and protects the current strengths of each route.

### 2. Stats as the quick scouting surface

`app/stats.tsx` should become the fastest place to answer "what kind of run is this player on?" and "what kind of competitor is this player right now?"

### Overview tab

The `overview` tab should gain a compact `Form & Closing` cluster.

Recommended metrics:

- `Recent Form Delta`
- `Lead Conversion`
- `Late Lead Conversion`

#### Why these belong here

These are readable at a glance, complement the existing hero/cards/top-signals pattern, and add a real story layer without creating a second dense grid.

#### Presentation expectation

This cluster should stay compact. It should feel closer to a spotlight or summary strip than a new dashboard section that competes with the full overview cards.

### Players tab

The selected-player detail in the `players` tab should gain a second block for `Pressure & Context`.

Recommended metrics:

- `Pressure Reliability`
- `Average Prestige Margin / Game`
- `Seat to Win Correlation`

#### Why these belong here

These metrics make the selected-player card feel more like a scouting surface and less like a flattened totals panel. They tell the user whether a player wins cleanly, survives tighter games, or depends on table position.

#### Behavioral expectation

This should extend the current detail card model rather than fork into a new sub-screen or accordion system.

### Playstyle tab

The `playstyle` tab should keep its current structure, but one support-context spotlight should sit alongside the existing playstyle reads.

Recommended direction:

- prefer a clear `Net Support Balance`-style read if the data is already shaped for that presentation,
- otherwise use the strongest assist-context metric that remains easy to explain in one sentence.

#### Why this belongs here

Moonrakers already captures unusually specific assist data. Surfacing one support-context signal here gives the route a more distinctive identity than repeating generic efficiency terminology.

### 3. Insights as the interpretive surface

`app/insights.tsx` should stay focused on interpretation rather than becoming another stats board.

### Structure

Keep the existing section structure:

- `Personal Correlations`
- `Macro Correlations`
- `Top Synergy Pairs`

Phase 1 should not add more tabs.

### Featured summary rows

The screen should more clearly feature these metrics in its summary and interpretation language:

- `Late Lead Conversion`
- `Tempo Control`
- `Seat to Win Correlation`
- `Interaction Index`

#### Why these belong here

These metrics invite explanation:

- closing ability,
- pace control,
- positional sensitivity,
- interaction-heavy style.

That makes them better suited to `Insights` than to a pure totals surface.

### Tone expectation

The route should continue to read like a lens or briefing, not like a spreadsheet. New rows should be framed with short interpretive copy or ranking language where helpful.

### 4. Charts as the comparison and inspection surface

Phase 1 should not add a new chart type. It should make a tighter metric batch available inside the current chart setup and chart detail flow.

### Metric batch

Recommended chart-setup additions:

- `Recent Form Delta`
- `Lead Conversion`
- `Late Lead Conversion`
- `Average Start Seat`
- `Seat to Win Correlation`

### Why this is the right level

These metrics already fit the current chart system better than more speculative projection composites:

- bar and comparison views can display them directly,
- heatmap and lineup-style comparisons can surface them without new bespoke UI,
- they strengthen the current guided chart flow instead of fragmenting it.

### Non-goal within charts

This batch should not force every chart to support every new metric equally. The goal is to expose the strongest compatible options in the current setup system, not to normalize every chart around a maximal metric matrix.

### 5. Phase-1 implementation boundary

The implementation should follow these boundaries:

- prefer existing metric registries, derived-stat helpers, and data builders,
- add display wiring before adding new computation layers,
- keep route-specific composition where it already fits the route tone,
- avoid broad refactors unless a local cleanup directly supports the feature.

### Data-path constraint

Do not widen the work into a route-provenance or fallback overhaul in this phase. If chart fallback behavior or payload shape issues appear during implementation, treat them as guardrails to work around unless they block the selected stat surfacing directly.

## Rollout Strategy

Phase 1 should be implemented in this order:

1. `Stats` surfacing
2. `Insights` summary and correlation emphasis
3. `Charts` metric exposure

### Why this order

- `Stats` gives the fastest user-visible value.
- `Insights` then makes the new signals feel intentional instead of isolated.
- `Charts` comes last because it is the broadest multiplier surface and easiest place for scope creep.

## Testing Expectations

Verification should focus on:

- route rendering with the new stat sections present,
- stable behavior when the payload omits one or more new fields,
- metric selection behavior in chart setup,
- unchanged route ownership between server-authored analytics surfaces and existing local chart presentation logic.

The goal is not full analytics revalidation. The goal is confidence that the new reads surface correctly without destabilizing the current analytics family.

## Success Criteria

This phase is successful if a user can answer these questions faster from the existing analytics family:

- who is trending upward or downward,
- who turns leads into wins,
- who performs reliably under pressure,
- who is especially sensitive to seat order or support context.

It is also successful if the expansion feels like a sharper version of the current Moonrakers analytics product, not the beginning of a different analytics system.
