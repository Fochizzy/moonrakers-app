# Moonrakers Assist Context Correlations Design

Date: 2026-05-24
Status: Approved for planning
Owner: Codex

## Summary

Add a new assist-context analytics family that explains the board state around each assist, then surface it in two places:

- player-specific Moonrakers profile intel on `app/player-profile/[playerId].tsx`
- all-play victory correlations on the server-authored Insights screen via `public.get_insights_screen(...)`

The new metric family will answer three questions:

- how close the assister was to the assisted player when the assist happened
- how far the assister was from the prestige leader when the assist happened
- how often the assister was already at `6+` prestige when assisting

These metrics should be based on reconstructed pre-assist prestige state from saved round logs, not end-of-game totals or loose proxies.

## Confirmed Product Decisions

- The user's original "points" wording is interpreted as `prestige`.
- The assist context must be measured at the moment of the assist, not from final game totals.
- The player profile page should get a dedicated `Assist Context` block rather than folding these cards into the existing `Support Profile`.
- The Insights screen should add these as new `Macro Correlations` rows, not as a new tab or a local fallback feature.
- The all-play correlations must be correlations against `victory`.

## Goals

- Build a trustworthy assist-context metric family from saved Moonrakers round data.
- Reuse one shared calculation seam for both profile detail and victory correlations.
- Keep the player profile page local/store-derived where it already is today.
- Keep the Insights correlations page server-authored where it already is today.
- Avoid guessing when old or incomplete games do not record enough assist direction data.

## Non-Goals

- Reworking the full Moonrakers Intel layout
- Replacing the current `Support Profile` cards
- Moving the player profile page onto a server-authored data contract
- Adding a brand-new Insights tab for these metrics
- Backfilling exact assist direction for legacy games that never saved it

## Current Context

The current codebase is split across two analytics surfaces:

- `app/player-profile/[playerId].tsx` and `utils/playerProfileMoonrakers.ts`
  - still compute player-specific Moonrakers intel from shared local/store game data
- `app/insights.tsx`, `components/CorrelationStats.tsx`, and `public.get_insights_screen(...)`
  - already render a server-authored correlation payload from Supabase

That split is important for this feature:

- profile detail should stay in the current local profile pipeline
- correlations should stay in the current Supabase analytics contract

## Metric Definitions

The new assist-context family has three metrics.

### 1. Assist Gap to Target

Definition:

- For each assist event, capture the assister's prestige immediately before the assist turn resolves.
- Capture the assisted player's prestige at that same pre-turn moment.
- Compute the absolute prestige difference.
- Aggregate those values as an average for player profile display.

Display label:

- `Assist Gap to Target`

Interpretation:

- Lower values mean the player tends to assist peers who are close in prestige.
- Higher values mean the player tends to assist players from a wider prestige spread.

### 2. Assist Gap to Leader

Definition:

- For each assist event, capture the assister's prestige immediately before the assist turn resolves.
- Determine the current prestige leader from the same pre-turn board state.
- Compute `leader prestige - assister prestige`.
- Aggregate those values as an average for player profile display.

Display label:

- `Assist Gap to Leader`

Interpretation:

- Lower values mean the player tends to assist while already near the lead.
- Higher values mean the player tends to assist from farther behind the current leader.

Ties:

- If multiple players are tied for the lead, use the shared leading prestige value.
- This metric is based on the gap to the leading prestige total, not on choosing one specific tied player.

### 3. Assists at 6+ Prestige

Definition:

- For each assist event, capture the assister's prestige immediately before the assist turn resolves.
- Count the event if that prestige is `>= 6`.

Display label:

- `Assists at 6+ Prestige`

Interpretation:

- This is a count, not an average.
- It measures how often the player was already established on the prestige track when they chose to assist.

## Assist Event Model

The core implementation should reconstruct assist events from saved round logs.

Recommended event shape:

```ts
type AssistContextEvent = {
  gameId: string;
  assisterId: string;
  recipientId: string;
  preAssistPrestige: number;
  recipientPrestige: number;
  leaderPrestige: number;
  gapToTarget: number;
  gapToLeader: number;
  countedAsSixPlus: 0 | 1;
};
```

Recommended per-player-per-game rollup:

```ts
type AssistContextGameSample = {
  gameId: string;
  playerId: string;
  assistCount: number;
  avgGapToTarget: number | null;
  avgGapToLeader: number | null;
  assistsAtSixPlus: number;
  winFlag: 0 | 1;
  hasTrackedAssistContext: boolean;
};
```

## Architecture

Create one shared helper that reconstructs the pre-assist board state from round logs and returns assist events plus per-game rollups.

Recommended module:

- `utils/assistContextMetrics.ts`

Recommended responsibilities:

- normalize playable rounds from `game.rounds` or `game.timeline`
- walk rounds in saved order
- maintain running prestige by player
- emit one assist event per counted assist recipient
- expose helpers for:
  - all assist events for a player
  - per-player-per-game assist-context samples

This helper should be pure and reusable. The profile layer and the server-facing analytics tests should both reason against the same metric definitions.

## Data Flow

### Shared Calculation Path

For each finished game with usable round-level assist direction:

1. initialize running prestige for all players at `0`
2. iterate rounds in saved order
3. before applying the round's prestige gain:
   - read the acting player's pre-turn prestige
   - compute the current leading prestige value
   - read each assisted recipient's pre-turn prestige
   - emit one assist event per counted assist
4. apply the round's prestige gain to the acting player
5. continue to the next round

This preserves the exact "when you assisted" meaning the user asked for.

### Player Profile Path

The player profile page should use the shared helper locally through `buildMoonrakersIntelProfile(...)`.

Recommended flow:

1. build normal `PlaystyleSample[]`
2. build assist-context events and per-game samples from the same `games`
3. filter assist events for the selected player
4. derive profile-ready labels for:
   - average gap to target
   - average gap to leader
   - total assists at `6+` prestige
5. pass those labels into a new `Assist Context` section in the Moonrakers Intel view model

### Insights Correlations Path

The Insights screen should stay server-authored.

Extend `public.get_insights_screen(profile_id uuid default auth.uid())` so its `correlations.macro` array includes:

- `Assist Target Prestige Gap vs Victory`
- `Assist Leader Prestige Gap vs Victory`
- `Assists at 6+ Prestige vs Victory`

These values should be computed from per-player-per-game assist-context samples where:

- `victory = 1` if the player won the game, else `0`
- gap metrics participate only when the player had at least one tracked assist in that game
- `assists at 6+ prestige` can be `0` in a game with tracked assist context but no qualifying event

## Correlation Definitions

The new all-play correlations should be Pearson correlations against victory, matching the current macro correlation style.

### Assist Target Prestige Gap vs Victory

For each player-game sample:

- x = average pre-assist gap to the assisted player
- y = `1` for victory, `0` otherwise

Eligibility:

- include only samples where the player had at least one tracked assist in that game

### Assist Leader Prestige Gap vs Victory

For each player-game sample:

- x = average pre-assist gap to the prestige leader
- y = `1` for victory, `0` otherwise

Eligibility:

- include only samples where the player had at least one tracked assist in that game

### Assists at 6+ Prestige vs Victory

For each player-game sample:

- x = count of assists made while already at `6+` prestige
- y = `1` for victory, `0` otherwise

Eligibility:

- include samples from games with tracked assist context
- allow `0` as a valid x-value

## UI Placement

### Player Profile

Add a new `Assist Context` block to `components/player/MoonrakersIntelSection.tsx`.

Placement:

- after `Support Profile` is acceptable, but the exact order may be tuned for readability
- do not merge these metrics into the current `Support Profile` section

Cards:

- `Assist Gap to Target`
- `Assist Gap to Leader`
- `Assists at 6+ Prestige`

Suggested sublabels:

- `Avg pre-assist prestige gap`
- `Avg gap to current leader`
- `Count before assist turns`

Empty-state behavior:

- if the player does not have enough tracked assist-direction data, show the same style of guarded empty metric card already used elsewhere in the Intel section

### Insights

Do not add a new tab.

The existing `Macro Correlations` section in `components/CorrelationStats.tsx` should render the additional rows automatically once Supabase returns them through `serverData.macro`.

## Edge Cases and Guardrails

### Missing Round Direction

Some games do not preserve enough round-level assist direction to know who helped whom.

Rule:

- skip those games for these new assist-context metrics
- do not infer direction from final totals or assist-prestige aggregates

### Zero-Assist Games

If a player never assisted in a tracked game:

- gap metrics should not fabricate `0`
- they should be treated as unavailable for profile averages and excluded from those two correlation samples

### Tied Leaders

If multiple players share the current lead:

- use the tied leading prestige value
- the metric is gap to the leading score, not gap to one chosen leader identity

### Pre-Turn Timing

All three metrics use the board state immediately before the assist turn resolves.

That means:

- do not include the current round's prestige gain in the assister's pre-assist prestige
- do not include any recipients' later round changes

## Testing Strategy

### Shared Metric Tests

Add focused unit tests for the new shared helper.

Cover:

- basic assist event reconstruction
- repeated assists in one round
- tied leaders
- zero-assist games
- skipped games with missing assist direction
- `6+` threshold behavior using pre-turn prestige, not post-turn prestige

Recommended file:

- `scripts/assist-context-metrics.test.cjs`

### Player Profile Regression

Extend the existing Moonrakers profile regression coverage to prove:

- the new section is present
- the new metrics are calculated from the intended sample data
- empty-state guarding still works

Recommended file updates:

- `scripts/player-profile-moonrakers.test.cjs`

### Insights Contract Regression

Add or extend migration/contract tests proving that `get_insights_screen(...)` emits the three new macro correlation rows.

Recommended file updates:

- `scripts/insights-correlation-sections-migration.test.cjs`
- any focused `get_insights_screen` contract test as needed

### Light Render Regression

Add a small render/source-level check that the profile UI contains the new `Assist Context` title and card labels.

## Implementation Notes

- Keep the first implementation narrow and deterministic.
- Prefer a shared pure helper over duplicating calculation logic in the profile module and SQL separately.
- On the Supabase side, mirror the same definitions as closely as possible rather than introducing a looser approximation.
- If SQL implementation needs a private helper function for reconstructing assist-context rows, keep that helper private and leave the public contract at `get_insights_screen(...)`.

## Open Assumption Locked by Approval

This design assumes that "points" means `prestige` for these statistics.

That assumption is intentional and approved because:

- round-level prestige state is available and meaningful
- the leader comparison is already prestige-based
- using final score instead would weaken the timing accuracy of "when you assisted"
