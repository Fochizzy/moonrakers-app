# Moonrakers Shared Supabase Groups Design

Date: 2026-05-23
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will treat Supabase as the only live source of truth for shared player and group data.

Every signed-in player should see the same shared player directory and the same saved groups. Group deletion should remove the whole shared group for everyone, but only if the signed-in player is currently a member of that group. Local or offline groups should stop appearing and should no longer be created, edited, or deleted through a parallel device-only path.

## Confirmed Product Decisions

- All signed-in players can see all shared player data.
- All signed-in players can see all shared groups.
- A shared group can be deleted only by a signed-in player who is currently a member of that group.
- Deleting a shared group removes the whole group for everyone, not just the requesting member.
- The group creator does not get special delete permission unless they are also a current member.
- Groups should no longer behave as local or offline data.
- Existing local groups should stop showing up and Supabase should be treated as the only live source going forward.

## Goals

- Make Supabase the only live source of truth for visible player and group data.
- Keep shared roster visibility consistent for every signed-in player.
- Allow member-authorized deletion of whole shared groups.
- Prevent non-members from deleting shared groups.
- Remove local group creation and local group visibility from the active app flow.
- Keep the implementation narrow enough to avoid unrelated roster or analytics refactors.

## Non-Goals

- Replacing local storage for every other app domain.
- Reworking gameplay save flows in the same change.
- Changing who can create shared groups beyond the current signed-in flow.
- Broadening group rename or membership-edit permissions.
- Migrating legacy local groups into Supabase.

## Current Architecture Context

The current shared-cloud bootstrap already loads group and player data from Supabase through:

- [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx)
- [lib/cloud/loadCloudSnapshot.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/loadCloudSnapshot.ts)
- [lib/cloud/loadRegisteredProfiles.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/loadRegisteredProfiles.ts)
- [lib/cloud/normalizeCloudSnapshot.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/normalizeCloudSnapshot.ts)

That flow already gives authenticated users a shared cloud snapshot of:

- `profiles`
- `groups`
- `group_members`
- `games`
- `game_participants`
- `game_rounds`

The store then hydrates those records into the app-wide Zustand state in [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts).

However, the current group model still has mixed behavior:

- [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx) falls back to locally stored groups when no signed-in session is present.
- [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx) can still create and delete groups locally when the profile is not ready.
- [utils/storage/storage.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/storage/storage.ts) still exposes `loadGroups()` and `saveGroups()` as a general persisted group dataset.
- [lib/localCache/persistLocalCacheSnapshot.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/localCache/persistLocalCacheSnapshot.ts) still caches groups alongside players and games.

The current Supabase authorization model also does not match the confirmed delete rule. In [supabase/migrations/20260422214500_moonrakers_auth_profiles_groups.sql](C:/Users/izzyh/Desktop/moonrakers-app/supabase/migrations/20260422214500_moonrakers_auth_profiles_groups.sql), `groups_manage_own` currently grants creator-owned `FOR ALL` access on `public.groups`. That means creator ownership, not current membership, is the active delete authority.

## Recommended Architecture

### Core Direction

Adopt a Supabase-only live group model with member-authorized shared deletion.

This means:

- shared reads stay broad for authenticated users,
- cloud-backed groups remain the only visible groups,
- local group mutation paths are removed from the active UX,
- deletion authorization is moved from creator-only to current-member-only.

### Why This Direction

This matches the confirmed product rules without introducing a broader redesign.

It avoids two bad outcomes:

- a split model where users see different groups depending on device-local storage,
- or a permissions model where the UI implies membership-based collaboration but Supabase still enforces creator-only destructive actions.

## Supabase Authorization Model

### Shared Read Access

Keep shared authenticated reads for:

- `public.profiles`
- `public.groups`
- `public.group_members`
- `public.games`
- `public.game_participants`
- `public.game_rounds`

This preserves the current requirement that every signed-in player can see all shared player and group data.

### Group Write Boundaries

Split the current `groups_manage_own` policy into separate concerns so delete authorization can change without accidentally widening unrelated write powers.

Recommended target behavior:

- `INSERT` on `public.groups`
  - allowed only when `created_by = auth.uid()`
- `UPDATE` on `public.groups`
  - stays creator-only
- `DELETE` on `public.groups`
  - allowed only when `auth.uid()` is currently present in `public.group_members` for that group

`group_members` mutation policies should remain aligned with the current shared-group creation flow unless a later product decision explicitly broadens group editing.

### Delete Semantics

Deleting a row from `public.groups` should continue deleting the whole group through the existing cascade to `public.group_members`.

That gives the intended behavior:

- the whole group disappears for everyone,
- membership is the only delete authority,
- creators lose delete authority if they are no longer members,
- non-members never gain delete authority even if they can see the group.

## Client Architecture

### Shared Group Source of Truth

The live visible group directory should come only from the authenticated Supabase snapshot loaded through:

- [lib/cloud/loadCloudSnapshot.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/loadCloudSnapshot.ts)
- [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx)

The shared player directory should continue merging:

- shared snapshot players,
- shared registered profiles

through [utils/registeredProfilePlayer.ts](C:/Users/izzyh/Desktop/moonrakers-app/utils/registeredProfilePlayer.ts).

### Add Players Screen

[app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx) remains the main UI surface for group management.

Required changes:

- remove local group creation fallback,
- remove local group deletion fallback,
- require a signed-in completed profile for all group mutations,
- compute delete permission from membership:
  - `isMember = group.playerIds.includes(signedInUserId)`
- show the delete action only when `isMember` is true,
- make the confirmation copy explicit that deleting removes the shared group for everyone.

If the signed-in user is not a member:

- the group remains visible,
- the destructive action is hidden or disabled,
- the UI should not imply permission they do not have.

### App Bootstrap

[app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx) should stop treating locally stored groups as a live visible fallback source when no session exists.

The target behavior is:

- signed-in users hydrate groups from Supabase,
- signed-out users do not see a live group directory,
- local storage may temporarily cache cloud state for resilience, but it is not an independently mutable group dataset.

### Shared Group Helper

[lib/cloud/sharedGroups.ts](C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/sharedGroups.ts) can keep the same basic delete implementation:

- delete the `groups` row by `id`

The important change is not the delete call shape. It is the Supabase authorization behind it and the UI gating in the caller.

## Local Group Removal Strategy

### Product Rule

Groups should not exist as a separate local or offline feature anymore.

### Practical Consequences

- Existing local groups already stored on device should stop appearing.
- New groups should not be created unless they are saved through Supabase.
- Delete actions should never target a local-only group path.

### Storage Handling

The local `groups` key can remain as a cache container only if needed for last-known cloud snapshot continuity, but it should no longer be treated as:

- a user-editable dataset,
- a fallback list to display as live groups,
- or a separate roster system that diverges from Supabase.

As part of this change, it is reasonable to clear persisted local groups so stale device-only groups do not resurface through older code paths.

## Realtime and Refresh Behavior

The current shared refresh flow in [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx) already subscribes to:

- `groups`
- `group_members`

That is the right refresh contract for this feature.

After a member deletes a shared group:

- the delete caller should continue performing an explicit refresh,
- other signed-in clients should converge through the existing realtime-driven refresh,
- the removed group should disappear from all clients.

No extra client-side merge rules should be added for legacy local groups because those groups are no longer part of the live product model.

## Error Handling

### Unauthorized Delete Attempts

If a non-member reaches the delete path due to stale UI or unexpected navigation state, Supabase should reject the delete.

The client should surface a clear error message such as:

- "Only players in this group can delete it."

### Signed-Out or Incomplete Profile State

If a player is not signed in or has not completed profile setup:

- the app should not create groups locally,
- the app should not show local fallback groups,
- the app should route them toward sign-in or profile completion before allowing shared group actions.

### Stale Membership

If a user was a member when the screen rendered but no longer is by the time they tap delete, the delete should fail safely at Supabase and the client should refresh the shared snapshot.

## Testing Strategy

### Policy Coverage

Add regression coverage proving:

- authenticated users can read all shared groups,
- authenticated users can read all shared player data,
- a current group member can delete the whole shared group,
- a non-member cannot delete that shared group,
- creator status alone is not enough if the creator is no longer a member.

### Screen Coverage

Add app-level regression coverage proving:

- [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx) only offers delete for current group members,
- group creation no longer falls back to local storage,
- group deletion no longer falls back to local storage,
- unsigned or incomplete-profile users do not see live local groups presented as real shared groups.

### Bootstrap Coverage

Add regression coverage proving:

- [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx) no longer hydrates visible groups from local fallback when the user is not signed in,
- the visible group dataset for signed-in users comes from the shared Supabase snapshot.

## Implementation Outline

1. Update Supabase group policies to separate insert, update, and delete authority.
2. Make `DELETE` on `public.groups` membership-based instead of creator-based.
3. Remove local group mutation fallbacks from [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx).
4. Remove local group visibility as a live fallback from [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx).
5. Clear or neutralize persisted local groups so stale local-only groups stop appearing.
6. Add failing regressions first, then implement the smallest changes needed to make them pass.

## Risks and Constraints

- The repo currently mixes cloud-backed and cached-local state, so the implementation needs to be careful not to break unrelated player or game hydration.
- Existing local groups will effectively disappear from the visible product, which is intentional but should be reflected in the UI behavior.
- Any future feature that allows editing group membership will need to revisit the `group_members` mutation policies, because this design intentionally keeps the current scope narrow.

## Success Criteria

- Any signed-in player sees the same shared players and shared groups.
- A shared group disappears for everyone when deleted by a current member.
- Non-members cannot delete shared groups.
- Local-only groups are no longer visible or mutable as part of the active product flow.
- The app no longer behaves as if groups can live outside Supabase.
