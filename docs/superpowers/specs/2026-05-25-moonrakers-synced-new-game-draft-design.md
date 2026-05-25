# Moonrakers Synced New Game Draft Design

Date: 2026-05-25
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will add one account-backed unfinished game draft that survives app restarts, restores in-progress score entry, and syncs across devices for the signed-in user.

This design replaces the current route-handoff approach for the new-game flow with a dedicated synced draft boundary that spans:

- [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx)
- [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx)
- [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx)
- [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx)

The unfinished draft becomes the source of truth for setup and live in-progress game state. The current `activeGame` state in [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts) remains important for runtime rendering, but it becomes a projection of the draft instead of the canonical unfinished-session store.

## Confirmed Product Decisions

- This spec covers the first sub-project from the broader improvement wave: the new-game draft flow.
- An unfinished draft must survive full app restarts until the user explicitly starts, discards, or replaces it.
- If the user tries to begin a new game while a draft already exists, the app must prompt `resume`, `discard`, or `start over`.
- If the user had already reached the live game screen, resuming must restore the in-progress score entry rather than only the setup choices.
- The unfinished draft must sync with the signed-in user so it can be resumed on another device.
- There is exactly one unfinished draft per signed-in user across the whole app, not one per group.

## Goals

- Add one trustworthy unfinished draft model for the entire new-game flow.
- Persist draft state across app restarts and account sessions.
- Sync unfinished state across devices for the signed-in user.
- Restore users into the correct route phase, including live score-entry progress.
- Reduce fragile JSON route-param handoff across the setup flow.
- Keep the scoring UI fast by preserving a local runtime projection.
- Make resume, discard, and start-over behavior explicit and predictable.

## Non-Goals

- Supporting multiple simultaneous unfinished drafts.
- Supporting shared collaborative editing of one draft by multiple users.
- Merging concurrent edits field by field across devices.
- Rewriting the scoring engine in [engine/gameEngine](C:/Users/izzyh/Desktop/moonrakers-app/engine).
- Replacing Zustand or the broader app bootstrap architecture.
- Solving unrelated history, charts, analytics, or auth redesign work in this sub-project.

## Current Architecture Context

Today the new-game flow is split across route-local state and route handoff:

- [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx) owns the home launch decisions and the only visible in-progress-game interrupt.
- [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx) owns player and group selection concerns.
- [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx) owns turn-order preparation and start-game bootstrapping.
- [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx) owns live score entry and end-of-game behavior.
- [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts) stores `activeGame`, but it is optimized for the live runtime screen rather than for a durable, cross-device unfinished draft lifecycle.

There is not yet a first-class draft object. The current flow behaves more like a sequence of route steps that eventually produce `activeGame` than a resilient session model that can be safely restored, replaced, or synchronized.

That makes several behaviors weak or ambiguous:

- app-restart recovery
- cross-device resume
- deciding where a resumed session should land
- differentiating `discard` from `start over`
- preserving in-progress score entry while still allowing clean setup editing

## Recommended Architecture

### Core Direction

Add a dedicated synced `game draft` boundary above the current route flow and below the existing auth/bootstrap layer.

The architecture should separate:

- `cloud draft contract`
- `draft domain model and phase rules`
- `draft sync controller`
- `local draft shadow state`
- `runtime game projection`
- `route adapters`

This keeps one clear unfinished-session source of truth while still letting the live game screen render from a shape that is convenient for scoring.

### Why This Direction

This is the best fit for the approved product decisions because it supports:

- full-restart persistence
- signed-in cross-device recovery
- one unfinished draft per account
- explicit `resume / discard / start over` decisions
- restoration of route phase and score-entry progress

It also avoids overloading `activeGame` with both runtime concerns and long-lived synchronization semantics.

## System Design

### 1. Cloud Draft Contract

Create a dedicated cloud contract under `lib/cloud/game-drafts/*` with three primary operations:

- `loadUserGameDraft`
- `saveUserGameDraft`
- `deleteUserGameDraft`

The cloud model should store exactly one unfinished draft per signed-in user. A simple and durable shape is:

- `profile_id`
- `draft_id`
- `phase`
- `revision`
- `updated_at`
- `device_updated_at`
- `payload`

`payload` should contain the actual unfinished game state, while `phase`, `revision`, and timestamps support restore and conflict decisions without embedding everything inside opaque JSON.

The contract does not need multi-user editing semantics. It only needs to support one account restoring or replacing its own unfinished draft across devices.

### 2. Draft Domain Model

Create a focused domain layer under `lib/game-draft/*`.

This layer should define the canonical draft type and the legal transitions between phases:

- `empty`
- `player_selection`
- `setup`
- `in_progress`
- `ready_to_finish`

The draft payload should include:

- selected player ids
- selected group id and optional name snapshot
- player roster snapshot used by the unfinished session
- turn order
- created-at and updated-at values
- current route phase
- in-progress game state once gameplay begins
- winner-selection progress if applicable

The in-progress game state should preserve everything needed to resume [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx) without reconstructing it from guesswork:

- turn index
- rounds
- totals
- current turn state
- round count
- selected winner id
- group metadata used by the unfinished game

This layer should also own the rules for:

- whether a draft is resumable
- what route a resumed draft should open
- whether `start over` seeds a fresh empty draft or returns to a preselection state
- what fields get cleared when a phase is rewound

### 3. Synced Draft Controller

Add a shared controller hook, likely `useSyncedGameDraft`, that coordinates:

- draft restore on bootstrap or first access
- local shadow updates for immediate UI response
- debounced or batched cloud saves
- explicit discard and start-over actions
- conflict detection
- projection into runtime game state

This hook should be the only place that knows both the draft domain rules and the cloud persistence behavior.

It should expose a concise route-facing API such as:

- `draft`
- `status`
- `resumeRoute`
- `seedDraft`
- `updateRoster`
- `updateSetup`
- `beginGameplay`
- `updateGameplay`
- `discardDraft`
- `startOver`
- `markFinished`

The route files should consume actions, not re-implement session logic.

### 4. Local Shadow State

Keep a local draft shadow in [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts) so the UI remains responsive even if network writes are delayed.

The local layer should hold:

- current draft snapshot
- sync status
- dirty state
- last sync time
- restore state
- conflict state

It should not own phase transition rules or cloud write policy. Those stay in the controller and domain layers.

### 5. Runtime Game Projection

`activeGame` should become the runtime projection of the canonical draft once the draft enters `in_progress`.

That means:

- setup routes modify the draft directly
- entering gameplay creates or refreshes `activeGame` from the draft
- game-screen edits write through the controller, which updates both the draft and the projection

This preserves the ergonomics of the current game screen while removing the risk that the UI runtime state drifts away from the persisted unfinished session.

## Route Behavior

### Home

[app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx) becomes the decision point for unfinished-draft entry.

If a synced unfinished draft exists, the user should see a clear interrupt with three actions:

- `Resume`
- `Discard`
- `Start over`

Behavior:

- `Resume` navigates to the route implied by the draft phase.
- `Discard` deletes the unfinished draft and clears local shadow state.
- `Start over` clears the existing draft and immediately seeds a new empty draft so the app does not fall back into the old one.

If no unfinished draft exists, home behaves normally.

### Add Players

[app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx) should stop acting like a temporary route-local staging area.

Instead, it edits the shared draft directly:

- selected players
- selected group
- profile-setup handoff context if needed

This removes the need for fragile route-param serialization as the main transport for selected roster state.

### Game Setup

[app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx) should edit the draft's setup phase:

- ordered player list
- first-captain selection
- any setup metadata that must survive resume

Starting the game advances the draft from `setup` to `in_progress` and creates or refreshes the runtime projection.

### Game

[app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx) becomes a consumer of the synced unfinished session rather than the sole owner of it.

Live gameplay edits should update:

- draft gameplay payload
- runtime `activeGame` projection

in one coordinated action path.

If the app restarts or the user opens another device, the `in_progress` draft must restore them back into the game screen with the same score-entry progress, current player turn, and round data.

### Finish Game

Finishing the game remains coordinated through the game-session controller, but the unfinished draft should only be cleared after the completed-game save succeeds.

This prevents the user from losing their unfinished session if the final cloud save fails.

## Sync And Conflict Rules

The draft should feel trustworthy and conservative.

### Source Of Truth

For signed-in users, the cloud draft is the canonical unfinished-session record.

The app restores that draft on launch, hydrates the local shadow, and then projects it into runtime state as needed.

### Local Unsynced Edits

If the current device has unsynced local edits because the network is unavailable:

- keep rendering the local draft shadow
- mark the draft as pending sync
- retry background saves
- never silently snap backward to an older remote payload

### Cross-Device Replace Behavior

Because there is only one unfinished draft per account, concurrent edits should use replace semantics rather than merge semantics.

The controller should compare revision metadata and behave as follows:

- if the cloud draft changed and the local device has no unsynced edits, adopt the newer cloud version
- if the cloud draft changed and the local device also has unsynced edits, surface a conflict state and ask the user to resolve it

This design does not attempt field-level merging for:

- roster
- turn order
- round history
- current turn scoring

That would be too risky and too hard to explain.

### Logout

Logging out should clear only the local shadow state for the current device.

The unfinished draft remains attached to the signed-in account so the user can resume it after logging back in on the same or another device.

## UX Rules

The draft UX should always prefer preserving work and making state explicit.

Required visible states:

- draft restored
- saving draft
- saved
- pending sync
- conflict
- failed to sync

These can reuse the shared app-status direction already established elsewhere in the app, but the draft controller should expose route-friendly semantics rather than forcing each screen to interpret raw sync events.

User-action rules:

- `Resume` opens the route that matches the saved draft phase.
- `Discard` clears both local shadow and cloud draft.
- `Start over` clears the current draft first, then seeds a new empty one immediately.
- `Finish game` clears the draft only after successful completed-game save.
- `Login required` blocks cloud-backed draft creation or restore until a valid signed-in session exists.

## Testing Strategy

This sub-project needs coverage around the trust boundaries, not just around happy-path rendering.

Priority verification:

1. restore draft after full app restart
2. resume into the correct route phase
3. restore in-progress score entry from the game screen
4. prompt correctly when a draft already exists
5. discard clears both local and cloud unfinished state
6. start over replaces the old draft with a fresh one
7. newer remote draft replaces local state when there are no unsynced edits
8. local unsynced edits remain visible and recover after network return
9. finish-game success clears the draft
10. finish-game failure preserves the draft

Likely test layers:

- domain tests for draft transitions and route resolution
- controller tests for sync, replace, and conflict rules
- focused route tests for prompt behavior and restored-phase rendering
- one smoke-path update that proves home -> add players -> setup -> game -> restart -> resume works

## Rollout Plan

Recommended implementation order:

1. add the draft domain model and local shadow state
2. add the cloud contract and one-draft-per-user persistence
3. add the shared synced controller
4. migrate home to the `resume / discard / start over` interrupt
5. migrate add-players and game-setup to edit the draft directly
6. migrate game to write in-progress state through the draft controller
7. wire finish-game clearing to successful completion only
8. add focused verification and one restart/resume smoke path

This order keeps the app shippable throughout the transition and avoids moving every route and persistence boundary at once.

## Risks And Mitigations

### Risk: runtime state and draft state drift apart

Mitigation:

- make the controller the only writer for draft-backed gameplay state
- keep `activeGame` as a projection, not a competing source of truth

### Risk: cross-device replacement surprises the user

Mitigation:

- surface replace and conflict states explicitly
- avoid silent field merges
- prefer conservative replace semantics with revision checks

### Risk: finish-game errors delete the unfinished session

Mitigation:

- clear the draft only after completed-game save succeeds
- preserve the draft on save failure

### Risk: route migration leaves old param-based code paths behind

Mitigation:

- migrate each route to consume draft actions directly
- remove draft-relevant JSON route-param dependence once the new path is stable

## Success Criteria

This design is successful when:

- a signed-in user can leave the app mid-setup or mid-game and resume later
- the same unfinished draft can be resumed on another device
- the app always presents at most one unfinished draft per account
- home clearly prompts `resume / discard / start over`
- score-entry progress is restored when resuming from the game screen
- users do not lose unfinished work because of refresh or save timing
- the route stack becomes simpler because it depends on one shared draft controller instead of fragile handoff state
