# Dedicated Base Analysis Section Design

Date: 2026-04-26
Repo: `C:\Users\izzyh\Desktop\moonrakers-app`
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will add a dedicated `Base Analysis` section to the stats experience by evolving the current playstyle surface in [components/stats/PlaystyleSection.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/stats/PlaystyleSection.tsx). This section will become the deep-dive home for stay-at-base behavior, while the player profile will keep using [components/player/MoonrakersIntelSection.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/player/MoonrakersIntelSection.tsx) as the compact summary layer.

The design keeps one analytics pipeline:

- [utils/playstyleEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playstyleEngine.ts) remains the source of truth for `stayAtBaseTurns`, `playableTurns`, and `stayAtBaseRate`.
- [utils/playstyleCorrelationEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playstyleCorrelationEngine.ts) remains the home for base-rate correlation rows.
- [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx) remains the deep-dive league analysis surface.
- [utils/playerProfileMoonrakers.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playerProfileMoonrakers.ts) remains the compact player-summary layer.

The first version does not push base metrics into the generic chart hub. It focuses on making the stats page the clear place to answer:

- how often a player stays at base,
- what happens when they do,
- what happens when they do not,
- and whether those patterns shift by table context.

## Goals

- Turn the current playstyle area into a clearer, dedicated `Base Analysis` surface.
- Keep the stats screen as the deep-dive analysis page for stay-at-base behavior.
- Keep the player profile as a compact scouting summary instead of a second full analysis surface.
- Reuse the current playstyle sample pipeline instead of creating a second base-specific dataset.
- Add context that helps explain base behavior, especially table-size and seat-based differences.
- Stay conservative in scope and avoid unnecessary churn in the shared chart system.

## Non-Goals

- Replacing the current stats screen structure outside the playstyle/base area.
- Rebuilding the generic chart hub around new base-specific metric keys in this pass.
- Replacing `Moonrakers Intel` with a second deep-dive profile page.
- Inferring causation from base-rate correlations.
- Renaming current files just to match the new product copy.

## Confirmed Product Decisions

- The user wants a dedicated base-analysis section that stays alongside the current stats and player-intel surfaces.
- The stats screen owns the detailed base-analysis experience.
- The player profile stays compact and continues surfacing headline base reads only.
- The current playstyle pipeline should remain the underlying source of truth.
- The generic chart route should stay untouched for now unless later work explicitly promotes base metrics into that shared system.
- This pass should be conservative and should prefer restructuring existing surfaces over inventing a parallel analytics stack.

## Current Context

The active stats page in [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx) already mounts [components/stats/PlaystyleSection.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/stats/PlaystyleSection.tsx) as its own tab-level surface. That component already:

- builds `PlaystyleSample[]` from `players` and `games`,
- computes personal correlations for the selected player,
- computes global correlations across all player-game rows,
- renders summary cards, insight bullets, and scatter plots.

The active player profile in [app/player-profile/[playerId].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/player-profile/[playerId].tsx) separately builds those same playstyle samples and passes them into [utils/playerProfileMoonrakers.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playerProfileMoonrakers.ts), which already produces:

- playstyle summary,
- best and worst conditions,
- base discipline summary,
- objective profile,
- support profile.

This means the repo already has:

- a solid sample model,
- a compact profile summary layer,
- a first-pass league analysis layer,
- and enough context data to support a stronger dedicated base section without adding a new datastore.

## Recommended Direction

Evolve the current `PlaystyleSection` into a true `Base Analysis` section on the stats screen.

This is the recommended direction because it:

- keeps the existing data path intact,
- gives the stats screen a clearer identity,
- prevents the player profile from becoming overloaded,
- and avoids premature generic-chart refactors.

Alternative approaches were considered and rejected for now:

- A brand-new sibling section next to `Playstyle`
  - Rejected because it would split one concept across two surfaces and duplicate logic.
- Promoting base metrics into the generic chart hub first
  - Rejected because the current generic chart stack does not yet expose base metrics as first-class shared metric options, so that path adds more plumbing than value for this ask.

## Architecture

### Source Of Truth

Keep one source of truth for base behavior:

- [utils/playstyleEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playstyleEngine.ts)

It already computes:

- `stayAtBaseTurns`
- `playableTurns`
- `stayAtBaseRate`
- `tableSize`
- `seat`
- `winFlag`
- `totalPrestige`
- `objectivePoints`
- `assistsGiven`
- `assistsReceived`

That is enough to power the dedicated section without introducing a second event-processing layer.

### Analysis Helpers

Keep [utils/playstyleCorrelationEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playstyleCorrelationEngine.ts) as the home for correlation rows that answer:

- when base rate rises, what tends to happen for a selected player,
- and what tends to happen globally.

Add lightweight grouping helpers only if needed for the new context panels. Those helpers should operate on `PlaystyleSample[]` and remain pure. They should not mutate existing engine responsibilities and should not spill into the generic chart stack.

### UI Ownership

- [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx) keeps owning the detailed analysis experience.
- [components/stats/PlaystyleSection.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/stats/PlaystyleSection.tsx) becomes the presentation layer for the full `Base Analysis` section.
- [utils/playerProfileMoonrakers.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playerProfileMoonrakers.ts) continues turning the same samples into profile-friendly summary cards.
- [components/player/MoonrakersIntelSection.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/player/MoonrakersIntelSection.tsx) stays summary-only.

### File Strategy

Keep the current file paths for the first implementation pass.

That means:

- it is acceptable for the UI to say `Base Analysis` even if the component file is still named `PlaystyleSection.tsx`,
- helper names can stay stable where possible,
- and a later cleanup pass can rename files if the code structure proves stable.

This reduces churn in a repo that already has active unrelated work.

## Section Structure

The dedicated stats surface should be organized into four panels, in this order:

1. `Base Overview`
2. `Base Decision Splits`
3. `Base Correlations`
4. `Base Context`

This preserves the current one-page scanning behavior while making each panel answer a distinct question.

## Base Overview

Purpose: explain the selected player's overall stay-at-base identity at a glance.

Recommended cards:

- `Base Rate`
- `Base Turns / Game`
- `Tracked Games`
- `Usable Base-Rate Games`
- `With Base Games`
- `Without Base Games`
- `Style Read`

Recommended compare text:

- `You: 18% base rate | Global: 11%`

Recommended behavior:

- Show the selected player's rate next to the global rate.
- Preserve a short style label such as `Rarely stays home`, `Balanced resets`, or `Reset-heavy`.
- Surface coverage clearly when not every tracked game has valid `playableTurns`.

## Base Decision Splits

Purpose: answer the simplest practical question first:

- what happens when this player has any base turns,
- and what happens when they have none.

This panel should compare `with base` vs `without base` for:

- win rate,
- average prestige,
- objective points,
- assists given,
- assists received.

Recommended layout:

- paired cards or rows with `With Base` on one side and `Without Base` on the other,
- each row also shows sample size,
- insufficient sample states remain explicit rather than showing overconfident values.

Recommended headline values:

- `Win Rate With Base`
- `Win Rate Without Base`
- `Prestige With Base`
- `Prestige Without Base`
- `Objectives With Base`
- `Objectives Without Base`
- `Support Given With Base`
- `Support Given Without Base`
- `Support Received With Base`
- `Support Received Without Base`

This panel is the fastest path to user value because it explains base behavior in concrete before-and-after terms.

## Base Correlations

Purpose: answer the more nuanced question:

- when the player's base rate rises, what tends to happen across their sample,
- and how does that compare with the broader field.

This panel should preserve the current personal/global framing.

### Personal Scope

Keep correlation rows and charts for the selected player's own games.

Recommended personal correlations:

- `Stay at Base vs Wins`
- `Stay at Base vs Prestige`
- `Stay at Base vs Objective Points`

Recommended personal charts:

- scatter: `Stay at Base Rate vs Prestige`
- scatter: `Stay at Base Rate vs Objective Points`
- no extra bucketed win-rate chart in the first pass

### Global Scope

Keep global player-game correlations for the field-wide view.

Recommended global correlations:

- `Stay at Base vs Wins`
- `Stay at Base vs Prestige`
- `Stay at Base vs Objective Points`
- `Stay at Base vs Assists Given`
- `Stay at Base vs Assists Received`

Recommended global charts:

- scatter: `Stay at Base Rate vs Assists Given`
- scatter: `Stay at Base Rate vs Assists Received`

### Compare Framing

Where useful, each global row should make it easy to compare the player's signal against the field:

- `Global: weak positive`
- `You: moderate negative`

The language should describe association only and stay sample-aware.

## Base Context

Purpose: explain when base behavior changes, not just what the average says.

This panel should group the same sample data by:

- `table size`
- `seat band`
- the same explicit split counts already surfaced in `Base Overview` and `Base Decision Splits`

Recommended context groups:

- `2p`
- `3p`
- `4p`
- `5p+`

Recommended seat bands:

- `Early`
- `Middle`
- `Late`

Recommended per-group values:

- sample size,
- average base rate,
- average prestige,
- win rate.

Recommended UI treatment:

- compact context cards or grouped strips,
- no need for a brand-new shared chart type in this pass,
- small pure helpers can derive these grouped rows from `PlaystyleSample[]`.

This is the new panel that most clearly separates `Base Analysis` from the earlier playstyle surface.

## Player Profile Relationship

The player profile should stay compact.

The current `Moonrakers Intel` block already includes:

- base turns per game,
- base rate,
- win rate with base,
- win rate without base,
- prestige with base,
- prestige without base.

That is the right level for the profile page.

The profile should not take on:

- deeper personal/global comparisons,
- multiple scatter plots,
- or a full context breakdown by table size and seat.

The intended product split is:

- `Stats` explains the full base story.
- `Player Profile` surfaces the headline scouting read.

## Data Flow

The intended flow stays simple:

1. [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx) passes `players`, `games`, `leaderboard`, and `selectedPlayerId` into the stats section.
2. [components/stats/PlaystyleSection.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/stats/PlaystyleSection.tsx) builds `PlaystyleSample[]` from [utils/playstyleEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playstyleEngine.ts).
3. The section computes:
   - overview values,
   - split summaries,
   - personal correlation rows,
   - global correlation rows,
   - context groupings.
4. The section renders those values in the four-panel `Base Analysis` layout.
5. The player profile independently reuses the same samples through [utils/playerProfileMoonrakers.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/playerProfileMoonrakers.ts) for compact summary output.

This keeps one analytics model while allowing two UI depths.

## Edge Cases

- If a player has too few tracked games overall, show a clear empty state instead of a partial analysis wall.
- If a player has tracked games but too few valid `playableTurns`, show coverage notes and suppress misleading rate-based claims.
- If `with base` or `without base` buckets do not meet minimum sample thresholds, show `Not enough games yet`.
- If imported games lack round history but include totals-level base data, keep using the existing fallback path that reads `turnsAtBase` from totals.
- If a correlation has no meaningful variance, show a guarded flat or neutral state instead of force-rendering a fake signal.
- If a player has no valid personal base-rate samples, keep the global panel visible and suppress only the personal panel output.

## Testing Strategy

Verification should stay focused and honest.

### Pure Helper Coverage

Add or extend pure tests for:

- `buildPlaystyleSamples(...)`
  - explicit `turnsAtBase` fallback,
  - derived base turns from rounds,
  - exclusion of bonus-objective rows from playable turns,
  - imported-game fallback behavior.
- split-summary helpers
  - with-base vs without-base buckets,
  - sample-size guards,
  - empty and one-sided bucket behavior.
- context-group helpers
  - table-size grouping,
  - seat-band grouping,
  - sample-size guards.
- `buildPersonalPlaystyleCorrelations(...)`
  - enough data,
  - insufficient data,
  - flat signal handling.
- `buildGlobalPlaystyleCorrelations(...)`
  - enough data,
  - insufficient data,
  - flat signal handling.

### Screen-Level Smoke Checks

Verify the stats screen still renders correctly for:

- no games,
- a few saved games,
- mixed imported and manual games,
- player selection changes.

Verify the player profile still renders its compact Moonrakers block from the same playstyle sample set.

### Honesty Rule

Completion language must stay precise:

- if verification was only code-level, say so,
- if live UI validation did not happen, say so,
- and do not claim base behavior is fully proven without sample-aware checks.

## Rollout Outcome

When complete, Moonrakers will have a dedicated `Base Analysis` section that is easier to understand than the current playstyle surface and better aligned with how the repo already thinks about stats:

- the stats page becomes the real analysis home for base behavior,
- the player profile remains a fast scouting summary,
- and both surfaces continue to rely on the same playstyle sample pipeline.

This delivers clearer answers without forcing a larger chart-system rewrite.
