# Moonrakers Live Command Center Player Directory Design

Date: 2026-04-24
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will turn the main home Command Center in [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx) into a live directory of every registered profile instead of limiting that surface to the current game-driven local roster.

This live directory is not the same thing as the current gameplay player store. Newly registered profiles must appear on the home screen right away and must contribute to `Registered` counts right away, but they must not enter game-driven analytics until they have at least one saved game. In practice, that means a zero-game player is visible in the home directory and counted as registered, while leaderboard, ELO, per-player stats, matchup views, and other game-derived analytics remain unchanged until that player has real saved-game participation.

The home directory and the supporting player-directory surfaces should be sorted alphabetically by player name. Tapping a player still opens the existing player profile route, and zero-game profiles must render an honest `No games yet` state instead of fake analytics.

## Confirmed Product Decisions

- The main home Command Center becomes the live directory of all registered profiles.
- The player directory is sorted alphabetically by player name.
- Newly registered players appear in the home directory as soon as the live directory refreshes.
- Newly registered players contribute to `Registered` counts immediately.
- Zero-game players do not enter game-driven analytics until they have at least one saved game.
- Zero-game players remain excluded from leaderboard, ELO, per-player stats, and other game-derived rankings.
- Tapping a zero-game player still opens the existing player profile route.
- Zero-game profiles show explicit empty-state messaging such as `No games yet`.
- The current game-driven `players` store should not be redefined as the full registered-profile directory.

## Goals

- Make the Command Center feel like the live source of truth for who is registered.
- Show newly created accounts without forcing users through roster-management search first.
- Preserve the integrity of the current game-driven analytics pipeline.
- Keep `Registered` counts honest without polluting leaderboard-style analytics with zero-game rows.
- Keep directory ordering stable and predictable through alphabetical sort.

## Non-Goals

- Redesigning all analytics screens around zero-game placeholder rows.
- Replacing the current gameplay player identity model with account-directory rows everywhere.
- Rebuilding the existing player detail UI into a separate profile product.
- Changing how finished games compute totals, standings, or leaderboard math.

## Current Architecture Context

The home screen in [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx) currently reads `state.players`, normalizes those rows, and ranks them by play frequency and recency. That means the Command Center today is driven by the gameplay/local-history player set, not by the full set of registered accounts.

The dedicated player surfaces in [app/players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/players.tsx) and [app/player-profile/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/player-profile/index.tsx) also read from that same store-driven `players` array. Those screens are therefore limited to profiles already present in the cloud snapshot or recovered from game history.

The authenticated cloud bootstrap in [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx) hydrates the store from [lib/cloud/loadCloudSnapshot.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/loadCloudSnapshot.ts), which currently loads:

- the signed-in profile,
- the signed-in user's groups,
- the signed-in user's games.

That snapshot is normalized in [lib/cloud/normalizeCloudSnapshot.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/normalizeCloudSnapshot.ts) into `players`, `groups`, and `games`, but the resulting `players` collection is still derived from the signed-in profile plus game and group participation, not the full registered population.

Analytics already have a split identity:

- top-level `Registered` counts can read `statsSnapshot.global.playersRegistered` in [app/analytics.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/analytics.tsx) and [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx),
- deeper per-player analytics still come from `buildLeaderboard(players, games)` in [utils/statsEngine.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/statsEngine.ts).

That existing split is the right seam to preserve.

## Recommended Architecture

### Core Direction

Add a separate live registered-profile directory to the app state and use it for directory and `Registered`-count concerns, while keeping the existing `players` plus `games` path as the source of truth for gameplay analytics.

Recommended state model:

- `players`: game-driven player entities used by gameplay, saved games, and analytics
- `registeredProfiles`: live account-directory entities used by the Command Center and `Registered` counts
- `statsSnapshot`: global and personal rollups, still used for summary counts where available

This keeps the user-visible behavior aligned with the request without forcing a risky semantic rewrite of `players`.

### Why This Approach

The current codebase has many paths that assume `players` is a game-usable set, not just a list of accounts. Examples include:

- game setup and active-game startup,
- leaderboard building,
- player detail calculations,
- chart pipelines that expect game-backed players.

Replacing `players` everywhere with all registered accounts would create unnecessary risk, especially in a dirty worktree with active refactors already underway. A separate live directory lets the Command Center become global immediately while preserving the stable analytics boundary.

## Data Model

### Registered Profile Shape

The live directory should use a dedicated public profile row shape with only the fields the UI needs:

- `id`
- `player_name`
- `display_name`
- `favorite_color`
- `assigned_card_art_index`

For UI convenience, a normalized app-facing shape can expose:

- `id`
- `name`
- `displayName`
- `color`
- `assignedCardArtIndex`
- `hasSavedGames`

`hasSavedGames` is derived client-side from the existing `games` store by checking whether at least one saved game contains that profile id.

### Source of Truth

The directory loader should come from a dedicated cloud helper, not from the gameplay snapshot normalizer.

Preferred contract:

1. a new read helper such as `loadRegisteredProfiles()`
2. a dedicated backend-safe read path for public profile fields

The safest backend implementation is:

- direct `profiles` read if policy already allows the approved public columns for signed-in users, or
- a dedicated RPC/view such as `list_registered_profiles` if broad `profiles` reads are intentionally restricted.

The important design rule is that the directory has its own read boundary and does not depend on replaying game history just to discover registered accounts.

## UI Design

### Home Command Center

[app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx) becomes the primary live directory surface.

Recommended behavior:

- replace the current play-frequency-ranked player grid/list with the registered-profile directory,
- sort the directory alphabetically by player name,
- keep tap-through into the existing player profile route,
- visibly distinguish zero-game players with a calm support label such as `Registered` or `No games yet`,
- keep the visual tone aligned with the current Command Center styling rather than reverting to a plain utility list.

Recommended summary behavior:

- directory count should reflect `registeredProfiles.length` when the live directory is loaded,
- `Registered` language should consistently map to the live directory population,
- game-driven metrics on the home screen should continue to come from saved games, not from raw registration counts.

### Supporting Player Surfaces

The player-oriented support surfaces should stay consistent with the new directory behavior.

[app/player-profile/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/player-profile/index.tsx) should:

- use the same live directory source,
- sort alphabetically,
- remain a secondary route into the same directory rather than a conflicting alternative model.

[app/players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/players.tsx) can remain the broader player hub, but its copy should no longer imply that roster search is the only way profiles enter the app.

### Player Detail Route

The detail screen in [app/player-profile/[playerId].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/player-profile/[playerId].tsx) currently resolves the selected player from the game-driven store. That must be widened so a zero-game registered profile can still render correctly.

Recommended behavior:

- resolve the identity card from `registeredProfiles` first or from a merged identity lookup,
- continue to build game-derived rows from the saved `games` collection,
- if the player has zero saved games, render the profile shell with explicit empty states instead of failing the route or inventing stats.

Recommended zero-game copy:

- hero/profile identity still renders,
- summary area shows `0` games,
- recent games section says `No recent games found for this player.`,
- leaderboard or matchup-style tabs show `No games yet` messaging.

## Analytics And Statistics Boundary

### What Changes Immediately

The following should reflect newly created profiles immediately:

- home-directory population,
- any explicitly labeled `Registered` count,
- any helper text describing tracked registered accounts.

Examples include [app/analytics.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/analytics.tsx) and the overview counts in [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx).

### What Must Stay Game-Driven

The following should remain driven only by players with actual saved-game participation:

- leaderboard rows,
- ELO participation,
- head-to-head and matchup views,
- per-player stats tabs,
- winning-signal and correlation player selections,
- any rank, win rate, or performance metric built from `buildLeaderboard(players, games)`.

This means a new account with zero games:

- counts as registered,
- appears in the live directory,
- does not appear in leaderboard-derived selectors or charts yet.

### Entry Into Analytics

A registered profile enters game-driven analytics automatically after the first saved game that includes that player id.

No manual migration step should be required. The existing game save and snapshot path already provides the right identity seam for this once real game participation exists.

## Loading, Refresh, And Fallback Behavior

### Initial Load

During authenticated bootstrap, the app should load:

1. the signed-in user's cloud snapshot,
2. the live registered directory,
3. stats rollups.

These can load in parallel if the implementation can do so cleanly.

### Refresh

The live directory should refresh after:

- successful account/profile creation,
- app bootstrap for authenticated users,
- manual pull-to-refresh if the home screen already supports refresh patterns,
- returning to the app if a cheap refetch-on-focus pattern is already used elsewhere.

The core expectation is that a newly created profile should appear quickly without needing a full app reinstall or data-reset flow.

### Failure Handling

If the live directory fetch fails:

- the home directory should show a clear load error or fallback state,
- existing game-driven data should remain usable,
- `Registered` counts should fall back to `statsSnapshot.global.playersRegistered` when possible,
- the app should avoid replacing the home directory with stale gameplay ordering that implies success.

## Sorting Rules

The registered-profile directory must sort alphabetically by normalized player name.

Recommended sort precedence:

1. trimmed `player_name`
2. fallback `display_name`
3. stable `id` tiebreaker

The same rule should be reused in both the home directory and the supporting player-directory screen so the order does not jump between routes.

## Testing Strategy

### Data Tests

Add focused tests for:

- registered-profile normalization,
- alphabetical sorting,
- `hasSavedGames` derivation from saved games,
- zero-game exclusion from leaderboard inputs.

### UI/Route Tests

Add route-level verification for:

- home screen reading the live directory instead of only `state.players`,
- player-directory screen using alphabetical ordering,
- zero-game profile route rendering a non-error empty state,
- `Registered` counts reflecting the live directory population.

### Regression Tests

Protect existing game-driven analytics by keeping or adding tests that confirm:

- leaderboard rows still derive from `players` plus `games`,
- zero-game registered profiles do not appear in player-stat selectors,
- newly game-participating players begin appearing in analytics after their first saved game.

## Implementation Notes For Planning

The plan should stay conservative and local to these areas:

- cloud helper(s) for registered-profile loading,
- store shape and bootstrap hydration,
- home Command Center rendering in [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx),
- secondary player-directory surfaces,
- profile-detail identity fallback for zero-game profiles,
- targeted analytics-count wiring.

The plan should explicitly avoid broad rewrites of gameplay save logic, chart architecture, or leaderboard math.
