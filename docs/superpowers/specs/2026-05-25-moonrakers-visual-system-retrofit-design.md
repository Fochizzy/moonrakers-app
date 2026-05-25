# Moonrakers Visual System Retrofit Design

## Goal

Ship one focused UI polish pass that unifies the remaining visual-system outliers, standardizes analytics controls, and clarifies CTA hierarchy without reopening gameplay logic or analytics contracts.

## Selected Approach

Use a system-first retrofit.

Instead of polishing each screen in isolation, this pass strengthens a small set of shared presentation primitives first, then retrofits the outlier routes onto those pieces. This keeps the visible improvements cohesive and avoids creating slightly different tab, search, and action patterns across the app.

## Scope

This pass covers three linked improvements:

1. Bring the remaining visual-system outliers closer to the shared shell language.
2. Extract one reusable analytics control rail for tab selection, optional search, and compact contextual actions.
3. Refresh CTA hierarchy so primary, secondary, ghost, and danger actions read more clearly across the app.

Primary route/component targets:

- `app/game.tsx`
- `components/ColorPlayerCard.tsx`
- `app/charts/compare/index.tsx`
- `app/stats.tsx`
- `app/insights.tsx`
- `app/player-profile/[playerId].tsx`
- `components/ui/ActionButton.tsx`

## Non-Goals

This pass does not change:

- Supabase analytics payloads, query behavior, or cache contracts
- game scoring, turn flow, persistence, or save behavior
- route structure beyond small presentation-oriented extraction
- home/hubs information architecture beyond any CTA fallout from the shared button changes

If a screen needs more than small structure/layout extraction to fit the new system cleanly, that work becomes a follow-up instead of expanding this batch.

## Design

### 1. Visual-System Outliers

The app already has a newer shared shell language centered on `PageShell`, `ScreenBackground`, `HeroCard`, `SectionCard`, and the newer glass/tint rhythm. The remaining outliers still read like separate visual islands because they keep their own background, spacing, or wrapper logic.

This pass upgrades those screens toward the shared language without flattening them into identical layouts.

#### `app/game.tsx`

`app/game.tsx` should be included in phase 1, but only as a presentation retrofit with small structure/layout extraction allowed where it makes the cleanup safer.

Allowed changes:

- replace older backdrop usage with the shared shell language where feasible
- extract one or two small presentational wrappers if they reduce duplication
- tighten action group framing and visual hierarchy

Disallowed changes:

- gameplay rule changes
- turn sequencing changes
- score-entry behavior changes
- persistence or game-state contract changes

The outcome should be: the live game screen still behaves the same, but it no longer feels visually detached from the rest of the app.

#### `components/ColorPlayerCard.tsx`

This component should stop carrying an older standalone backdrop treatment and inherit the newer card/surface language as much as possible without changing its responsibilities or data inputs.

The work here is visual convergence, not feature expansion.

#### `app/charts/compare/index.tsx`

The compare route should move from its custom `SafeAreaView` plus direct `ScreenBackground` frame toward the same shell rhythm used by the other analytics routes.

The compare-specific content can stay custom. The goal is to standardize the surrounding chrome, spacing, and action framing.

### 2. Shared Analytics Controls

`app/stats.tsx`, `app/insights.tsx`, and `app/player-profile/[playerId].tsx` each implement their own flavor of:

- underline tab controls
- search inputs
- compact contextual actions

This creates visual drift even though the interaction model is broadly the same.

This pass extracts one shared `AnalyticsControlRail` component or equivalent helper-driven primitive set. It should support:

- route section tabs
- an optional player/opponent search field
- compact actions such as definitions/help or route jumps
- reuse across one-row and stacked mobile layouts

The shared rail should not force every analytics route into identical content order. It only standardizes the control band above the route-specific content.

### 3. CTA Hierarchy

`ActionButton` should become a clearer source of truth for action hierarchy across the app.

The main upgrade is visual ranking:

- `primary` should feel unmistakably primary
- `secondary` should remain strong but quieter
- `ghost` should read as supportive navigation/utility
- `danger` should stay explicit and high-clarity

This is not a behavior refactor. It is a hierarchy and readability pass that should then flow into:

- analytics hero and section actions
- compare route actions
- game route actions
- command/home quick actions where appropriate

The preferred result is better scanability, not more decoration.

## Component Strategy

The implementation should stay centered on a few reusable pieces:

- strengthen `PageShell` only if a tiny preset/spacing hook is needed for outliers
- add `AnalyticsControlRail` for analytics-family tab/search/action controls
- upgrade `ActionButton` as the shared CTA language source
- allow only small presentation extraction inside `app/game.tsx`

This keeps the retrofit system-led instead of route-led.

## Rollout Order

Implement in this sequence:

1. Shared foundation
   - `ActionButton`
   - `AnalyticsControlRail`
   - any tiny `PageShell` adjustment required by the outliers
2. Lower-risk analytics retrofits
   - `app/stats.tsx`
   - `app/insights.tsx`
   - `app/player-profile/[playerId].tsx`
   - `app/charts/compare/index.tsx`
3. Component outlier cleanup
   - `components/ColorPlayerCard.tsx`
4. Highest-sensitivity route last
   - `app/game.tsx`

This order proves the shared pieces on safer surfaces before they touch the live game screen.

## Testing Strategy

Verification should stay focused and source-backed:

- add or update source tests proving shared analytics tab/search usage on the targeted routes
- add a guard that the compare route adopts the shared shell path
- add a guard that `app/game.tsx` keeps its existing interaction entry points while moving onto the new presentation wrappers
- run the targeted UI/source suite
- run `npx.cmd tsc --noEmit`

## Success Criteria

- the remaining visual outliers read like part of the same Moonrakers app family
- `stats`, `insights`, and player profile use one shared analytics control language
- CTA hierarchy is clearer at a glance across analytics, compare, and game surfaces
- `app/game.tsx` receives visual-system cleanup without gameplay behavior drift
- no analytics contract or gameplay logic changes are introduced as part of the polish pass
