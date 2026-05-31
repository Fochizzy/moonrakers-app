# Moonrakers Stats Shared Focus Player Design

## Summary

The stats screen already has a concept of a selected player, but the control for changing that player is buried inside the `Players` tab and duplicated again inside the local playstyle section. This design promotes one shared `Focus Player` search control to the top of `app/stats.tsx`, directly under the tab rail, so the focused player can be changed from anywhere on the stats page.

This slice is intentionally UI-scoped. It standardizes the page-level player focus experience without changing the Supabase `get_stats_screen` RPC contract. The selected player will continue to drive the existing client-side player-aware sections, while server-authored sections that are still league-wide remain unchanged in this pass.

## Goals

- Make the focused player visible and changeable from anywhere on the stats screen.
- Reuse the existing `selectedPlayerId` state in `app/stats.tsx` as the single source of truth.
- Remove duplicate player-search controls from inner sections so the page has one clear focus selector.
- Preserve the current Supabase-authored loading, error, and empty-state behavior.
- Improve the picker filter so it matches by visible label plus raw player name and id.

## Non-Goals

- Changing the `get_stats_screen` RPC signature or SQL function in this slice.
- Recomputing the entire stats payload for a new focused player on the server.
- Reworking league-wide overview, insights, or game-summary cards to become player-specific.
- Adding new analytics metrics or redesigning the tab rail.

## Current State

- `app/stats.tsx` already owns `selectedPlayerId`, `playerSearchQuery`, and the normalized `playerOptions`.
- The `Players` tab renders a `PlayerSearchPicker` inside a `Player Directory` card, then shows the selected player detail panel.
- `PlaystyleSection` receives `selectedPlayerId` and `onSelectPlayer`, but also renders its own internal segmented player selector and search box.
- `getStatsScreen(...)` only sends `profile_id` to the server. Unlike ELO and player-profile RPC wrappers, it does not accept `focus_player_id`.
- The page therefore has partial shared player-focus state already, but the UI does not present it as a page-level control.

## Approved Approach

Implement the recommended UI-only shared focus control.

- Add a shared `Focus Player` card directly below the tab rail and above the active tab content.
- Reuse `PlayerSearchPicker` there as the page-level selector.
- Keep `app/stats.tsx` as the owner of `selectedPlayerId` and `playerSearchQuery`.
- Remove the duplicate `Player Directory` picker from the `Players` tab.
- Remove the inner search box from `PlaystyleSection` so there is only one searchable focus control on the route.
- Keep the current server-authored stats payload unchanged for this slice.

## UI Design

### Shared Focus Placement

The new `Focus Player` control lives directly under the `Browse Statistics` rail. It should appear whenever the page has usable player options and the page is not in a blocking loading or error state.

The card should:

- Use the existing stats-screen visual language.
- Show a short title such as `Focus Player`.
- Explain that this selection changes the player-specific parts of the stats page.
- Use the existing `PlayerSearchPicker` component for interaction consistency.

### Shared Focus Behavior

- The selected player remains highlighted in the picker results.
- Choosing a player updates `selectedPlayerId` in `app/stats.tsx`.
- After selection, the search query clears so the current focus is easy to read.
- Clearing the query should leave the current focused player unchanged.
- Search should match against `label`, `displayName`, `playerName`, and `id`.

### Players Tab

The `Players` tab becomes a pure detail surface for the currently focused player.

- Remove the `Player Directory` wrapper card and its inner picker.
- Keep the existing detail `AnalyticsStateSection`.
- Update the subtitle or supporting copy so it clearly reflects the shared page focus.

### Playstyle Tab

`PlaystyleSection` should continue to honor the same `selectedPlayerId`, but it should no longer present a second searchable picker.

- Keep the compact segmented direct-switch rows for quick browsing, but make them a synced secondary control rather than a separate search experience.
- Remove the inner `PlayerSearchPicker` instance and its query state from `PlaystyleSection`.
- Preserve the currently selected player analytics, insights, and scatter plots.

## State Ownership And Data Flow

### Page-Level State

`app/stats.tsx` remains the single owner of:

- `selectedPlayerId`
- `playerSearchQuery`
- filtered page-level player options

The route should continue to seed `selectedPlayerId` from the published payload default when present, and otherwise fall back to the first available player option.

### Section Consumption

- `Players` detail reads the shared `selectedPlayerId`.
- `PlaystyleSection` reads the shared `selectedPlayerId` through props and emits selection changes through `onSelectPlayer`.
- League-wide sections (`Home`, `Insights`, `Games`) continue rendering their current Supabase-authored payloads and are not forced into artificial local player filtering.

## Server Contract Boundary

This feature is explicitly not the full server-authored focused-player version.

- `getStatsScreen(...)` stays unchanged and continues calling `get_stats_screen(profile_id)`.
- The stats page will expose one shared focus control immediately, but only the parts of the screen that already understand `selectedPlayerId` will meaningfully change in this slice.
- A future phase can extend the RPC and SQL contract with `focus_player_id` if the user wants the entire published stats payload to switch players.

## Implementation Shape

### `app/stats.tsx`

- Add a shared focus-player section beneath `AnalyticsControlRail`.
- Expand filtering logic to search all player-name fields, not just `label`.
- Clear the query after a successful selection.
- Hide the shared picker when there are no player options or when the screen is in a blocking loading/error state.
- Remove the `Player Directory` card from `renderPlayersTab()`.

### `components/stats/PlaystyleSection.tsx`

- Remove `playerSearchQuery` local state.
- Remove the inner `PlayerSearchPicker` block.
- Keep existing selected-player analytics and segmented direct-switch behavior unless it creates layout or interaction conflicts during implementation.

### `components/players/PlayerSearchPicker.tsx`

- Reuse as-is unless a small prop-level adjustment is needed for better copy or query clearing.
- Do not redesign the component for this slice.

## Error Handling And Empty States

- If the stats query is loading or returns an error, the page should continue using the existing `AnalyticsStateSection` messaging.
- If no player options are returned, the shared focus card should not render.
- Existing `player-empty`, `no-players`, and `no-games` recovery behavior should remain intact.
- The `Players` tab should still show the current empty detail message when the selected player has no detailed stats payload.

## Testing Strategy

- Add a focused regression test for the shared stats-player selection behavior if an existing stats-screen test harness is available.
- Otherwise add a small targeted script or test that verifies:
  - page-level player filtering matches multiple name fields,
  - selecting a player updates the shared selected id,
  - `Players` and `Playstyle` consume the shared selection instead of separate search state.
- Re-run the relevant existing stats or analytics verification scripts after the change.

## Risks And Mitigations

### Risk: misleading expectation that every tab becomes player-specific

Mitigation:
Be explicit in the UI copy and implementation notes that this slice changes the shared focus control, not the entire server payload contract.

### Risk: duplicated controls remain in the playstyle section

Mitigation:
Remove the inner search box and keep only non-conflicting direct-switch controls if they still add value.

### Risk: selection falls out of sync when the published default changes

Mitigation:
Preserve the current route-level fallback logic that seeds `selectedPlayerId` from the payload only when there is not already a local selection.

## Success Criteria

- The stats screen shows one shared searchable focus-player control under the tab rail.
- Selecting a player there updates the player detail and playstyle sections without navigating away.
- The `Players` tab no longer contains a duplicate search picker.
- `PlaystyleSection` no longer contains a duplicate search picker.
- Existing loading, error, and empty-state behavior still works.
