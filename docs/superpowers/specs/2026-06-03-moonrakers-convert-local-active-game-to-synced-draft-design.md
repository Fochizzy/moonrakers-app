# Moonrakers Convert Local Active Game To Synced Draft Design

Date: 2026-06-03
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will automatically convert a legacy local-only `activeGame` into the existing synced `gameDraft` model the first time the user resumes that game.

The chosen behavior is:

- conversion happens automatically on first resume
- if the draft save to Supabase fails, the user still resumes locally
- if the game contains local-only roster identities, the user still resumes locally
- finishing the game should continue to use the existing `Finish Game` save path

This feature does not introduce a second unfinished-session model. It closes the gap between the old local runtime object and the newer synced-draft flow so that resumed games land on the current draft-backed path.

## Confirmed Product Decisions

- The app should use the `first-resume runtime migration` approach, not a bootstrap-time conversion.
- Conversion should happen automatically without a new prompt.
- If draft sync fails, the user should still continue into the game.
- If the game includes local-only players or groups that cannot finish to Supabase yet, the user should still continue into the game.
- In that roster-mismatch case, the app should warn that cloud finish may be blocked until the roster is fixed.

## Goals

- Convert legacy local `activeGame` state into the canonical synced draft model at the moment of first resume.
- Preserve every piece of live scoring state needed to resume play without data loss.
- Keep the app usable when draft sync fails.
- Preserve the existing `Finish Game` cloud save path.
- Make the new synced draft become the source of truth immediately after conversion.

## Non-Goals

- Adding a second unfinished-game persistence model.
- Rewriting the live scoring engine.
- Changing the Supabase `user_game_drafts` schema.
- Blocking play when draft sync or roster validation fails.
- Solving multi-device merge conflicts beyond the current single-draft behavior.

## Current Architecture Context

The app already has a canonical synced draft system:

- [lib/game-draft/useSyncedGameDraft.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/game-draft/useSyncedGameDraft.ts)
- [lib/game-draft/buildActiveGameProjection.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/game-draft/buildActiveGameProjection.ts)
- [lib/game-draft/types.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/game-draft/types.ts)

That system persists one unfinished draft per signed-in user, mirrors it into a local shadow, and projects `gameDraft` back into `activeGame` during gameplay.

The remaining gap is legacy local runtime state:

- [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts) still contains `activeGame` mutation helpers such as `startActiveGame`, `patchActiveGame`, and `clearActiveGame`
- [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx) still treats `activeGame` as the home-screen resume signal
- [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx) can still render from `activeGame` even if there is no synced draft yet

The synced draft is already the preferred unfinished-session model. This feature only needs to migrate the leftover legacy `activeGame` seam into that model at resume time.

## Chosen Approach

Use a `first-resume runtime migration`.

When the app encounters:

- `activeGame` exists
- `gameDraft` does not exist

it should automatically build a canonical `GameDraft` from the live `activeGame`, hydrate local draft state immediately, queue the normal remote draft save, and then continue the resume flow.

This is better than bootstrap-time migration because the current repo no longer shows a separate storage restore path for `activeGame`. The practical legacy seam is the runtime state the user is about to resume, not a distinct startup snapshot loader.

## Design

### 1. Add A Pure Legacy Conversion Mapper

Create a pure helper under `lib/game-draft/`, for example:

- `buildDraftFromLegacyActiveGame.ts`

Its job is to convert the current `ActiveGame` runtime shape into a canonical `GameDraft`.

Input:

- signed-in `profileId`
- legacy `activeGame`

Output:

- a draft in `phase: "in_progress"`

Mapped fields:

- `profileId`: authenticated user id
- `draftId`: `String(activeGame.id)`
- `phase`: `"in_progress"`
- `revision`: `0`
- `updatedAt`: `Date.now()`
- `deviceUpdatedAt`: `Date.now()`
- `selectedPlayerIds`: ordered player ids from `activeGame.players`
- `selectedGroupId`: `activeGame.groupId ?? null`
- `selectedGroupName`: `activeGame.groupName ?? null`
- `turnOrder`: ordered player ids from `activeGame.players`
- `playerSnapshots`: player identity and appearance fields from `activeGame.players`
- `gameplay.turnIndex`: `activeGame.turnIndex`
- `gameplay.rounds`: `activeGame.rounds ?? []`
- `gameplay.totals`: `activeGame.totals ?? {}`
- `gameplay.current`: `activeGame.current`
- `gameplay.roundCount`: `activeGame.roundCount ?? activeGame.rounds.length`
- `gameplay.selectedWinnerId`: `activeGame.selectedWinnerId ?? null`

This helper must stay pure and side-effect free so it can be covered with direct tests.

### 2. Extend The Synced Draft Controller

Add one shared action to [lib/game-draft/useSyncedGameDraft.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/game-draft/useSyncedGameDraft.ts), for example:

- `ensureDraftForLegacyActiveGame(activeGame)`

Behavior:

- if there is already a `gameDraft`, do nothing
- if there is no signed-in user id, do nothing
- if there is no `activeGame`, do nothing
- otherwise:
  - build a draft from the legacy game
  - call `hydrateGameDraft(...)` immediately so the store switches to the draft-backed source of truth
  - persist the local draft shadow immediately
  - queue the existing debounced Supabase draft save

The immediate local hydrate matters more than the remote save. It guarantees that once the user resumes, the live session is already on the new draft-backed flow even if the network save fails.

### 3. Run Conversion At First Resume

Integrate the shared action in two places.

Primary entry point:

- [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx)

Before the home-screen `Continue` action routes to `/game`, it should call the shared conversion helper when `activeGame && !gameDraft`.

Safety net:

- [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx)

Add a safety-net effect so direct navigation to `/game` also converts legacy state if `activeGame` exists without a draft. This avoids a dependency on only one navigation path.

After conversion succeeds locally, [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts) will already project the synced draft back into `activeGame` through `hydrateGameDraft(...)`.

### 4. Sync Failure Behavior

If the background `saveUserGameDraft(...)` call fails:

- do not clear `activeGame`
- do not clear `gameDraft`
- do not block routing to `/game`
- keep the local draft shadow
- mark the sync state as failed or pending using the existing draft sync status model

The user should continue playing locally. Later edits should continue using the draft-backed path and naturally retry through the existing save queue.

The app should also surface a truthful warning through the existing status pattern:

- title: `Continuing locally`
- detail: draft sync could not be saved yet, but gameplay can continue on this device

### 5. Local-Only Roster Warning

Conversion into a synced draft should not be blocked by local-only players or groups. The draft payload already stores snapshots, so resume can still work locally.

However, local-only identities can still block the later Supabase finish step because the finish flow resolves playable cloud identities before saving.

So conversion should also detect unresolved cloud-playable identities and publish a separate warning:

- gameplay resumes normally
- the warning explains that cloud finish may fail until those players are registered

This warning is about future finishability, not about draft conversion itself.

### 6. Finish Game Compatibility

No changes are required to the existing `Finish Game` contract.

[lib/game-session/useGameSessionController.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/game-session/useGameSessionController.ts) already saves from the live `activeGame` payload. After conversion, `activeGame` remains available as the runtime projection of the synced draft, so the current finish path keeps working.

That means:

- autosync failure does not by itself break finish save
- unresolved local-only players can still break finish save later
- this feature should warn about that case early, but not block resume

## Data And State Transitions

Legacy first-resume flow:

1. user has `activeGame`
2. user has no `gameDraft`
3. user taps `Continue`, or lands directly on `/game`
4. app builds draft from `activeGame`
5. app hydrates local draft state
6. `activeGame` becomes draft-projected runtime state
7. app queues Supabase draft save
8. app either:
   - continues silently if save succeeds
   - continues with a draft-sync warning if save fails

If the roster also contains unresolved local-only identities, the app should additionally show the separate finishability warning described above.

After that moment, the unfinished game is treated like every other synced draft-backed session.

## Testing Strategy

Add focused regression coverage for:

1. `buildDraftFromLegacyActiveGame` maps a legacy active game into the expected `GameDraft` shape.
2. home resume converts `activeGame` into a draft before pushing into the game route.
3. direct game-route entry converts legacy state when no draft exists.
4. draft sync failure does not block resume and does not clear the local session.
5. unresolved local-only players trigger a warning but still allow resume.

These should be implemented as the same kind of focused source or contract guards already used throughout `scripts/`.

## Risks

- If conversion logic drifts from the current `ActiveGame` shape, resumed state could lose fields like objective counts or head-to-head selections.
- If the conversion helper mutates data instead of copying it, later live edits could accidentally share references with stale legacy state.
- If warnings are too aggressive, users may think resume failed even when local continuation is working correctly.

The pure mapper plus focused regression tests should keep this contained.

## Implementation Notes

- No Supabase migration is needed.
- No new route is needed.
- No new user prompt is needed.
- The feature should reuse the existing app status and draft sync status surfaces rather than introducing a second warning system.
