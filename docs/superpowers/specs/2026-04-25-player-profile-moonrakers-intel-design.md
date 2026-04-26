# Player Profile Moonrakers Intel Design

Date: 2026-04-25
Repo: `C:\Users\izzyh\Desktop\moonrakers-app`

## Summary

Add a new inline `Moonrakers Intel` block to the player profile screen so the page explains how a player actually performs in Moonrakers, not just how their ELO moves. The new block will live inside `app/player-profile/[playerId].tsx`, keep the existing rating-focused tabs intact, and add six Moonrakers-specific profile sections:

- Playstyle
- Best Condition
- Worst Condition
- Base Discipline
- Objective Profile
- Support Profile

This work should reuse the current stay-at-base analytics path and existing game/totals data instead of inventing a new data contract.

## Goals

- Keep the current player profile page stable while adding Moonrakers-specific intelligence.
- Reuse the existing `PlaystyleSample` model and stay-at-base data path where possible.
- Make the new sections readable in dense profile-card form instead of introducing more tabs.
- Prefer trustworthy, sample-gated insights over broad but noisy claims.

## Non-Goals

- Replacing the current ELO/rating profile system
- Moving the league-wide Playstyle surface out of `app/stats.tsx`
- Adding card-level, contract-type, or mission-type analytics
- Reworking the entire player profile page layout

## Current Context

The active player profile screen in `app/player-profile/[playerId].tsx` is centered on ELO and rating-context concepts:

- `Leaderboard`
- `Momentum`
- `Skills`
- `Context`
- `Projection`

The page already supports:

- player hero identity
- featured and secondary insight cards
- dense metric card grids
- recent games list
- optional opponent filter inside the `Context` tab

The stats page now has an inline league-level `PlaystyleSection`, but the player profile still lacks a player-specific Moonrakers identity block.

## Proposed Placement

Add a new `Moonrakers Intel` block to `app/player-profile/[playerId].tsx`.

Placement order:

1. existing hero and current profile header content
2. existing ELO/rating tabs and their featured/custom cards
3. new `Moonrakers Intel` block
4. existing recent games section

This keeps the page flow as:

- who this player is
- how their rating story looks
- how they actually play Moonrakers
- what their recent games were

## UI Structure

The new block should not introduce additional tabs.

Instead, `Moonrakers Intel` should use the same dense card language already present on the page:

- one section header
- compact 2-card rows where possible
- short labels
- one strong value per card
- one short subline for interpretation

The block will contain six sub-sections.

### 1. Playstyle

Purpose: show the player's high-level Moonrakers fingerprint.

Cards:

- Direct Prestige / Game
- Assist Prestige Received / Game
- Objective Points / Game
- Base Turns / Game
- Base Rate
- Simple style read such as `Direct`, `Support`, `Objective`, or `Balanced`

### 2. Best Condition

Purpose: name the strongest supported condition for that player.

Candidate split families:

- table size
- seat band
- base vs no-base
- objective vs no-objective

Display:

- best condition label
- win rate in that condition
- average prestige in that condition
- sample size

Example labels:

- `Best in 4p`
- `Best from Early Seat`
- `Best with Base Turns`
- `Best with Objectives`

### 3. Worst Condition

Purpose: name the weakest supported condition for that player.

Uses the same candidate families and display structure as `Best Condition`.

Example labels:

- `Worst in 2p`
- `Worst from Late Seat`
- `Worst without Base Turns`
- `Worst without Objectives`

### 4. Base Discipline

Purpose: show how the player behaves when they stay at base and what that tends to do.

Cards:

- Base Rate
- Base Turns / Game
- Win Rate With Any Base Turn
- Win Rate Without Base Turns
- Prestige With Base
- Prestige Without Base

### 5. Objective Profile

Purpose: show how much the player depends on bonus objectives and what happens when they score them.

Cards:

- Objective Points / Game
- Games With Objectives
- Win Rate With Objectives
- Win Rate Without Objectives
- Prestige With Objectives
- High Objective Games

`High Objective Games` means games where the player scored at least 2 objective points, if sample size is sufficient.

### 6. Support Profile

Purpose: describe how the player supports others and receives support.

Cards:

- Assists Given / Game
- Assists Received / Game
- Best Support Partner
- Most Common Assist Target
- Support Style

`Support Style` is a compact read such as:

- `Giver`
- `Receiver`
- `Balanced`

## Data Model

Do not compute this whole block inline inside the screen component.

Create a focused helper module, for example:

- `utils/playerProfileMoonrakers.ts`

This helper should reuse `PlaystyleSample` data from `utils/playstyleEngine.ts` and return a shape specifically designed for the profile UI.

Recommended pipeline:

1. build `PlaystyleSample[]` for all tracked games
2. filter to the selected player's samples
3. derive profile-specific rollups
4. return display-ready sections for the page

## Metric Definitions

### Playstyle

- `Direct Prestige / Game`: average direct prestige across the player's tracked games
- `Assist Prestige Received / Game`: average assist prestige received across tracked games
- `Objective Points / Game`: average objective points across tracked games
- `Base Turns / Game`: average `stayAtBaseTurns` across tracked games
- `Base Rate`: average `stayAtBaseRate` across valid games

### Best/Worst Condition Candidate Families

#### Table Size

Use exact buckets:

- `2p`
- `3p`
- `4p`
- `5p+`

#### Seat Band

Use bands instead of exact seats:

- `Early`
- `Middle`
- `Late`

Recommended mapping:

- `Early`: first seat
- `Late`: last seat
- `Middle`: any seat between those two

When table size is too small to create all three bands, use only the bands that actually exist.

#### Base Condition

Compare:

- games with any base turn
- games with no base turns

#### Objective Condition

Compare:

- games with any objective points
- games with no objective points

### Base Discipline

- `Win Rate With Any Base Turn`: wins / games where `stayAtBaseTurns > 0`
- `Win Rate Without Base Turns`: wins / games where `stayAtBaseTurns === 0`
- `Prestige With Base`: average prestige in games with base turns
- `Prestige Without Base`: average prestige in games without base turns

### Objective Profile

- `Games With Objectives`: share of games where `objectivePoints > 0`
- `Win Rate With Objectives`: wins / games where `objectivePoints > 0`
- `Win Rate Without Objectives`: wins / games where `objectivePoints === 0`
- `Prestige With Objectives`: average prestige in games where `objectivePoints > 0`
- `High Objective Games`: share or count of games where `objectivePoints >= 2`

### Support Profile

- `Assists Given / Game`: average assists given
- `Assists Received / Game`: average assists received
- `Best Support Partner`: player with the strongest shared-game outcome for the selected player
- `Most Common Assist Target`: player receiving the most support from the selected player

`Best Support Partner` should not be based only on raw assist count. It should use:

- shared games minimum
- the selected player's outcomes in those games
- tie-break by average prestige if needed

## Ranking Rules

### Best Condition

Rank candidate conditions by:

1. highest win rate
2. highest average prestige
3. largest sample size

### Worst Condition

Rank candidate conditions by:

1. lowest win rate
2. lowest average prestige
3. largest sample size

### Best Support Partner

Rank by:

1. highest shared-game win rate for the selected player
2. highest average prestige for the selected player
3. largest shared sample size

### Most Common Assist Target

Rank by:

1. highest total assists given to that target
2. largest shared sample size

## Sample-Size Guards

Do not make strong claims from tiny samples.

Minimums:

- `3 games` for base vs no-base comparisons
- `3 games` for objective vs no-objective comparisons
- `3 games` for table-size claims
- `3 games` for seat-band claims
- `3 shared games` for support-partner claims

If a claim does not meet minimums, show:

- `Not enough games yet`

Do not pick a best or worst label when all candidate splits fail the guard.

## Empty-State Behavior

If the selected player has too few tracked games overall:

- render the `Moonrakers Intel` header
- show a compact empty state
- keep the rest of the profile page intact

Suggested message:

- `Not enough Moonrakers data yet`
- `Finish or import a few more games to unlock player-specific playstyle reads.`

## Implementation Shape

Recommended changes:

- add a pure profile rollup helper, likely `utils/playerProfileMoonrakers.ts`
- keep `app/player-profile/[playerId].tsx` as the assembly layer
- use small local render helpers or a lightweight extracted component only if the file becomes harder to read

Avoid:

- moving the whole profile to a new route
- replacing the current tab model
- expanding this into a full profile redesign

## Verification

Required verification should be conservative and focused.

### Data-Level Tests

Add pure tests for:

- best condition selection
- worst condition selection
- base-discipline splits
- objective-profile splits
- support-profile partner ranking
- sample-size guard behavior

### Profile Smoke Checks

Add a targeted source-level or helper-level smoke test to confirm the profile now includes:

- `Moonrakers Intel`
- `Playstyle`
- `Best Condition`
- `Worst Condition`
- `Base Discipline`
- `Objective Profile`
- `Support Profile`

### Honesty Rule

If a player lacks enough data, the UI must render an explicit insufficient-data state rather than silently selecting weak best/worst labels.

## Recommended Outcome

The player profile remains stable and familiar, but gains an inline Moonrakers-specific identity layer that answers:

- how this player tends to score
- when they perform best
- when they perform worst
- how disciplined they are about staying at base
- how much they rely on objectives
- how they support the table

This gives the profile a clearer Moonrakers identity without turning it into a full page rewrite.
