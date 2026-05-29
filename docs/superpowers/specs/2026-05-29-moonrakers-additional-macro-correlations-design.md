# Moonrakers Additional Macro Correlations Design

Date: 2026-05-29

## Summary

This design expands the published `Macro Correlations` feed on the Moonrakers `Insights` route so it can carry both assist-context correlations and the phase-1 interpretive metrics in one server-authored contract.

The change should:

1. keep `app/insights.tsx` and `components/CorrelationStats.tsx` as thin renderers over Supabase data,
2. publish both requested metric batches through `public.get_insights_screen(profile_id uuid default auth.uid())`,
3. preserve the current route structure and two-column card layout,
4. avoid reintroducing client-side fallback derivation for the Insights macro panel.

The intended result is that the existing `Macro Correlations` section can show a broader set of useful field-level signals without adding a new tab, a new local analytics engine, or a second contract path.

## Goals

- Add the assist-context macro rows to the published Insights contract.
- Add the phase-1 interpretive macro rows to the same published contract.
- Preserve the current `Macro Correlations` UI placement and interaction model.
- Reuse existing metric names and glossary targets already present in the repo.
- Keep the implementation compatible with the repo's server-authored analytics direction.

## Non-Goals

- No new Insights tab or subsection.
- No client-only correlation computation for the published macro panel.
- No visual redesign of the card grid beyond what the current component already does.
- No broad rewrite of the entire analytics rollup pipeline.
- No unrelated refactor of personal, pairing, or synergy sections.

## Current State

### Current screen contract

`app/insights.tsx` reads `payload.correlations.macro`, normalizes each row to `{ label, value }`, and passes it into `components/CorrelationStats.tsx`.

`components/CorrelationStats.tsx` already renders the macro cards from `serverData.macro` when the server payload exists. That means the visible screen is mostly done already; the missing work is the server-authored row set.

### Current macro rows

The current live overlay contract publishes four baseline macro rows:

- `Contracts / Failures Ratio vs Win Rate`
- `Assists Given vs Win Rate`
- `Assists Received vs Win Rate`
- `Early Lead vs Final Win`

### Relevant repo support already exists

The repo already contains the naming and metric groundwork needed for the requested additions:

- assist-context SQL logic in prior Moonrakers insights migrations,
- glossary and definition targets for `Late Lead Conversion`, `Tempo Control`, `Seat to Win Correlation`, and `Interaction Index`,
- derived metric formulas for the phase-1 metrics in the existing TypeScript metric registry and helpers.

### Current branch risk

This worktree already contains an in-flight migration at `supabase/migrations/20260529153000_moonrakers_insights_hybrid_personal_correlations.sql`.

That file already extends the `personal` insights rows, but it leaves the `macro` payload on the older four-row base set. The implementation for this design should extend the newest active `get_insights_screen(...)` seam instead of creating a competing parallel contract.

## Contract shape

Each published macro row should include:

- `key`
- `metricKey`
- `label`
- `value`
- `strength`

`app/insights.tsx` can continue using `label` and `value` immediately, while `key` and `metricKey` give the contract a stable identity for definitions, future summaries, and any later chart or drill-down reuse.

## Published macro list

The macro feed should contain:

- existing baseline rows,
- assist-context rows,
- phase-1 interpretive rows.

Recommended published order:

1. `Contracts / Failures Ratio vs Win Rate`
2. `Assists Given vs Win Rate`
3. `Assists Received vs Win Rate`
4. `Early Lead vs Final Win`
5. `Assist Target Prestige Gap vs Victory`
6. `Assist Leader Prestige Gap vs Victory`
7. `Assists at 6+ Prestige vs Victory`
8. `Assists Over 5 Behind Leader vs Victory`
9. `Assist Prestige Gained vs Victory`
10. `Late Lead Conversion`
11. `Tempo Control`
12. `Seat to Win Correlation`
13. `Interaction Index`

This keeps the familiar baseline first, then groups the newer support-context reads together, then ends with the broader interpretive phase-1 reads.

## Metric definitions

### Baseline macro rows

The four existing baseline rows should keep their current behavior and naming.

### Assist-context macro rows

These rows should remain Pearson correlations against victory across player-game samples, using the same assist-context logic already proven in earlier Moonrakers insights migrations.

Published rows:

- `Assist Target Prestige Gap vs Victory`
- `Assist Leader Prestige Gap vs Victory`
- `Assists at 6+ Prestige vs Victory`
- `Assists Over 5 Behind Leader vs Victory`
- `Assist Prestige Gained vs Victory`

Rules:

- gap metrics only participate when a tracked assist event exists in that player-game sample,
- `Assists at 6+ Prestige` may validly publish `0`,
- missing direction data should exclude the sample rather than fabricate assist context,
- tied leaders should use the tied leading prestige value,
- pre-assist state should be measured before the assist turn resolves.

### Phase-1 interpretive macro rows

These rows should also publish as Pearson correlations against victory across player-game samples, but they should reuse the repo's existing metric definitions instead of inventing new formulas inside the migration.

Published rows:

- `Late Lead Conversion`
- `Tempo Control`
- `Seat to Win Correlation`
- `Interaction Index`

Repo-aligned meaning:

- `Late Lead Conversion`: win conversion when late leads are established.
- `Tempo Control`: a pace-of-value-generation signal built from the repo's existing tempo-oriented metric seam.
- `Seat to Win Correlation`: correlation between starting seat and win outcome.
- `Interaction Index`: a higher-is-more-interactive composite built from contracts and assists.

The SQL implementation does not need to mirror TypeScript helper names one-for-one, but the published semantics should match the existing glossary and metric registry closely enough that the labels mean the same thing everywhere.

## Data Flow

### Server source of truth

`public.get_insights_screen(...)` remains the only source of truth for the published Insights macro panel.

Implementation should extend the current topmost `get_insights_screen(...)` migration instead of moving macro assembly back into React.

### Preferred implementation seam

The implementation should:

1. start from the newest live insights migration in the branch,
2. keep the existing `pairing`, `personal`, `macro`, and `synergyPairs` payload structure,
3. expand `macro_payload` to include the requested rows,
4. preserve the existing overwrite behavior where live computed rows replace or intentionally fall back to older persisted payload arrays.

### UI consumption

No new route wiring is required if the macro rows continue to publish in `correlations.macro`.

The current normalizers in `app/insights.tsx` and the current card grid in `components/CorrelationStats.tsx` should be sufficient, though the normalizer may be safely widened to preserve `key` and `metricKey` if that helps future-proof the contract.

## Error Handling And Guardrails

- If the sample is too small to compute a meaningful correlation, publish `0` with the existing `Light` strength behavior rather than breaking the array shape.
- Do not infer assist direction from final totals or aggregate prestige alone.
- Do not drop the existing baseline macro rows while adding the new rows.
- Do not let the newer macro calculation accidentally get overwritten by an older persisted `existing_macro` array when fresh live rows are available.
- If the in-flight hybrid personal migration remains in the branch, implementation should extend that file or supersede it cleanly in a newer migration rather than silently duplicating the function body in a conflicting way.

## Testing Strategy

Add or extend focused contract tests that prove:

- the newest insights migration exists,
- the patched `get_insights_screen(...)` migration publishes all requested macro labels,
- the `correlations` payload still includes `personal`, `pairing`, `macro`, and `synergyPairs`,
- the new phase-1 labels align with existing definition targets,
- the assist-context labels remain definition-resolvable where aliases already exist.

Recommended verification layers:

- static contract test for the migration text,
- existing Insights UI regression tests to confirm the macro tab still renders server-authored rows,
- live Supabase verification after the migration is applied when the current environment permits it.

## Implementation Notes

- Prefer a fresh follow-up migration dated after the current in-flight hybrid personal migration if that file is meant to stay.
- Preserve user changes already present in the dirty worktree.
- Keep the React edits minimal unless a small normalizer change is needed to preserve row keys.
