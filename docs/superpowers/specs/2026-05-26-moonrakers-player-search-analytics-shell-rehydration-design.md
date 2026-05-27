# Moonrakers Targeted Standardization Design

Date: 2026-05-26

## Summary

This design standardizes three related areas in the Moonrakers app without changing the app's overall flow:

1. unify player search interactions across the main player-selection and analytics surfaces,
2. finish consolidating the analytics shell so similar routes share the same control and recovery patterns,
3. centralize cloud rehydration so bootstrap, save, import, and delete flows all refresh the app through the same path.

The intended outcome is a cleaner and more consistent app that still feels like the current app, not a redesign.

## Goals

- Reuse `PlayerSearchPicker` as the standard player-search control anywhere the user searches for and selects a player.
- Reuse `AnalyticsControlRail`, `AnalyticsRecoveryCard`, `AnalyticsStateSection`, and `useAnalyticsRecovery` as the standard analytics shell pieces where they fit naturally.
- Replace duplicated post-save/post-import/post-delete cloud refresh logic with a single shared rehydration helper.
- Keep visible behavior close to the current app unless a screen currently uses a clearly inconsistent pattern.
- Reduce route-specific duplication in large screens without forcing generic abstractions onto specialized chart flows.

## Non-Goals

- No large route or information architecture redesign.
- No server contract changes for analytics payloads.
- No rewrite of chart-specific compare or setup builders that depend on route-specific interaction models.
- No change to selection rules, analytics meaning, or Supabase source-of-truth behavior.
- No attempt to fully genericize every search or every analytics screen in one pass.

## Current State

### Player search

The repo already has a reusable player-search primitive in `components/players/PlayerSearchPicker.tsx`, but search behavior is still inconsistent:

- `app/index.tsx` uses a custom `TextInput` and a custom player-result grid.
- `app/player-profile/index.tsx` uses a custom `TextInput` and a custom directory-card grid.
- `app/elo.tsx` uses a custom `TextInput`, custom clear button, and a separate underline selector for player focus.
- `app/stats.tsx`, `app/player-profile/[playerId].tsx`, and parts of `app/charts/index.tsx` are already closer to the shared picker pattern.

This produces different search affordances, different empty states, and different action wording for conceptually similar tasks.

### Analytics shell

The analytics surfaces already share several pieces, but the shell is only partially consolidated:

- `app/stats.tsx` and `app/insights.tsx` already lean on `AnalyticsControlRail` and `useAnalyticsRecovery`.
- `app/analytics.tsx` still resolves recovery state manually instead of using the shared hook.
- `app/elo.tsx` behaves like an analytics surface but still uses a custom search-and-selector shell.
- `components/home/HomeLeaderboardTab.tsx` uses `useAnalyticsRecovery` but intentionally keeps a compact inline layout.

The current issue is not missing building blocks. It is that similar screens do not consistently adopt them.

### Cloud rehydration

The canonical shared hydration path already exists in `lib/auth/bootstrapSharedCloudState.ts` through `loadHydratedSharedSnapshot(session)`, which:

1. loads the signed-in cloud snapshot,
2. loads registered profiles,
3. merges registered profiles into the player list,
4. computes the stats snapshot,
5. returns the full structure used by `hydrateCloudSnapshot(...)`.

That same sequence is duplicated in:

- `lib/game-session/useGameSessionController.ts`
- `lib/history/useHistoryDataManager.ts`
- route-level refresh paths in `app/game.tsx`, `app/history.tsx`, `app/add-players.tsx`, and `app/register.tsx`

This creates drift risk whenever the shared hydration payload or post-refresh expectations change.

## Proposed Design

## 1. Shared Player Search Standard

`PlayerSearchPicker` becomes the standard player-search UI primitive for player-focused surfaces.

### Adoption targets

- `app/index.tsx`
- `app/player-profile/index.tsx`
- `app/elo.tsx`
- `app/stats.tsx`
- `app/player-profile/[playerId].tsx`

`app/charts/index.tsx` may continue using the picker where it already fits, but chart setup remains route-specific.

### Standard behavior

Across the targeted screens, player search should consistently provide:

- a single styled text input,
- shared empty-state copy conventions,
- shared result row or rail treatment,
- consistent active/inactive action labels,
- consistent search-to-select behavior for single-select screens,
- support for route-specific selection side effects without forking the rendered control.

### Allowed local differences

The picker remains a shared UI control, not a shared business-logic hook. Each screen may still control:

- how it builds its player item list,
- what metadata appears under each player,
- what happens when a player is selected,
- whether the picker renders as a list or horizontal rail,
- whether results should appear immediately or only after typing.

This keeps the screens flexible while standardizing the visible interaction model.

### Required picker support

`PlayerSearchPicker` should support the existing app patterns this rollout needs, including:

- configurable clear affordance,
- configurable input capitalization mode,
- list versus rail presentation,
- optional helper text and empty text,
- optional nested scroll behavior.

The control should not become a highly generic render-prop component in this pass.

## 2. Analytics Shell Standard

The analytics shell should standardize around four shared pieces:

- `AnalyticsControlRail`
- `useAnalyticsRecovery`
- `AnalyticsRecoveryCard`
- `AnalyticsStateSection`

### Route expectations

#### Analytics hub

`app/analytics.tsx` should stop manually resolving recovery state and use `useAnalyticsRecovery` for its empty/error/loading decisions.

The hub remains visually distinct, but its recovery logic should align with the other analytics routes.

#### Stats and insights

`app/stats.tsx` and `app/insights.tsx` already fit the shared shell and should be treated as the reference implementation.

This work should simplify any remaining route-local shell decisions that duplicate what the shared pieces already know how to do.

#### ELO

`app/elo.tsx` should move toward the shared analytics shell while preserving the route's current information hierarchy.

The expected change is:

- keep the `HeroCard`,
- move player focus search/selection into `AnalyticsControlRail`,
- use `useAnalyticsRecovery` as the route's standard recovery source,
- keep route-specific body sections and opponent filtering where they are still ELO-specific.

This makes ELO feel like the other analytics surfaces without flattening it into a generic screen.

#### Home leaderboard

`components/home/HomeLeaderboardTab.tsx` should continue using `useAnalyticsRecovery`, but it does not need to adopt the full analytics control shell.

It is a compact embedded surface, not a full analytics route. This is an intentional exception.

#### Specialized compare and chart setup flows

`app/charts/compare/index.tsx` and the broader chart setup flow remain specialized.

They may continue using `AnalyticsControlRail` opportunistically where it already helps, but they are not required to match the same shell contract as the main analytics routes in this pass.

## 3. Centralized Cloud Rehydration

The shared cloud rehydration flow should move behind a neutral helper that can be used by bootstrap and by mutating flows.

### New shared helper

Create one shared helper in a cloud-focused module, rather than leaving it framed as bootstrap-only auth behavior.

The helper should:

- accept a signed-in session or profile identifier,
- load the cloud snapshot,
- load registered profiles,
- merge registered profiles into the snapshot players,
- compute the derived stats snapshot,
- return the exact structure expected by `hydrateCloudSnapshot(...)`.

This may be implemented by moving or wrapping the current `loadHydratedSharedSnapshot(...)` logic from `lib/auth/bootstrapSharedCloudState.ts`.

### Adoption targets

The following flows should call the shared helper instead of reproducing the sequence inline:

- bootstrap refresh in `lib/auth/useSharedCloudBootstrap.ts`
- finish-game refresh in `lib/game-session/useGameSessionController.ts`
- history import/delete refresh in `lib/history/useHistoryDataManager.ts`
- any remaining route-level refresh paths that manually chain `loadCloudSnapshot`, `loadRegisteredProfiles`, `mergeRegisteredProfilesIntoPlayers`, and `loadStatsSnapshot`

### Behavioral expectations

This refactor must preserve the current user-facing semantics:

- save/import/delete still report success even when the refresh step later fails,
- refresh-failure warnings remain route-appropriate,
- the app still rehydrates from Supabase after mutations,
- analytics and profile surfaces continue to reflect the shared snapshot contract.

The consolidation is about using one source of refresh truth, not changing the surrounding status messaging.

## Rollout Plan

The work should land in this order:

1. centralize cloud rehydration into the shared helper,
2. update mutation and bootstrap callers to use the helper,
3. standardize the analytics hub on `useAnalyticsRecovery`,
4. move ELO onto the shared analytics shell pattern,
5. replace remaining custom player-search UIs on the targeted screens with `PlayerSearchPicker`,
6. do a final pass for copy and behavior consistency across affected routes.

This order lowers risk because shared state refresh is stabilized before the UI standardization starts depending on it.

## Error Handling

- If the shared rehydration helper is called without a valid signed-in identity, it should fail clearly and early.
- Refresh callers should preserve their current success-with-warning behavior when the mutation succeeds but refresh fails.
- Shared search controls should preserve existing route guards when a selection is invalid or already active.
- Analytics routes should keep showing stale-server badges and stale captions where the underlying query hook already supports them.

## Testing And Verification

### Automated verification

At minimum:

- `npm.cmd run typecheck`
- relevant focused analytics and UI suites for changed screens
- any targeted tests needed for the new shared rehydration helper and search/control adoption

### Manual verification

Spot-check these routes and flows:

- home command player selection
- player directory
- ELO
- stats
- insights
- player profile detail
- one save flow
- one history import or delete flow

The key manual confirmation is that the app still refreshes shared cloud state after mutations and that the targeted screens now feel like variations of the same system instead of unrelated search/control implementations.

## Risks

- ELO has the highest shell-standardization risk because it currently mixes search, focus selection, tab state, and optional opponent filtering in one route.
- Home command search has the highest UX sensitivity because it is part of the primary game-start flow.
- Route-level refresh paths may have subtle status-message expectations even if the underlying hydration payload is identical.

These risks are why this design standardizes shared pieces without forcing every route into a single generic abstraction.

## Success Criteria

This work is successful when:

- the targeted player-search surfaces use the same core search control,
- the analytics hub and ELO no longer feel like shell outliers relative to stats and insights,
- the shared cloud snapshot refresh logic has one reusable source of truth,
- post-mutation refresh behavior still works across save, import, and delete flows,
- the app feels more coherent without visibly becoming a different product.
