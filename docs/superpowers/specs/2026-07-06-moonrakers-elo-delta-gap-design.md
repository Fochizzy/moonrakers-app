# Moonrakers ELO Delta And Matchup Gap Design

Date: 2026-07-06
Status: Approved for spec review
Owner: Codex

## Summary

The Moonrakers ELO chart should do more than show absolute rating progression. It should also let the user inspect:

- `Delta`: the focused player's game-by-game ELO change over time
- `Gap`: the focused player's ELO gap versus the average ELO of that game's opponents

The chosen direction keeps the current ELO chart intact and adds compact in-chart mode tabs for `ELO`, `Delta`, and `Gap`. `ELO` remains the default view. `Delta` and `Gap` reuse the same selected-game inspector and x-axis rather than adding separate charts or a second analytics surface.

## Confirmed Product Decisions

- The existing ELO line chart stays in place as the default view.
- New metrics should live inside the same chart card, not as extra stacked charts below it.
- `Delta` means game-to-game ELO change for the focused player.
- `Gap` means the focused player's post-game ELO minus the average post-game ELO of that game's opponents.
- Multi-opponent games should be represented by one gap value per game, using the opponent average instead of separate lines per opponent.

## Goals

- Preserve the existing ELO chart as the main experience.
- Add a clear way to switch between absolute rating, rating change, and matchup gap.
- Keep the chart readable for both two-player and multi-player games.
- Reuse the current per-game ELO snapshot flow instead of inventing a second ELO data model.
- Add focused regression coverage for the new derived series and the visible chart controls.

## Non-Goals

- Replacing the ELO chart with a new analytics screen
- Showing one separate gap line per opponent in the same game
- Reworking the broader ELO screen cards, leaderboard, or server-authored payload
- Changing how game participation filtering works for the focused player
- Recomputing ELO from a different rating algorithm

## Current Context

The current ELO chart path already does three useful things:

- `components/charts/ELO/buildEloChartState.ts` filters games to the focused player and derives missing `eloSnapshot` values locally
- `components/charts/ELO/EloChart.tsx` owns chart state and selected-game behavior
- `components/charts/ELO/EloChartPlot.tsx` already supports mode-aware value formatting and a selected-game inspector

The main gap is that the current state builder only exposes absolute ELO series and hardcodes the chart into `elo` mode, even though the plot already has room for alternate numeric modes.

## UX Design

### Mode Rail

The ELO chart should render a compact three-tab rail inside the existing card:

- `ELO`
- `Delta`
- `Gap`

Behavior rules:

- `ELO` is selected by default.
- Tapping a tab updates the plotted values immediately without leaving the chart.
- The x-axis remains game order.
- The selected-game beam and tap targets continue to work exactly as they do now.

### Inspector Behavior

The inspector card under the chart should adapt to the selected mode:

- `ELO`: show the focused player's rating at the selected game, along with peak and cumulative delta context
- `Delta`: show the focused player's rating change for the selected game
- `Gap`: show whether the focused player sat above or below the average opponent rating at the selected game

The legend should stay compact. In `ELO` mode it can continue showing the visible player lines. In `Delta` and `Gap` modes it should emphasize the focused player rather than pretending every opponent has an equivalent matchup-gap series.

## Data Design

### Derived Values

For the focused player only, derive two new arrays from the already-built per-game snapshots:

- `eloDeltaSeries[index]`
  - `0` for the first visible game
  - otherwise `focusedPlayerEloAtGame[index] - focusedPlayerEloAtGame[index - 1]`
- `matchupGapSeries[index]`
  - `focusedPlayerEloAtGame[index] - average(opponentElosAtGame[index])`
  - if a game has no valid opponents after filtering, fall back to `0`

These values should be based on the same post-game `eloSnapshot` values already used for the absolute ELO lines so the three views stay internally consistent.

### Multi-Player Games

For games with more than one opponent:

- gather all participants in that focused game except the focused player
- read each opponent's post-game ELO from that game's snapshot
- average those opponent values
- subtract that average from the focused player's post-game ELO

This produces one stable gap point per game and avoids turning one game into multiple mismatch points.

## Architecture

### State Builder

`components/charts/ELO/buildEloChartState.ts` should become the single place that derives:

- absolute ELO series for all visible players
- focused-player delta series
- focused-player matchup-gap series
- min/max ranges for the currently selected mode

It should expose enough mode-aware state that the plot layer does not need to know how to recompute matchup data on its own.

### Chart Container

`components/charts/ELO/EloChart.tsx` should own:

- the selected mode
- the selected game index
- the chart state rebuild when games, players, or focused player change

This keeps the chart interactive without leaking mode state upward into the broader ELO screen unless the team later chooses to do that intentionally.

### Plot Layer

`components/charts/ELO/EloChartPlot.tsx` should stay mostly presentation-focused:

- render the mode tabs passed from the container
- plot the correct series for the active mode
- reuse the existing selection beam, circles, and inspector shell
- adjust legend and inspector copy based on mode

The plot should not become responsible for figuring out who counted as an opponent or how to average them.

## Error Handling And Edge Cases

- If there are no games or no players, keep the existing empty state.
- If the focused player is missing from a game's snapshot, treat that point as `0` only after the existing derived-snapshot path has had a chance to fill it in.
- If a focused game has no opponent values after normalization, `Gap` should show `0` instead of crashing or omitting the point.
- The first visible `Delta` point should be `0` so the time series length always matches the game count.
- If all values in `Delta` or `Gap` are identical, continue using padded min/max range logic so the line remains visible.

## Testing Strategy

Add focused regression coverage in two layers.

### Derived-State Tests

Extend or add a script test around `buildEloChartState` that proves:

- focused-player filtering still removes unrelated games
- `Delta` is computed as game-to-game ELO movement
- `Gap` is computed as focused-player ELO minus average opponent ELO
- multi-player games use the average of all opponents, not only the first opponent

Recommended cases:

- a two-player sequence for easy delta verification
- a three-player or four-player game for opponent-average verification

### Visible Chart Wiring Tests

Add a narrow source-level test that proves the ELO chart exposes:

- a mode rail with `ELO`, `Delta`, and `Gap`
- local selected-mode state in `components/charts/ELO/EloChart.tsx`
- mode-aware rendering in `components/charts/ELO/EloChartPlot.tsx`

Keep these tests tight and route-free. This feature is local chart behavior, not a navigation rewrite.

## Risks And Mitigations

### Risk: Gap becomes visually noisy if every player gets a matchup-gap line

Mitigation:

- keep `Gap` focused on the selected player only
- preserve all-player lines only for raw `ELO` mode

### Risk: Delta and gap ranges flatten or look broken on small samples

Mitigation:

- reuse padded min/max range handling for constant or near-constant series

### Risk: Derived opponent averages drift from the visible game filter

Mitigation:

- compute `Gap` only from the same filtered, normalized game list already returned by `buildEloChartState`
- read opponents from the same participant set used to build those game snapshots

## Rollout Recommendation

Implement this as one narrow ELO-chart enhancement:

1. write failing focused tests for derived `Delta` and `Gap` behavior
2. extend `buildEloChartState.ts` with focused-player delta and matchup-gap derivation
3. add a compact mode rail in `EloChart.tsx`
4. update `EloChartPlot.tsx` to render mode-aware series, legend behavior, and inspector copy
5. run the focused ELO chart tests and any touched chart source guards before claiming the change is complete
