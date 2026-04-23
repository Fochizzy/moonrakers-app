# Moonrakers Supabase Auth And Cloud Stats Design

Date: 2026-04-22
Status: Approved for planning
Owner: Codex

## Summary

Moonrakers will move from a local-only Expo/Zustand data model to a hybrid Supabase-backed model. Supabase becomes the source of truth for authentication, registered player identities, saved groups, completed games, and shared statistics. The existing in-app store and most current screen logic stay in place, but they will hydrate from cloud data instead of relying on local-only player, group, and game records.

Only one player needs to be logged in to run a table. That signed-in host can search for existing registered players by public player name, add up to four of them to the game, and record results that count immediately for personal, global, and group statistics.

## Confirmed Product Decisions

- Every real player registers with email and password.
- Only one logged-in host is required to create and record a game.
- Additional players added to a game must already be registered.
- Hosts search other players by public player name, not email.
- Recorded results count immediately. No participant confirmation flow.
- Existing local players, groups, and game history should migrate one time into Supabase.
- The migration path must preserve history without letting legacy local-only players leak into the new registered-player-only game creation flow.

## Goals

- Add email/password authentication with Supabase Auth.
- Make registered cloud profiles the canonical player identity model.
- Preserve the current host-driven table creation and scoring flow.
- Support personal stats, global stats, and identified-group stats from Supabase-backed data.
- Migrate existing local data once for signed-in users without losing historical value.
- Keep the UI fast by continuing to use a local in-memory store as the app-facing state layer.

## Non-Goals

- Rewriting every analytics screen around server-only rendering on day one.
- Adding participant approval, dispute handling, or delayed result publication.
- Supporting creation of ad hoc local-only players in new games after Supabase launch.
- Deleting the current local backup/import system during the first cloud rollout.

## Current Architecture Context

The current app uses a single Zustand store in [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts) as the main application state boundary. Screens such as [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx), [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx), [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx), [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx), and [app/history.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/history.tsx) read directly from that store.

Players, groups, and games are currently modeled as local records. The app already has strong client-side stats shaping and game totals logic, plus local backup/import helpers under `utils/backup.ts`, `utils/autoBackupCSV.ts`, and `utils/csv/*`. That makes a hybrid migration more practical than a full server-first rewrite.

## Recommended Architecture

### Core Direction

Use a hybrid cloud model:

- Supabase Auth handles email/password accounts and sessions.
- Supabase Postgres stores canonical profiles, groups, games, participants, rounds, and rollups.
- The app keeps a normalized Zustand store for UI responsiveness.
- The app hydrates that store from Supabase after login and after important writes.
- Existing client-side stats code remains useful for personal and screen-local calculations.
- Shared global and group stats move toward server-backed rollups so devices do not need raw league-wide history downloads.

### Why This Model

This approach preserves the current fast scoring flow, avoids a risky full analytics rewrite, and still gives the app a real multiplayer identity layer with durable shared history.

## Client Architecture

### New Client Boundaries

Add the following boundaries:

- `lib/supabase.ts`
  - Creates the Supabase client for Expo/React Native with persistent session storage.
- `lib/auth/*`
  - Session restore, login, registration, logout, and auth state subscription.
- `lib/bootstrap/*`
  - Loads the signed-in profile, migration state, cloud groups, cloud games, and cloud-backed stats into the app store.
- `lib/cloud-sync/*`
  - Fetch and normalize Supabase rows into existing store-friendly shapes.
- `lib/migration/*`
  - Runs and tracks one-time local-to-cloud migration.
- `lib/game-save/*`
  - Builds the finished-game payload and submits it atomically.

### App Flow

1. On app launch, restore the Supabase session.
2. If signed out, show login/register.
3. If signed in, load the user profile and migration status.
4. If local legacy data exists and migration is incomplete, route to a one-time migration screen.
5. After bootstrap, hydrate the existing app store from Supabase-backed data.
6. Continue to drive gameplay from the in-memory store during live scoring.
7. On save/finish, send canonical game data to Supabase and then refresh cloud-backed store slices.

### Local Storage After Launch

Local storage remains useful, but only as:

- a session/cache layer,
- a recovery layer for in-progress local UI state,
- a backup/import export layer,
- a migration source.

It is no longer the canonical source of truth for registered players, saved groups, or completed cloud games.

## Supabase Data Model

### Auth

- `auth.users`
  - Canonical account identity.
  - Email/password only for this phase.

### Profiles

- `public.profiles`
  - `id uuid primary key references auth.users(id)`
  - `player_name text unique not null`
  - `display_name text`
  - `favorite_color text`
  - `assigned_card_art_index int`
  - `created_at timestamptz`
  - `updated_at timestamptz`

Purpose:

- Public searchable player identity for the app.
- App-facing storage for what is currently saved on local player profiles.

### Groups

- `public.groups`
  - `id uuid primary key`
  - `created_by uuid not null references public.profiles(id)`
  - `name text not null`
  - `created_at timestamptz`
  - `updated_at timestamptz`

- `public.group_members`
  - `group_id uuid references public.groups(id)`
  - `profile_id uuid references public.profiles(id)`
  - `position int`
  - primary key `(group_id, profile_id)`

Purpose:

- Stores identified table lineups owned by a host.
- Supports group-level stats and quick roster reuse.

### Games

- `public.games`
  - `id uuid primary key`
  - `host_profile_id uuid not null references public.profiles(id)`
  - `group_id uuid null references public.groups(id)`
  - `group_name_snapshot text`
  - `status text`
  - `created_at timestamptz`
  - `finished_at timestamptz`
  - `winner_profile_id uuid null references public.profiles(id)`

- `public.game_participants`
  - `id uuid primary key`
  - `game_id uuid not null references public.games(id)`
  - `profile_id uuid null references public.profiles(id)`
  - `player_name_snapshot text not null`
  - `display_name_snapshot text`
  - `color_snapshot text`
  - `assigned_card_art_index_snapshot int`
  - `start_order int not null`
  - `total_prestige numeric`
  - `direct_prestige numeric`
  - `assist_prestige_received numeric`
  - `objective_prestige numeric`
  - `score numeric`
  - `assists int`
  - `failures int`
  - `contracts int`
  - `is_winner boolean`

- `public.game_rounds`
  - `id uuid primary key`
  - `game_id uuid not null references public.games(id)`
  - `participant_id uuid not null references public.game_participants(id)`
  - `round_index int not null`
  - `meta_type text`
  - `linked_turn_id uuid null`
  - `prestige numeric`
  - `contracts int`
  - `failures int`
  - `turns_at_base int`
  - `assist_recipients jsonb`
  - `assist_prestige_recipients jsonb`
  - `objective_count int`
  - `objective_prestige int`
  - `created_at timestamptz`

Purpose:

- Preserves enough raw turn data to keep the current analytics and replay screens viable.
- Uses participant snapshots so historical displays stay stable even if profile data changes later.

### Rollups

- `public.personal_stats_rollups`
  - Optional phase-one optimization. May begin as query-derived instead of materialized.

- `public.global_stats_rollups`
  - Shared aggregate metrics safe to expose broadly.

- `public.group_stats_rollups`
  - Aggregate metrics scoped to identified registered groups.

Purpose:

- Keep global and group stats fast and cloud-backed.
- Avoid downloading entire league history to every device.

## Registered-Only Game Creation Rules

### New Games

For all new games created after Supabase launch:

- every participant must be a registered `public.profiles` row,
- the host must choose additional players by public `player_name`,
- the app must enforce a maximum of five players total,
- the host is the only required authenticated actor during scoring.

### Migrated Legacy Games

Migrated legacy games are allowed to contain participant rows with `profile_id = null` when the migration cannot safely map a historical local player to a registered cloud profile.

This exception exists only for historical preservation. It must not be available in the new game creation flow.

## Player Search And Roster UX

### Search Model

The old freeform local player creation surfaces become registered-player discovery surfaces:

- search by public `player_name`,
- debounce remote search,
- show exact and close matches,
- prevent duplicate participant adds,
- show enough profile metadata to disambiguate similar names.

### Roster Management

Saved groups continue to feel like saved local lineups, but:

- group members are real registered profiles,
- only the group creator edits the group,
- the host can still start from a saved group and then run the familiar game setup flow.

## Authentication UX

### Signed-Out State

Provide dedicated auth screens:

- login,
- register,
- logout entry point in an account/settings surface,
- session restore on relaunch.

### Registration Requirements

Registration requires:

- email,
- password,
- unique public `player_name`.

The user should complete profile setup immediately after account creation if any profile fields are still missing.

## Migration Design

### Migration Trigger

After the first successful sign-in, if legacy local players/groups/games exist and migration is not marked complete, route the user to a one-time migration screen before normal app use.

### Migration State

Store migration progress in a durable record such as `public.profile_migrations`:

- `profile_id`
- `status`
- `started_at`
- `completed_at`
- `last_error`
- `legacy_snapshot_hash`

This makes migration idempotent and resumable.

### Migration Steps

1. Read the current local players, groups, and games.
2. Ask the user to confirm which local player record represents their signed-in cloud profile when needed.
3. Attempt exact `player_name` matches for other legacy players.
4. Upload migrated groups only when all referenced players resolve to registered profiles.
5. Upload games with participant snapshots for every historical player.
6. Link participant rows to `profile_id` when a safe match exists.
7. Mark migration complete only after all required cloud writes succeed.

### Important Migration Rules

- The signed-in user's own historical identity must be explicitly linked if there is any ambiguity.
- Unmatched legacy participants are preserved as snapshot-only historical rows.
- Partially unresolved groups do not become canonical cloud groups.
- Local legacy data is not deleted when migration completes.
- Migration can be retried safely without duplicating already-imported games.

### Group Migration Policy

Only fully resolved groups should be migrated into `public.groups` and `public.group_members`.

If a local group contains unresolved legacy players:

- preserve it in the local backup layer,
- report it in the migration summary,
- do not create a partially valid identified cloud group.

This keeps group-based statistics trustworthy.

## Stats Strategy

### Personal Stats

Phase one can continue to use mostly client-side derivation on the signed-in user's cloud-loaded game history. This minimizes rewrite risk for current screens like `stats`, `elo`, `insights`, and replay-oriented views.

### Global Stats

Global stats should read from server-maintained rollups or safe aggregate views rather than raw league-wide game downloads.

### Group Stats

Group stats should derive from identified registered groups only. Group-level rollups should refresh when:

- a game linked to that group finishes,
- a migrated resolved game is inserted,
- a group membership changes.

### Refresh Model

On game save or migration:

- insert canonical raw game data,
- trigger rollup refresh for affected profiles, groups, and global aggregates,
- refresh the client store from cloud-backed sources.

## Save And Finish Flow

### Atomic Persistence

Finishing a game should use a single transactional backend boundary instead of many unrelated client writes.

Recommended boundary:

- `public.save_completed_game(payload jsonb)`

Responsibilities:

- validate the authenticated host,
- validate that all new-game participants are registered profiles,
- insert `games`,
- insert `game_participants`,
- insert `game_rounds`,
- mark the winner,
- queue or trigger rollup refresh,
- return the saved game id and any changed stat versions.

This function should run with invoker semantics and rely on RLS-compatible inserts, not a public security-definer shortcut.

### Client Failure Handling

If save fails:

- keep the local in-progress game intact,
- do not clear the active game,
- surface retry messaging,
- avoid showing the game as successfully finished.

## Row-Level Security Model

Enable RLS on all exposed tables.

### Profiles

- Any authenticated user may search and read the limited public profile fields needed for roster discovery.
- Users may update only their own profile row.

### Groups

- Creators may create, update, and delete their own groups.
- Creators may manage their own `group_members`.
- Members may read groups they belong to if group stats screens need that visibility.

### Games

- Hosts may insert games they own.
- Hosts may insert participant and round rows for their games.
- Hosts and participants may read a game they took part in.
- Non-participants should not read raw private game rows by default.

### Rollups

- Personal rollups: readable by the owner.
- Global rollups: readable by authenticated users.
- Group rollups: readable by group creators and group members.

## Implementation Touchpoints

Likely first-wave code touchpoints:

- [app/_layout.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/_layout.tsx)
- [app/index.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx)
- [app/add-players.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx)
- [app/manage-players-groups.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/manage-players-groups.tsx)
- [app/game-setup.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx)
- [app/game.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx)
- [app/history.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/history.tsx)
- [app/stats.tsx](C:/Users/izzyh/Desktop/moonrakers-app/app/stats.tsx)
- [store/useStore.ts](C:/Users/izzyh/Desktop/moonrakers-app/store/useStore.ts)
- `utils/storage/*`

New likely modules:

- `lib/supabase.ts`
- `lib/auth/*`
- `lib/bootstrap/*`
- `lib/migration/*`
- `lib/game-save/*`
- `supabase/migrations/*`

## Testing Strategy

### Authentication

- register with email/password,
- login with email/password,
- restore session on relaunch,
- logout cleanly.

### Migration

- run one-time migration from existing local players/groups/games,
- verify idempotent retry behavior,
- verify unresolved legacy players become snapshot-only historical participants,
- verify unresolved groups are reported and skipped from canonical cloud group creation.

### Gameplay

- host searches and adds up to four registered players by player name,
- host starts and finishes a game,
- results persist atomically,
- active game remains retryable if save fails.

### Stats

- signed-in player sees personal stats from cloud-backed history,
- global stats read from shared rollups,
- identified-group stats read from registered group data only,
- participants linked to the finished game see the result reflected immediately.

### Security

- users can edit only their own profile,
- creators can manage only their own groups,
- only hosts can write their game rows,
- participants can read games they were in,
- unrelated authenticated users cannot fetch private raw game history.

## Risks And Mitigations

- Risk: migration mis-links historical local players.
  - Mitigation: explicit self-identity confirmation plus conservative exact-name matching for others.

- Risk: partially resolved groups corrupt identified-group stats.
  - Mitigation: migrate only fully resolved groups into canonical cloud group tables.

- Risk: game finish clears local state before cloud persistence succeeds.
  - Mitigation: transactional save boundary plus retry-first client UX.

- Risk: global stats become expensive if the client keeps calculating everything locally.
  - Mitigation: move global and group aggregates to rollups while preserving client-side personal derivations early.

## Recommended Next Planning Slice

Implementation planning should break the work into these phases:

1. Supabase client, env wiring, auth screens, and auth bootstrap.
2. Profile schema plus player-name search and registered roster management.
3. Group schema plus registered saved-group flow.
4. Transactional finished-game persistence and cloud hydration.
5. One-time migration flow and migration safety checks.
6. Global and group rollups plus stats screen rewiring.
