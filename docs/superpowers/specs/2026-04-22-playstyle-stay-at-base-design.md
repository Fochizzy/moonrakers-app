# Moonrakers Playstyle Stay-At-Base Analysis Design

Date: 2026-04-22
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will add a dedicated `Playstyle` section to the stats experience. This section will focus on how often a player stays at base and what that behavior lines up with in actual recorded games.

The first version centers on two scopes shown on the same page:

- `Personal`
  - The selected player's own game history.
- `Global`
  - All player-game samples across the full dataset.

The section will analyze the relationship between `stayAtBaseRate` and five outcome metrics:

- wins,
- prestige,
- objective points,
- assists given,
- assists received.

This is a behavior-analysis feature, not a replacement for the existing leaderboard and correlation tabs. The existing leaderboard engines stay intact. The new section gets its own per-game playstyle data layer so it can answer "when this player stays at base more, what tends to happen?" without distorting current lifetime rollups.

## Confirmed Product Decisions

- Add a dedicated `Playstyle` section instead of folding this into the existing correlation tab.
- Render it as one scrollable page with `Personal` first and `Global` second.
- Include both personal and global analysis for the same stay-at-base correlation set.
- Treat `Personal` as true per-player-over-time analysis across that player's own games.
- Treat `Global` as analysis across all player-game samples, not player lifetime averages.
- Keep `objective points` as a distinct metric instead of folding it into contracts or base turns.
- Count bonus-objective data toward `objective points`, but never as extra base turns.
- Add stay-at-base relationships for both `assists given` and `assists received`.
- Suppress strong claims on low-sample or no-variation datasets.

## Goals

- Add a behavior-focused stats section that explains the effect of staying at base.
- Show the selected player's stay-at-base profile and compare it with the full field.
- Formalize `objective points` as a supportable stat for analysis.
- Use the newly normalized `turnsAtBase` data for completed, imported, and future games.
- Keep the existing stats, leaderboard, and correlation experiences stable.

## Non-Goals

- Replacing the current leaderboard, player, or game correlation systems.
- Rebuilding all existing analytics around a new universal model.
- Inferring causation from correlations.
- Fabricating rate-based metrics for games that do not have enough turn history.
- Expanding this first pass into every possible playstyle dimension.

## Current Architecture Context

The current stats surface in [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx) already organizes leaderboard, player, correlation, and game-level views. Those views are built primarily from:

- [utils/statsEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/statsEngine.ts)
- [utils/derivedMetricsEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/derivedMetricsEngine.ts)
- [utils/correlationEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/correlationEngine.ts)
- [utils/individualCorrelationEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/individualCorrelationEngine.ts)
- [utils/gameCorrelationEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/gameCorrelationEngine.ts)

Important constraints from the current code:

- `buildGlobalCorrelations(...)` works from per-player lifetime rollups, not per-game samples.
- `buildIndividualCorrelations(...)` is not a true per-player history engine. It compares a selected player against the peer group.
- `turnsAtBase` now exists as a normalized totals metric and can also be derived from rounds where `contracts = 0` and `failures = 0`, excluding `bonusObjective` rows.
- Bonus objective data is stored through the round model in [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx), using `metaType: 'bonusObjective'` and `objectiveCount` or `objectivePrestige`.

Because of those boundaries, a dedicated playstyle pipeline is cleaner than extending the existing lifetime correlation engines.

## Recommended Architecture

### Core Direction

Add a separate playstyle-specific analysis layer composed of:

- `utils/playstyleEngine.ts`
  - Builds normalized player-game playstyle samples from saved games.
- `utils/playstyleCorrelationEngine.ts`
  - Computes personal and global stay-at-base correlations from those samples.
- `utils/playstyleInsights.ts`
  - Converts correlation output into guarded insight text.
- [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx)
  - Adds the new `Playstyle` section and renders the final UI blocks.

### Why This Split

This keeps responsibilities clear:

- `statsEngine` remains the home for leaderboard-style totals.
- `derivedMetricsEngine` remains focused on player rollups.
- existing correlation engines remain valid for their current lifetime-comparison use cases.
- the playstyle layer owns per-game behavioral analysis and can evolve without distorting current stats models.

## Data Model

### Playstyle Sample

The core row for this feature is one `player-game` sample:

```ts
type PlaystyleSample = {
  gameId: string;
  playerId: string;
  playerName: string;
  tableSize: number;
  seat: number | null;
  winFlag: 0 | 1;
  totalPrestige: number;
  objectivePoints: number;
  assistsGiven: number;
  assistsReceived: number;
  stayAtBaseTurns: number;
  playableTurns: number;
  stayAtBaseRate: number | null;
};
```

This is the base unit for both the `Personal` and `Global` views.

### Metric Definitions

- `stayAtBaseTurns`
  - Use the normalized `turnsAtBase` metric when explicitly present.
  - Otherwise derive it from non-bonus rounds where `contracts === 0` and `failures === 0`.
- `playableTurns`
  - Count only the player's non-bonus rounds.
  - `bonusObjective` rows never count as playable turns.
- `stayAtBaseRate`
  - `stayAtBaseTurns / playableTurns`
  - If `playableTurns <= 0`, store `null` and exclude the sample from rate-based analysis.
- `winFlag`
  - `1` if the player won the game, otherwise `0`.
- `totalPrestige`
  - Use the same total-prestige resolution rules already used in stats engines.
- `objectivePoints`
  - Preferred future source: explicit `objectivePoints` if introduced at the totals layer.
  - Current supported source: sum round-level `objectiveCount` or `objectivePrestige` values for that player, including bonus-objective rows.
  - This is a separate metric from `contracts`.
- `assistsGiven`
  - Per-game assist total for the player.
- `assistsReceived`
  - Per-game assist-prestige-received count or equivalent received-support stat already used by stats engines.

### Coverage Rules

Some games may have totals but not enough round history to calculate `playableTurns`. Those games can still contribute to non-rate totals elsewhere in the app, but they must be excluded from `stayAtBaseRate` correlations. The UI should expose this honestly as a coverage note rather than silently pretending every game had usable turn history.

## Correlation Model

### Required Correlation Set

For both scopes, compute:

- `stayAtBaseRate vs wins`
- `stayAtBaseRate vs prestige`
- `stayAtBaseRate vs objectivePoints`
- `stayAtBaseRate vs assistsGiven`
- `stayAtBaseRate vs assistsReceived`

### Personal Scope

`Personal` means:

- filter `PlaystyleSample[]` to the selected player,
- keep only samples with a usable `stayAtBaseRate`,
- correlate the player's stay-at-base rate across their own games against each outcome metric.

This answers questions like:

- "When this player stays at base more, do they personally win more or less?"
- "Does their prestige go up or down?"
- "Do they become more support-oriented?"

### Global Scope

`Global` means:

- use all valid `PlaystyleSample[]` rows across all players,
- correlate the same five metric pairs across the whole dataset.

This answers questions like:

- "Across everyone, what tends to happen when stay-at-base rate rises?"
- "Is this player's pattern stronger, weaker, or opposite to the overall field?"

### Statistical Guardrails

- Personal correlation cards require at least `5` valid games for that player.
- Global correlation cards require at least `10` valid player-game samples.
- If either side of a correlation has no usable variance, show a guarded neutral state instead of a misleading numeric claim.
- Correlation text must describe association only, never causation.

## UI Design

### Placement

Add `Playstyle` as a new top-level section in [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx). It should not replace the existing `Correlations` tab. This is a parallel behavioral analysis surface.

### Page Flow

The section should render as one scrollable page in this order:

1. `Header summary`
2. `Personal playstyle`
3. `Global playstyle`
4. `Context and takeaways`

### Header Summary

Show fast-read cards for the selected player:

- `Base Rate`
- `Base Turns / Game`
- `Prestige / Game`
- `Objective Points / Game`
- `Coverage` note whenever not every game had usable turn history

Also show a short compare line such as:

- `You: 18% base rate | Global: 11%`

### Personal Playstyle Block

This block should lead with five correlation cards grouped into two bands:

- `Primary outcomes`
  - Base Rate vs Wins
  - Base Rate vs Prestige
  - Base Rate vs Objective Points
- `Support profile`
  - Base Rate vs Assists Given
  - Base Rate vs Assists Received

Under the cards, show:

- a scatter chart for `stayAtBaseRate vs prestige`,
- a scatter chart for `stayAtBaseRate vs objectivePoints`,
- a bucketed chart for `stayAtBaseRate vs win rate`.

Recommended win-rate buckets:

- `0%`
- `1-10%`
- `11-25%`
- `26%+`

If the user does not have enough samples, collapse charts into a guarded empty state instead of rendering noisy low-value plots.

### Global Playstyle Block

Mirror the same five correlation cards using global player-game data. This block should make comparison easy, not require a second screen.

Each correlation card should show:

- the global value,
- the player's personal value when available,
- a delta or compare statement.

Example:

- `Global: weak positive`
- `You: moderate negative`

### Context And Takeaways

Close the section with short natural-language interpretations:

- `Personally, higher base rates are mildly tied to lower prestige.`
- `Globally, base rate has little relationship to winning.`
- `Your base-rate link to assists received is stronger than the field average.`

These should be generated from the playstyle insight layer with sample-size and variance guards.

## Insight Behavior

### Tone Rules

Insight copy must:

- label whether a claim is `Personal` or `Global`,
- avoid implying causation,
- avoid overclaiming on weak correlations,
- clearly state when data is limited.

### Strength Labels

Reuse the app's existing concept of correlation strength where practical:

- `Minimal`
- `Weak`
- `Moderate`
- `Strong`
- `Very Strong`

### Low-Signal States

When data is insufficient or flat, prefer:

- `Not enough data yet`
- `No meaningful relationship yet`
- `Not enough variation yet`

over printing a raw `0.00` with a confident sentence.

## Error Handling

- Skip corrupted rounds or malformed numeric values rather than crashing the section.
- Clamp rate inputs to a sane `0..1` range after calculation.
- Treat missing `playableTurns` as unusable for rate analysis, not as zero-base play.
- If the selected player has no valid playstyle samples, show an empty state for `Personal` while keeping `Global` visible.
- If global coverage is too small, hide global insight claims and show a guarded placeholder.

## Testing Strategy

Add focused tests for the new playstyle layer:

- sample-building tests for:
  - explicit `turnsAtBase`,
  - derived stay-at-base rounds,
  - exclusion of `bonusObjective` rows from base-turn counts,
  - inclusion of objective-point rows in `objectivePoints`,
  - missing-turn-history coverage behavior.
- correlation tests for:
  - personal scope using one player's own games,
  - global scope using all player-game rows,
  - low-sample suppression,
  - no-variance suppression.
- UI-level tests or light render coverage for:
  - Personal-first page order,
  - grouped `Primary outcomes` and `Support profile` cards,
  - guarded empty states.

## Implementation Notes

- Prefer pure helpers for sample construction and correlation calculation so this logic is easy to test outside the React tree.
- Do not retrofit this logic into `buildIndividualCorrelations(...)`; that function serves a different purpose today.
- If the app later formalizes `objectivePoints` in totals, the playstyle engine should prefer the explicit totals field and keep the round-based calculation as a fallback for older data.

## Rollout Outcome

When complete, the app will have a dedicated playstyle view that answers a concrete question the current stats stack cannot answer well: how stay-at-base behavior relates to winning, scoring, objectives, and support patterns for a specific player and across the broader league.
