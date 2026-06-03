# Moonrakers Explicit Unfinished Game Discard Cloud Delete Design

## Summary

When a signed-in user explicitly discards an unfinished game, Moonrakers should delete the corresponding unfinished cloud draft from Supabase before clearing any local unfinished-game state. If that cloud deletion fails, the unfinished game must remain visible locally and the app should report the failure instead of clearing anything.

This behavior applies only to explicit user discard actions such as `Delete Active Game` and any future draft-discard UI. It does not apply to sign-out, auth bootstrap cleanup, or other non-user-initiated local reset paths.

## Goals

- Ensure explicit unfinished-game discard removes the Supabase `user_game_drafts` row instead of leaving stale cloud draft state behind.
- Prevent the app from clearing local unfinished-game state until cloud deletion succeeds.
- Cover all explicit unfinished-game discard entry points with one shared rule.
- Avoid changing sign-out and auth bootstrap cleanup behavior.
- Prevent queued or in-flight draft saves from recreating the draft after a discard.

## Non-Goals

- Do not delete finished games from the `games` table.
- Do not change finish-game behavior beyond preserving the current successful cleanup path.
- Do not make non-explicit cleanup paths block on Supabase deletion.
- Do not add a background retry flow for failed explicit discard.

## Current Context

- Local unfinished gameplay can exist as `activeGame`, `gameDraft`, and the local `gameDraft` shadow in storage.
- Cloud unfinished state is stored in Supabase through `user_game_drafts`.
- `Delete Active Game` on the home screen currently clears only local `activeGame`.
- `useSyncedGameDraft` already owns draft persistence and cloud draft deletion through `deleteUserGameDraft(profileId)`.
- `clearGameDraft()` is also used during auth/bootstrap cleanup, so it cannot become an implicit cloud-delete seam.
- Draft saves can be queued or already running inside `useSyncedGameDraft`, which means explicit discard must coordinate with that lifecycle before deleting the cloud row.

## Recommended Approach

Create one explicit discard action inside `useSyncedGameDraft` that owns the full unfinished-game discard contract for user-triggered flows. UI callers should use that action instead of directly clearing `activeGame` or `gameDraft`.

This shared action should:

1. Cancel any queued draft save timer.
2. Wait for any in-flight draft save to settle.
3. Attempt `deleteUserGameDraft(profileId)` when a signed-in profile exists.
4. Only after that succeeds, clear local unfinished-game state:
   - `activeGame`
   - `gameDraft`
   - local `gameDraft` storage shadow
5. If deletion fails, leave the unfinished game visible and publish a discard failure status.

This keeps all explicit discard routes consistent while leaving sign-out/bootstrap local clears unchanged.

## Architecture

### Shared Explicit Discard Controller

Add a new explicit unfinished-game discard helper to `lib/game-draft/useSyncedGameDraft.ts`. This helper becomes the only supported way to discard an unfinished game from the UI.

Suggested responsibilities:

- derive the active profile id from the current signed-in session or current draft
- coordinate queued/in-flight draft saves before delete
- call Supabase delete first
- clear local unfinished-game state only after delete success
- publish status updates for success and failure

### Local State Boundaries

The explicit discard helper should clear both draft and legacy runtime seams so that no unfinished game survives locally after a successful explicit discard:

- `clearGameDraft()`
- `clearActiveGame()`
- `remove("gameDraft")`

This is intentionally broader than the existing draft-only `discardDraft(...)` behavior because the user requirement is about any unfinished game discard path, including legacy local-only runtime state.

### Non-Explicit Cleanup Paths

The following paths should keep their existing local-clear behavior and should not call the new explicit discard helper:

- sign-out cleanup in `useSharedCloudBootstrap`
- auth bootstrap recovery/anonymous cleanup
- any passive local reset that is not the result of an explicit user discard decision

## UI And Data Flow

### Home Screen Delete Active Game

`app/index.tsx` should stop calling `clearActiveGame` directly from the `Delete Active Game` confirmation. Instead, the destructive confirmation should trigger the shared explicit discard helper.

Expected behavior:

- while discard is running, the button should not be re-triggerable
- if Supabase delete succeeds, the active game disappears as it does today
- if Supabase delete fails, the active game remains visible and the failure is surfaced

### Future Draft Discard UI

Any future unfinished-draft discard button should also call the same explicit discard helper rather than a separate draft-only clear path.

### Finish Game

Successful finish should continue to use its current explicit cleanup path after save succeeds. This spec does not change finish semantics, except that the explicit discard helper should not interfere with the existing post-finish draft deletion.

## Failure Handling

### Cloud Delete Failure

If `deleteUserGameDraft(...)` fails:

- do not clear `activeGame`
- do not clear `gameDraft`
- do not remove local `gameDraft` storage
- publish an error status such as `Couldn't discard unfinished game`
- keep the current unfinished game visible so the user can retry

### Save/Delete Coordination

If a queued or in-flight draft save exists during explicit discard:

- queued save must be cancelled before delete starts
- in-flight save must settle before delete starts
- explicit discard must not clear local state until that coordination is complete

This prevents a stale save from recreating the draft after a successful delete.

## Testing Strategy

Add focused guards around the new explicit discard contract.

### Hook-Level Coverage

Verify that the shared explicit discard helper:

- calls Supabase delete before local clear
- coordinates queued/in-flight save state
- clears local unfinished state only after successful delete
- leaves local unfinished state intact on delete failure

### Route/UI Coverage

Verify that:

- home-screen `Delete Active Game` uses the shared explicit discard helper
- the home-screen delete path no longer clears local active state directly

### Regression Coverage

Verify that:

- sign-out/bootstrap cleanup still uses local clear paths and does not block on cloud deletion
- finish-game cleanup still clears its draft after successful finish

### Verification Commands

The eventual implementation plan should include:

- focused Node source/behavior guards for the new discard helper and home route wiring
- `npm.cmd run typecheck`

## Risks And Mitigations

### Risk: Discard Recreates Draft After Delete

Cause:
- a delayed `saveUserGameDraft(...)` finishes after discard starts

Mitigation:
- explicit coordination and timer cancellation inside `useSyncedGameDraft`

### Risk: Sign-Out Starts Failing Because Cloud Delete Is Required

Cause:
- reusing the explicit discard helper in non-explicit cleanup paths

Mitigation:
- keep explicit discard separate from `clearGameDraft()` and auth/bootstrap cleanup

### Risk: Legacy Local Active Game Is Cleared But Draft Remains

Cause:
- UI still clearing `activeGame` directly instead of using the shared explicit discard helper

Mitigation:
- route/UI guard test that checks home delete wiring

## Acceptance Criteria

- Explicit user discard deletes the Supabase unfinished draft before clearing local unfinished state.
- If cloud delete fails, the unfinished game stays visible and locally intact.
- The home-screen `Delete Active Game` action uses the shared explicit discard helper.
- Explicit discard coordinates with queued/in-flight draft saves so the draft cannot be recreated afterward.
- Sign-out and auth bootstrap cleanup continue to clear locally without requiring cloud deletion.
