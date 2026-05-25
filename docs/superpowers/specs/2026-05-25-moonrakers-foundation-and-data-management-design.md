# Moonrakers Foundation And Data Management Design

Date: 2026-05-25
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will ship a coordinated foundation pass across gameplay, sync status, history and migration management, chart provenance, chart visuals, and runtime verification.

This is not a visual-only cleanup. The goal is to reduce the app's remaining monolithic routes, make cross-surface state more truthful, give users clearer backup/import confidence, remove ambiguity about chart data sources, and add one real integration safety rail for future changes.

## Confirmed Product Decisions

- Implement all six recommended improvements as one phased initiative.
- Preserve the recent server-authored analytics direction rather than backing away from it.
- Keep the app honest about operational state, especially when save, refresh, import, or fallback behavior is partial.
- Prefer phased refactors that leave the app shippable after each stage rather than a single branch-wide rewrite.

## Goals

- Split the gameplay flow into clearer controller, domain, and route-rendering boundaries.
- Add one shared status model for save, sync, refresh, import, and warning states.
- Turn history, backup, import, and migration into one trustworthy data-management surface.
- Make chart provenance explicit wherever server, Supabase fallback, or device fallback can appear.
- Extract a reusable chart/card visual system from the largest compare and chart style files.
- Add one critical-path smoke harness that proves the app still works across the main player journey.

## Non-Goals

- Rewriting the whole app around a new global architecture in one pass.
- Replacing Zustand or the current store entirely.
- Removing all local fallback paths immediately, especially where gameplay and history still need them.
- Rebuilding every chart component from scratch.
- Solving unrelated auth, branding, or asset-placement work during this initiative.

## Scope

This initiative covers six linked improvements:

1. Refactor the live gameplay stack into a clearer session/controller architecture.
2. Add a shared app-status model for save, refresh, sync, import, and warning states.
3. Reframe history, backup, import, and migration as one data-management surface.
4. Finish chart provenance cleanup so data-source state is explicit and trustworthy.
5. Extract a chart/card design system from the largest style and compare surfaces.
6. Add one critical-path runtime smoke harness on top of the focused script suite.

## Current Architecture Context

The recent analytics/profile refactor made the analytics surfaces much more coherent, but the broader app still has several large responsibility hotspots.

The biggest route files are still:

- [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx)
- [app/charts/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/index.tsx)
- [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx)
- [app/player-profile/[playerId].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/player-profile/[playerId].tsx)
- [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx)
- [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx)
- [app/history.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/history.tsx)
- [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts)

The gameplay flow is especially concentrated. [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx) currently mixes:

- active-game rendering
- turn mutation and round construction
- cloud save preparation
- cloud save execution
- cloud hydration refresh
- local animation and UI-state behavior

The setup flow is similarly spread across [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx), [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx), and [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts), with player/group selection, profile setup, turn-order preparation, and active-game bootstrapping all crossing route boundaries.

The history/data-management flow is powerful but fragmented. [app/history.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/history.tsx) currently owns:

- history listing
- filtering and sorting
- cloud snapshot reloads
- backup import entry
- delete-game actions
- migration-related user messaging

The chart layer is more honest than before, but still structurally mixed. [app/charts/[chartKey].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/[chartKey].tsx) can render:

- server-authored chart data
- Supabase-backed fallback data
- device-derived fallback data

That provenance is surfaced in parts of the UI, but the route still mixes provenance resolution, fallback assembly, and chart-page rendering.

The styling layer is also concentrated in several very large helpers and components:

- [utils/compareStyles.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/compareStyles.ts)
- [components/ColorPlayerCard.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/ColorPlayerCard.tsx)
- [components/charts/compare/ConditionalComparisonCard.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/charts/compare/ConditionalComparisonCard.tsx)
- [components/charts/Sparkline.tsx](C:/Users/izzyh/Desktop/moonrakers-app/components/charts/Sparkline.tsx)

Finally, the repo already has strong focused regression coverage through the [scripts](C:/Users/izzyh/Desktop/moonrakers-app/scripts) suite, but it does not yet have one critical-path integration-style path that spans setup, save, history, profile, and charts together.

## Recommended Architecture

### Core Direction

Adopt a phased architecture that separates:

- `gameplay session orchestration`
- `shared operational status`
- `history/data-management orchestration`
- `chart provenance resolution`
- `chart/card visual primitives`
- `cross-surface smoke verification`

This keeps the app shippable after each stage and avoids forcing the gameplay, chart, and history systems to move all at once.

### Why This Split

This avoids two bad outcomes:

- a big-bang rewrite where state, routing, charts, and migration behavior all move together
- a cosmetic-only pass that leaves the most failure-prone routes monolithic

The recommended split stabilizes the highest-traffic flows first, then builds clearer user feedback and tooling around them.

## Subsystem Design

### 1. Gameplay Session Architecture

Create a dedicated `lib/game-session` boundary for live gameplay orchestration.

Recommended responsibilities:

- `game session controller`
  - active-game lifecycle
  - turn submission orchestration
  - end-of-game transitions
  - save pipeline coordination
- `setup/session bootstrap helpers`
  - selected players and groups normalization
  - turn-order resolution
  - active-game creation from setup state
- `route sections`
  - visual rendering for turn entry, leaderboard, player focus, controls, and save affordances

This means:

- [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx) becomes a route that renders sections and dispatches controller actions.
- [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx) becomes a route that manages player/group selection through dedicated setup hooks rather than inline orchestration.
- [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx) becomes a route-level renderer over a narrower turn-order/setup model.

The current engine helpers in [engine/gameEngine](C:/Users/izzyh/Desktop/moonrakers-app/engine) remain the scoring core. This initiative wraps them in clearer session-level orchestration instead of rewriting scoring logic.

### 2. Shared App Status Layer

Add a shared `lib/app-status` model that standardizes operational feedback across the app.

Suggested state vocabulary:

- `idle`
- `running`
- `success`
- `success_with_warning`
- `stale`
- `failed`

Suggested event families:

- `cloud_save`
- `cloud_refresh`
- `analytics_refresh`
- `history_import`
- `history_delete`
- `migration_health`

Each status record should support:

- machine-readable state
- short title
- optional detail message
- timestamp
- optional retry/action affordance metadata

This model should be consumable by gameplay, history, and analytics surfaces so the app presents one coherent truth for operational state instead of route-specific ad hoc banners.

### 3. History, Backup, Import, And Migration Surface

Refactor [app/history.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/history.tsx) into a clearer data-management route with explicit sections:

- `history overview`
- `filters and search`
- `backup and import tools`
- `import and migration health`
- `game list and destructive actions`

Move orchestration into a dedicated controller or hook that owns:

- cloud reload
- registered-profile merge
- stats snapshot refresh
- import execution
- import-result interpretation
- delete-game execution
- filter and sort state

The import path under [lib/migration/importBackupFromPicker.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/migration/importBackupFromPicker.ts) stays the execution layer, but the route should render stronger outcomes:

- completed
- completed with warnings
- blocked
- failed

This is also the right place to expose backup/import trust signals such as:

- what source was imported
- how many players/groups/games were read
- whether dedupe or mapping warnings occurred
- whether the local/cloud views may still need refresh

### 4. Chart Provenance Model

Make provenance resolution a first-class route-level model for chart detail pages.

Recommended route contract:

- `server`
- `server_stale`
- `supabase_fallback`
- `device_fallback`

The detail route should decide provenance before it renders page sections, rather than letting provenance emerge indirectly from several branches. That route-level model should wrap:

- the server-authored dataset fetch
- Supabase fallback shaping
- local device fallback shaping via [utils/chartDetailLocalData.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/chartDetailLocalData.ts)

This keeps [app/charts/[chartKey].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/[chartKey].tsx) honest and easier to reason about, while preserving the existing fallback resilience.

### 5. Chart And Card Visual System

Extract a smaller visual kernel from the biggest chart/card styling files.

Suggested shared layers:

- `chart surface tokens`
  - spacing, border, glow, type, color, empty-state rhythm
- `chart shell components`
  - panel, insight strip, legend row, metric chip, comparison card shell
- `provenance/status adornments`
  - server/stale/fallback labels and captions

The goal is not to flatten every chart into one identical look. The goal is to stop large style objects and comparison cards from becoming their own parallel design systems.

### 6. Critical-Path Smoke Harness

Add one integration-style script focused on the highest-value player flow:

1. app bootstrap/auth-ready state
2. add players
3. game setup
4. start live game
5. save completed game
6. open history
7. open player profile
8. open charts

This harness should not try to replace the focused test suite. It should be a single confidence path that catches cross-subsystem breakage after large refactors.

## Data Flow Changes

### Gameplay And Save Flow

Current direction:

- route mutates active-game state
- route assembles save payload
- route triggers cloud save
- route manually handles UI recovery states

Target direction:

- controller derives session mutations
- controller assembles the save request
- save layer executes the cloud write
- shared status layer publishes user-facing state
- route renders sections based on session state plus shared status

### History And Import Flow

Current direction:

- route executes import/delete/reload directly
- route interprets partial outcomes inline

Target direction:

- history controller executes import/delete/reload actions
- controller returns structured result states
- shared status layer exposes operational truth
- route renders a clearer data-management UI around those results

### Chart Detail Flow

Current direction:

- route fetches
- route may fallback
- route may render provenance labels later

Target direction:

- route resolves provenance and dataset model first
- route renders page sections from a single chart-page view model
- provenance labels and captions are guaranteed to match the actual dataset source

## Error Handling Principles

- If cloud save succeeds but local hydration lags, the UI must say exactly that.
- If an import completes with mapping or dedupe warnings, the result must be `completed with warnings`, not silent success.
- If a chart falls back, the route must label the fallback source explicitly.
- If the app is showing last successful server data, stale status must remain visible until the next successful refresh.
- Controller-level errors should be normalized before they reach route sections, so user copy stays consistent.

## Rollout Plan

### Phase 1: Gameplay Session Refactor

Focus files:

- [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx)
- [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx)
- [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx)
- [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts)

Expected outputs:

- session controller layer
- extracted route sections
- smaller setup hooks
- reduced orchestration pressure in routes

### Phase 2: Shared App Status Layer

Focus files:

- new `lib/app-status/*`
- gameplay save paths
- analytics stale/recovery surfaces
- history route and import/delete actions

Expected outputs:

- shared operational state model
- reusable status UI surface
- consistent state vocabulary across routes

### Phase 3: History And Data Management

Focus files:

- [app/history.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/history.tsx)
- [lib/migration](C:/Users/izzyh/Desktop/moonrakers-app/lib/migration)
- backup/import helpers

Expected outputs:

- dedicated history controller
- clearer import and migration feedback
- better backup/import trust affordances

### Phase 4: Chart Provenance And Visual System

Focus files:

- [app/charts/[chartKey].tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/charts/[chartKey].tsx)
- [utils/chartDetailLocalData.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/chartDetailLocalData.ts)
- [utils/compareStyles.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/compareStyles.ts)
- chart compare/render components

Expected outputs:

- explicit provenance model
- reusable chart/card shells and tokens
- less style duplication across compare/chart pages

### Phase 5: Critical-Path Smoke Harness

Focus files:

- [scripts](C:/Users/izzyh/Desktop/moonrakers-app/scripts)
- optional package-script additions in [package.json](C:/Users/izzyh/Desktop/moonrakers-app/package.json)

Expected outputs:

- one critical-path smoke script
- release-confidence entrypoint that spans major subsystems

## Testing Strategy

Add or expand verification at three levels.

### Focused Source Guards

For each phase, add narrow tests for:

- gameplay controller boundaries
- setup/session helpers
- shared status transitions
- history controller results
- chart provenance model output
- chart/card visual-system wiring

### Existing Focused Regression Suites

Re-run the existing focused analytics, UI, chart, and player-flow tests after each phase rather than waiting until the end.

### Critical-Path Smoke Path

Add one integrated path that proves:

- auth/bootstrap reaches a ready state
- players can be selected
- setup can launch a game
- a game can be saved
- history can reflect that saved state
- profile can open from current app state
- charts can open from current app state

## Risks And Mitigations

### Risk: Gameplay Refactor Creates Hidden Save Regressions

Mitigation:

- keep the save payload builder and cloud save layer separate from UI extraction
- add controller/state tests before moving route logic
- verify save success, save warning, and save failure states explicitly

### Risk: Shared Status Layer Becomes Another Global Dumping Ground

Mitigation:

- keep status types narrow and event-based
- avoid putting unrelated domain state into the status layer
- treat it as operational state only

### Risk: Chart Cleanup Reintroduces Ambiguity About Real Data Source

Mitigation:

- make provenance a required route-level field
- ensure UI labels are derived only from that field
- keep fallback builders behind a single boundary

### Risk: History Refactor Changes Too Many Behaviors At Once

Mitigation:

- separate route rendering from controller logic first
- preserve existing actions during the first pass
- add result-state tests before improving UI copy and layout

## Success Criteria

This initiative is successful when:

- gameplay, setup, and add-player routes are meaningfully smaller and more focused
- app-wide save/sync/import state is rendered through one consistent status model
- history feels like a trustworthy data-management screen rather than a loose action list
- chart detail pages always tell the truth about where their data came from
- chart and comparison visuals rely on smaller shared primitives instead of sprawling local style systems
- one critical-path smoke harness can catch cross-subsystem regressions that focused guards would miss

## Recommendation

Proceed with the `foundation-first` phased rollout:

1. gameplay/session architecture
2. shared app-status layer
3. history/data-management surface
4. chart provenance plus chart/card visual system
5. critical-path smoke harness

This order reduces the largest state and architecture risks first, then adds clearer user-facing trust signals, and only then consolidates the visual/chart layers around those stabilized seams.
