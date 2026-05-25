# Moonrakers Synced New Game Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one account-backed unfinished game draft that survives restarts, restores in-progress score entry, and syncs across devices for the signed-in user.

**Architecture:** Add a dedicated draft domain plus a one-row-per-profile Supabase contract, then layer a synced draft controller on top of the existing auth bootstrap and runtime `activeGame` projection. Rewire home, game setup, game, and roster management in small slices so the app stays shippable while route-param handoff is removed.

**Tech Stack:** Expo Router, React Native, TypeScript, Zustand, typed AsyncStorage helpers in `utils/storage`, Supabase tables and RLS migrations, Node/CommonJS source-guard scripts.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-domain.test.ts`
  - Pure domain test for draft phase routing and active-game projection.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-cloud-contract.test.cjs`
  - Source guard for the new migration and cloud helper contract.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-bootstrap-recovery.test.cjs`
  - Source guard for auth bootstrap restore and logout cleanup.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-route-flow.test.cjs`
  - Source guard for home prompt, setup consumption, game writes, and roster draft awareness.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-draft\types.ts`
  - Canonical draft, gameplay payload, and sync-state types.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-draft\phase.ts`
  - Draft phase rules, resume-route mapping, and transition helpers.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-draft\buildActiveGameProjection.ts`
  - Pure helper that projects an `in_progress` draft into the runtime `activeGame` shape.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-draft\useSyncedGameDraft.ts`
  - Shared controller for restore, local shadow persistence, remote sync, and conflict handling.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\game-drafts\normalizeGameDraftRow.ts`
  - Normalizer for Supabase draft rows to runtime draft objects.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\game-drafts\loadUserGameDraft.ts`
  - Reads the signed-in user's unfinished draft.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\game-drafts\saveUserGameDraft.ts`
  - Upserts the signed-in user's unfinished draft.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\game-drafts\deleteUserGameDraft.ts`
  - Deletes the signed-in user's unfinished draft.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260525164000_moonrakers_user_game_drafts.sql`
  - Adds `public.user_game_drafts`, RLS policies, and revision bump trigger.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\storage\storageKeys.ts`
  - Add a typed `gameDraft` local-shadow storage record.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\store\useStore.ts`
  - Add draft shadow state, sync metadata, and store actions/hooks.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\app-status\types.ts`
  - Add `game_draft` as a shared status scope.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\auth\useSharedCloudBootstrap.ts`
  - Restore the draft after shared snapshot hydration and clear the local shadow on logout.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
  - Replace route-param launch orchestration with draft seeding and the `resume / discard / start over` interrupt.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game-setup.tsx`
  - Read setup state from the draft and advance it into `in_progress`.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game.tsx`
  - Write live gameplay changes through the draft controller and restore runtime projection from the draft.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx`
  - Add draft-aware resume CTA and protect drafted players/groups from destructive edits.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-session\useGameSessionController.ts`
  - Clear the draft only after completed-game save succeeds.

## Task 1: Lock The Draft Contract With Failing Tests

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-domain.test.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-cloud-contract.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-bootstrap-recovery.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-route-flow.test.cjs`

- [ ] **Step 1: Write the failing domain test.**

```ts
import assert from "node:assert/strict";

import { resolveDraftResumeRoute } from "../lib/game-draft/phase";
import { buildActiveGameProjection } from "../lib/game-draft/buildActiveGameProjection";
import type { GameDraft } from "../lib/game-draft/types";

const sampleDraft: GameDraft = {
  profileId: "captain-1",
  draftId: "draft-1",
  phase: "in_progress",
  revision: 3,
  updatedAt: 1716650000000,
  deviceUpdatedAt: 1716650000500,
  selectedPlayerIds: ["captain-1", "captain-2", "captain-3"],
  selectedGroupId: "group-1",
  selectedGroupName: "Night Shift",
  turnOrder: ["captain-2", "captain-1", "captain-3"],
  playerSnapshots: [
    { id: "captain-1", name: "Nova", color: "#60A5FA", initials: "NO", assignedCardArtIndex: 0 },
    { id: "captain-2", name: "Pike", color: "#F472B6", initials: "PI", assignedCardArtIndex: 1 },
    { id: "captain-3", name: "Rune", color: "#34D399", initials: "RU", assignedCardArtIndex: 2 },
  ],
  gameplay: {
    turnIndex: 1,
    rounds: [],
    totals: {},
    current: {
      prestige: 4,
      contracts: 1,
      failures: 0,
      assistRecipients: {},
      assistPrestigeRecipients: {},
      objectiveCount: 0,
    },
    roundCount: 2,
    selectedWinnerId: null,
  },
};

assert.equal(resolveDraftResumeRoute("player_selection"), "/");
assert.equal(resolveDraftResumeRoute("setup"), "/game-setup");
assert.equal(resolveDraftResumeRoute("in_progress"), "/game");
assert.equal(resolveDraftResumeRoute("ready_to_finish"), "/game");

const projected = buildActiveGameProjection(sampleDraft);
assert.equal(projected.players[0].id, "captain-2");
assert.equal(projected.turnIndex, 1);
assert.equal(projected.groupId, "group-1");
assert.equal(projected.groupName, "Night Shift");
assert.equal(projected.current.prestige, 4);

console.log("game-draft-domain.test.ts passed");
```

- [ ] **Step 2: Run the domain test to verify it fails before implementation.**

Run: `node .\scripts\game-draft-domain.test.ts`

Expected: FAIL with `Cannot find module '../lib/game-draft/phase'` or the first missing draft-domain import.

- [ ] **Step 3: Write the failing cloud-contract guard.**

```js
const fs = require("node:fs");
const assert = require("node:assert/strict");

const migrationPath =
  "C:/Users/izzyh/Desktop/moonrakers-app/supabase/migrations/20260525164000_moonrakers_user_game_drafts.sql";
const saveHelperPath =
  "C:/Users/izzyh/Desktop/moonrakers-app/lib/cloud/game-drafts/saveUserGameDraft.ts";

assert.ok(fs.existsSync(migrationPath), "expected the draft migration file to exist");
assert.ok(fs.existsSync(saveHelperPath), "expected the save helper to exist");

const migration = fs.readFileSync(migrationPath, "utf8");
assert.match(migration, /create table public\.user_game_drafts/i);
assert.match(migration, /profile_id uuid primary key/i);
assert.match(migration, /phase text not null/i);
assert.match(migration, /payload jsonb not null/i);
assert.match(migration, /alter table public\.user_game_drafts enable row level security/i);

const saveSource = fs.readFileSync(saveHelperPath, "utf8");
assert.match(saveSource, /\.from\("user_game_drafts"\)/);
assert.match(saveSource, /upsert\(/);
assert.match(saveSource, /onConflict:\s*"profile_id"/);

console.log("game-draft-cloud-contract.test.cjs passed");
```

- [ ] **Step 4: Run the cloud-contract guard to verify it fails.**

Run: `node .\scripts\game-draft-cloud-contract.test.cjs`

Expected: FAIL with `expected the draft migration file to exist`.

- [ ] **Step 5: Write the failing bootstrap and route-flow guards.**

```js
// scripts/game-draft-bootstrap-recovery.test.cjs
const fs = require("node:fs");
const assert = require("node:assert/strict");

const bootstrap = fs.readFileSync(
  "C:/Users/izzyh/Desktop/moonrakers-app/lib/auth/useSharedCloudBootstrap.ts",
  "utf8",
);

assert.match(bootstrap, /loadUserGameDraft/);
assert.match(bootstrap, /hydrateGameDraft/);
assert.match(bootstrap, /clearGameDraft/);
assert.match(bootstrap, /remove\("gameDraft"\)/);

console.log("game-draft-bootstrap-recovery.test.cjs passed");
```

```js
// scripts/game-draft-route-flow.test.cjs
const fs = require("node:fs");
const assert = require("node:assert/strict");

const home = fs.readFileSync("C:/Users/izzyh/Desktop/moonrakers-app/app/index.tsx", "utf8");
const setup = fs.readFileSync("C:/Users/izzyh/Desktop/moonrakers-app/app/game-setup.tsx", "utf8");
const game = fs.readFileSync("C:/Users/izzyh/Desktop/moonrakers-app/app/game.tsx", "utf8");
const roster = fs.readFileSync("C:/Users/izzyh/Desktop/moonrakers-app/app/add-players.tsx", "utf8");

assert.match(home, /useSyncedGameDraft/);
assert.match(home, /Resume/);
assert.match(home, /Start over/);
assert.doesNotMatch(home, /selectedPlayers:\s*JSON\.stringify/);

assert.match(setup, /useSyncedGameDraft/);
assert.match(setup, /beginGameplay/);

assert.match(game, /useSyncedGameDraft/);
assert.match(game, /updateGameplay/);

assert.match(roster, /Resume draft/);
assert.match(roster, /unfinished draft/i);

console.log("game-draft-route-flow.test.cjs passed");
```

- [ ] **Step 6: Run the bootstrap and route-flow guards to verify they fail.**

Run: `node .\scripts\game-draft-bootstrap-recovery.test.cjs`

Expected: FAIL on the missing `loadUserGameDraft` match.

Run: `node .\scripts\game-draft-route-flow.test.cjs`

Expected: FAIL on the missing `useSyncedGameDraft` match in `app/index.tsx`.

- [ ] **Step 7: Commit the red tests.**

```bash
git add scripts/game-draft-domain.test.ts scripts/game-draft-cloud-contract.test.cjs scripts/game-draft-bootstrap-recovery.test.cjs scripts/game-draft-route-flow.test.cjs
git commit -m "test: lock synced game draft contract"
```

## Task 2: Add The Draft Domain And Local Shadow State

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\storage\storageKeys.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-draft\types.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-draft\phase.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-draft\buildActiveGameProjection.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\store\useStore.ts`

- [ ] **Step 1: Extend the typed storage schema with a draft shadow record.**

```ts
// utils/storage/storageKeys.ts
export const STORAGE_KEYS = {
  PLAYERS: createKey("players"),
  GAMES: createKey("games"),
  GROUPS: createKey("groups"),
  SETTINGS: createKey("settings"),
  GAME_DRAFT: createKey("game-draft"),
} as const;

export type StoredGameDraftPhase =
  | "player_selection"
  | "setup"
  | "in_progress"
  | "ready_to_finish";

export type StoredGameDraftGameplay = {
  turnIndex: number;
  rounds: StoredRound[];
  totals: Record<string, StoredPlayerTotals>;
  current: {
    prestige: number;
    contracts: number;
    failures: number;
    assistRecipients: Record<string, number>;
    assistPrestigeRecipients: Record<string, number>;
    objectiveCount: number;
  };
  roundCount: number;
  selectedWinnerId?: string | null;
};

export type StoredGameDraft = {
  profileId: string;
  draftId: string;
  phase: StoredGameDraftPhase;
  revision: number;
  updatedAt: number;
  deviceUpdatedAt: number;
  selectedPlayerIds: string[];
  selectedGroupId?: string | null;
  selectedGroupName?: string | null;
  turnOrder: string[];
  playerSnapshots: StoredGamePlayer[];
  gameplay?: StoredGameDraftGameplay | null;
};

export type StoredGameDraftShadow = {
  profileId: string;
  draft: StoredGameDraft | null;
  dirty: boolean;
  syncState: "idle" | "restoring" | "saving" | "saved" | "pending" | "conflict" | "failed";
  lastSyncedAt?: number | null;
};

export type StorageSchema = {
  players: StoredPlayer[];
  games: StoredGame[];
  groups: StoredGroup[];
  settings: StoredSettings;
  gameDraft: StoredGameDraftShadow;
};
```

- [ ] **Step 2: Implement the canonical draft types and pure phase helpers.**

```ts
// lib/game-draft/types.ts
export type GameDraftPhase = "player_selection" | "setup" | "in_progress" | "ready_to_finish";

export type GameDraftPlayerSnapshot = {
  id: string;
  name: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
};

export type GameDraftGameplay = {
  turnIndex: number;
  rounds: Array<Record<string, unknown>>;
  totals: Record<string, Record<string, unknown>>;
  current: {
    prestige: number;
    contracts: number;
    failures: number;
    assistRecipients: Record<string, number>;
    assistPrestigeRecipients: Record<string, number>;
    objectiveCount: number;
  };
  roundCount: number;
  selectedWinnerId?: string | null;
};

export type GameDraft = {
  profileId: string;
  draftId: string;
  phase: GameDraftPhase;
  revision: number;
  updatedAt: number;
  deviceUpdatedAt: number;
  selectedPlayerIds: string[];
  selectedGroupId?: string | null;
  selectedGroupName?: string | null;
  turnOrder: string[];
  playerSnapshots: GameDraftPlayerSnapshot[];
  gameplay?: GameDraftGameplay | null;
};

export type GameDraftSyncState = {
  state: "idle" | "restoring" | "saving" | "saved" | "pending" | "conflict" | "failed";
  dirty: boolean;
  lastSyncedAt?: number | null;
  conflictMessage?: string | null;
};
```

```ts
// lib/game-draft/phase.ts
import { APP_ROUTES } from "@/utils/appRoutes";
import type { GameDraft, GameDraftPhase } from "./types";

export function resolveDraftResumeRoute(phase: GameDraftPhase) {
  switch (phase) {
    case "setup":
      return APP_ROUTES.gameSetup;
    case "in_progress":
    case "ready_to_finish":
      return APP_ROUTES.game;
    case "player_selection":
    default:
      return APP_ROUTES.home;
  }
}

export function canResumeDraft(draft: GameDraft | null) {
  return Boolean(draft && draft.selectedPlayerIds.length >= 2);
}
```

- [ ] **Step 3: Implement the active-game projection helper and store actions.**

```ts
// lib/game-draft/buildActiveGameProjection.ts
import type { ActiveGame } from "@/store/useStore";
import type { GameDraft } from "./types";

export function buildActiveGameProjection(draft: GameDraft): ActiveGame {
  if (draft.phase !== "in_progress" && draft.phase !== "ready_to_finish") {
    throw new Error("Only in-progress drafts can be projected to activeGame.");
  }

  return {
    id: draft.draftId,
    players: draft.turnOrder
      .map((playerId) => draft.playerSnapshots.find((player) => player.id === playerId))
      .filter(Boolean)
      .map((player, index) => ({ ...player!, startOrder: index })),
    turnIndex: draft.gameplay?.turnIndex ?? 0,
    rounds: (draft.gameplay?.rounds ?? []) as any,
    totals: (draft.gameplay?.totals ?? {}) as any,
    current: (draft.gameplay?.current ?? {
      prestige: 0,
      contracts: 0,
      failures: 0,
      assistRecipients: {},
      assistPrestigeRecipients: {},
      objectiveCount: 0,
    }) as any,
    createdAt: draft.updatedAt,
    groupId: draft.selectedGroupId ?? undefined,
    groupName: draft.selectedGroupName ?? undefined,
    selectedWinnerId: draft.gameplay?.selectedWinnerId ?? undefined,
    showTieBreaker: false,
    roundCount: draft.gameplay?.roundCount ?? 0,
  };
}
```

```ts
// store/useStore.ts
  gameDraft: GameDraft | null;
  gameDraftSyncState: GameDraftSyncState;
  hydrateGameDraft: (input: { draft: GameDraft | null; syncState?: Partial<GameDraftSyncState> }) => void;
  patchGameDraft: (updater: (draft: GameDraft | null) => GameDraft | null) => void;
  setGameDraftSyncState: (patch: Partial<GameDraftSyncState>) => void;
  clearGameDraft: () => void;
```

```ts
  gameDraft: null,
  gameDraftSyncState: { state: "idle", dirty: false, lastSyncedAt: null, conflictMessage: null },

  hydrateGameDraft: ({ draft, syncState }) =>
    set((state) => ({
      gameDraft: draft,
      gameDraftSyncState: { ...state.gameDraftSyncState, ...syncState },
      activeGame:
        draft && (draft.phase === "in_progress" || draft.phase === "ready_to_finish")
          ? buildActiveGameProjection(draft)
          : state.activeGame,
    })),

  patchGameDraft: (updater) =>
    set((state) => {
      const nextDraft = updater(state.gameDraft);
      return {
        gameDraft: nextDraft,
        gameDraftSyncState: {
          ...state.gameDraftSyncState,
          state: "pending",
          dirty: true,
          conflictMessage: null,
        },
      };
    }),

  setGameDraftSyncState: (patch) =>
    set((state) => ({
      gameDraftSyncState: { ...state.gameDraftSyncState, ...patch },
    })),

  clearGameDraft: () =>
    set({
      gameDraft: null,
      gameDraftSyncState: { state: "idle", dirty: false, lastSyncedAt: null, conflictMessage: null },
    }),
```

- [ ] **Step 4: Run the domain test until it passes.**

Run: `node .\scripts\game-draft-domain.test.ts`

Expected: PASS with `game-draft-domain.test.ts passed`.

- [ ] **Step 5: Commit the domain and store slice.**

```bash
git add utils/storage/storageKeys.ts lib/game-draft/types.ts lib/game-draft/phase.ts lib/game-draft/buildActiveGameProjection.ts store/useStore.ts
git commit -m "feat: add synced game draft domain state"
```

## Task 3: Add The One-Draft-Per-Profile Supabase Contract

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260525164000_moonrakers_user_game_drafts.sql`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\game-drafts\normalizeGameDraftRow.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\game-drafts\loadUserGameDraft.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\game-drafts\saveUserGameDraft.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\game-drafts\deleteUserGameDraft.ts`

- [ ] **Step 1: Create the draft table, RLS, and revision bump trigger.**

```sql
create table public.user_game_drafts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  draft_id uuid not null default gen_random_uuid(),
  phase text not null check (phase in ('player_selection', 'setup', 'in_progress', 'ready_to_finish')),
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  device_updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

alter table public.user_game_drafts enable row level security;

create policy "user_game_drafts_select_self"
on public.user_game_drafts
for select
to authenticated
using ((select auth.uid()) = profile_id);

create policy "user_game_drafts_insert_self"
on public.user_game_drafts
for insert
to authenticated
with check ((select auth.uid()) = profile_id);

create policy "user_game_drafts_update_self"
on public.user_game_drafts
for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

create policy "user_game_drafts_delete_self"
on public.user_game_drafts
for delete
to authenticated
using ((select auth.uid()) = profile_id);

create or replace function public.bump_user_game_draft_revision()
returns trigger
language plpgsql
as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_game_drafts_revision_trigger
before update on public.user_game_drafts
for each row execute function public.bump_user_game_draft_revision();
```

- [ ] **Step 2: Implement row normalization and cloud CRUD helpers.**

```ts
// lib/cloud/game-drafts/normalizeGameDraftRow.ts
import type { GameDraft } from "@/lib/game-draft/types";

export function normalizeGameDraftRow(row: any): GameDraft | null {
  const profileId = String(row?.profile_id ?? "").trim();
  const draftId = String(row?.draft_id ?? "").trim();
  if (!profileId || !draftId) return null;

  const payload = row?.payload && typeof row.payload === "object" ? row.payload : {};

  return {
    profileId,
    draftId,
    phase: row.phase,
    revision: Number(row.revision ?? 0),
    updatedAt: Date.parse(String(row.updated_at ?? "")) || Date.now(),
    deviceUpdatedAt: Date.parse(String(row.device_updated_at ?? "")) || Date.now(),
    selectedPlayerIds: Array.isArray(payload.selectedPlayerIds) ? payload.selectedPlayerIds : [],
    selectedGroupId: payload.selectedGroupId ?? null,
    selectedGroupName: payload.selectedGroupName ?? null,
    turnOrder: Array.isArray(payload.turnOrder) ? payload.turnOrder : [],
    playerSnapshots: Array.isArray(payload.playerSnapshots) ? payload.playerSnapshots : [],
    gameplay: payload.gameplay ?? null,
  };
}
```

```ts
// lib/cloud/game-drafts/saveUserGameDraft.ts
import { supabase } from "@/lib/supabase";
import type { GameDraft } from "@/lib/game-draft/types";
import { normalizeGameDraftRow } from "./normalizeGameDraftRow";

export async function saveUserGameDraft(draft: GameDraft) {
  const { data, error } = await supabase
    .from("user_game_drafts")
    .upsert(
      {
        profile_id: draft.profileId,
        draft_id: draft.draftId,
        phase: draft.phase,
        device_updated_at: new Date(draft.deviceUpdatedAt).toISOString(),
        payload: {
          selectedPlayerIds: draft.selectedPlayerIds,
          selectedGroupId: draft.selectedGroupId ?? null,
          selectedGroupName: draft.selectedGroupName ?? null,
          turnOrder: draft.turnOrder,
          playerSnapshots: draft.playerSnapshots,
          gameplay: draft.gameplay ?? null,
        },
      },
      { onConflict: "profile_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return normalizeGameDraftRow(data);
}
```

```ts
// lib/cloud/game-drafts/loadUserGameDraft.ts
import { supabase } from "@/lib/supabase";
import { normalizeGameDraftRow } from "./normalizeGameDraftRow";

export async function loadUserGameDraft(profileId: string) {
  const { data, error } = await supabase
    .from("user_game_drafts")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return normalizeGameDraftRow(data);
}
```

```ts
// lib/cloud/game-drafts/deleteUserGameDraft.ts
import { supabase } from "@/lib/supabase";

export async function deleteUserGameDraft(profileId: string) {
  const { error } = await supabase.from("user_game_drafts").delete().eq("profile_id", profileId);
  if (error) throw error;
}
```

- [ ] **Step 3: Run the cloud-contract guard until it passes.**

Run: `node .\scripts\game-draft-cloud-contract.test.cjs`

Expected: PASS with `game-draft-cloud-contract.test.cjs passed`.

- [ ] **Step 4: Commit the Supabase contract and helpers.**

```bash
git add supabase/migrations/20260525164000_moonrakers_user_game_drafts.sql lib/cloud/game-drafts/normalizeGameDraftRow.ts lib/cloud/game-drafts/loadUserGameDraft.ts lib/cloud/game-drafts/saveUserGameDraft.ts lib/cloud/game-drafts/deleteUserGameDraft.ts
git commit -m "feat: add synced game draft cloud contract"
```

## Task 4: Add The Synced Draft Controller And Bootstrap Restore

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\app-status\types.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-draft\useSyncedGameDraft.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\auth\useSharedCloudBootstrap.ts`

- [ ] **Step 1: Extend the shared app-status scope for draft lifecycle messages.**

```ts
// lib/app-status/types.ts
export type AppStatusScope =
  | "cloud_save"
  | "cloud_refresh"
  | "analytics_refresh"
  | "history_import"
  | "history_delete"
  | "migration_health"
  | "game_draft";
```

- [ ] **Step 2: Implement the synced controller with local-shadow persistence and replace semantics.**

```ts
// lib/game-draft/useSyncedGameDraft.ts
import { useMemo, useRef } from "react";
import { load, save, remove } from "@/utils/storage/storage";
import { publishAppStatus } from "@/lib/app-status/store";
import { loadUserGameDraft } from "@/lib/cloud/game-drafts/loadUserGameDraft";
import { saveUserGameDraft } from "@/lib/cloud/game-drafts/saveUserGameDraft";
import { deleteUserGameDraft } from "@/lib/cloud/game-drafts/deleteUserGameDraft";
import { useStore } from "@/store/useStore";
import { buildActiveGameProjection } from "./buildActiveGameProjection";
import { resolveDraftResumeRoute } from "./phase";
import type { GameDraft } from "./types";

export function useSyncedGameDraft() {
  const gameDraft = useStore((state) => state.gameDraft);
  const syncState = useStore((state) => state.gameDraftSyncState);
  const hydrateGameDraft = useStore((state) => state.hydrateGameDraft);
  const patchGameDraft = useStore((state) => state.patchGameDraft);
  const setGameDraftSyncState = useStore((state) => state.setGameDraftSyncState);
  const clearGameDraft = useStore((state) => state.clearGameDraft);
  const patchActiveGame = useStore((state) => state.patchActiveGame);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function restoreDraftForSession(profileId: string) {
    publishAppStatus({ scope: "game_draft", state: "running", title: "Restoring draft" });
    setGameDraftSyncState({ state: "restoring", dirty: false, conflictMessage: null });

    const localShadow = await load("gameDraft", null);
    const remoteDraft = await loadUserGameDraft(profileId);

    const localDraft = localShadow?.profileId === profileId ? localShadow.draft : null;
    const hasLocalUnsyncedChanges = Boolean(localShadow?.dirty && localDraft);

    const effectiveDraft =
      remoteDraft && (!hasLocalUnsyncedChanges || (remoteDraft.revision ?? 0) >= (localDraft?.revision ?? 0))
        ? remoteDraft
        : localDraft;

    hydrateGameDraft({
      draft: effectiveDraft,
      syncState: {
        state: effectiveDraft ? "saved" : "idle",
        dirty: hasLocalUnsyncedChanges,
        lastSyncedAt: remoteDraft?.updatedAt ?? null,
        conflictMessage:
          remoteDraft && localDraft && hasLocalUnsyncedChanges && remoteDraft.revision > localDraft.revision
            ? "This draft changed on another device while this device still had unsynced edits."
            : null,
      },
    });

    if (effectiveDraft && (effectiveDraft.phase === "in_progress" || effectiveDraft.phase === "ready_to_finish")) {
      useStore.getState().patchActiveGame(buildActiveGameProjection(effectiveDraft));
    }

    publishAppStatus({
      scope: "game_draft",
      state: effectiveDraft ? (hasLocalUnsyncedChanges ? "stale" : "success") : "idle",
      title: effectiveDraft ? "Draft restored" : "No unfinished draft",
      detail: effectiveDraft ? `Resume on ${resolveDraftResumeRoute(effectiveDraft.phase)}.` : null,
    });
  }

  async function persistDraftShadow(profileId: string, draft: GameDraft | null, dirty: boolean) {
    await save("gameDraft", {
      profileId,
      draft: draft as any,
      dirty,
      syncState: dirty ? "pending" : "saved",
      lastSyncedAt: draft?.updatedAt ?? null,
    });
  }

  async function queueRemoteSave(nextDraft: GameDraft) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setGameDraftSyncState({ state: "saving" });
      const savedDraft = await saveUserGameDraft(nextDraft);
      hydrateGameDraft({
        draft: savedDraft,
        syncState: { state: "saved", dirty: false, lastSyncedAt: savedDraft?.updatedAt ?? null, conflictMessage: null },
      });
      await persistDraftShadow(nextDraft.profileId, savedDraft, false);
      publishAppStatus({ scope: "game_draft", state: "success", title: "Draft saved" });
    }, 250);
  }

  return { gameDraft, syncState, restoreDraftForSession, persistDraftShadow, queueRemoteSave, patchGameDraft, patchActiveGame, clearGameDraft, hydrateGameDraft, setGameDraftSyncState, deleteUserGameDraft };
}
```

- [ ] **Step 3: Restore the draft during auth bootstrap and clear the local shadow on logout.**

```ts
// lib/auth/useSharedCloudBootstrap.ts
import { remove } from "@/utils/storage/storage";
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";

export function useSharedCloudBootstrap() {
  const { restoreDraftForSession, clearGameDraft } = useSyncedGameDraft();
```

Insert this immediately after `hydrateCloudSnapshot(hydratedSnapshot);` in the successful signed-in bootstrap branch:

```ts
await restoreDraftForSession(session.user.id);
```

Insert these lines at the top of the `finally` block inside `handleOverlayEscape()`:

```ts
clearGameDraft();
await remove("gameDraft");
```

Keep the existing auth cleanup lines that already follow in that `finally` block.

- [ ] **Step 4: Run the bootstrap recovery guard until it passes.**

Run: `node .\scripts\game-draft-bootstrap-recovery.test.cjs`

Expected: PASS with `game-draft-bootstrap-recovery.test.cjs passed`.

- [ ] **Step 5: Commit the controller and bootstrap wiring.**

```bash
git add lib/app-status/types.ts lib/game-draft/useSyncedGameDraft.ts lib/auth/useSharedCloudBootstrap.ts
git commit -m "feat: add synced game draft restore controller"
```

## Task 5: Rewire Home And Game Setup To The Draft Lifecycle

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game-setup.tsx`

- [ ] **Step 1: Seed and restore home selections from the shared draft instead of route-param packing.**

```ts
// app/index.tsx
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";
import { canResumeDraft, resolveDraftResumeRoute } from "@/lib/game-draft/phase";

const {
  gameDraft,
  patchGameDraft,
  queueRemoteSave,
  deleteUserGameDraft,
  clearGameDraft,
  syncState: draftSyncState,
} = useSyncedGameDraft();

useEffect(() => {
  if (gameDraft?.phase !== "player_selection") return;
  setSelectedIds(gameDraft.selectedPlayerIds);
  const restoredGroup = rankedGroups.find((group) => group.id === gameDraft.selectedGroupId) ?? null;
  setSelectedGroup(restoredGroup);
}, [gameDraft, rankedGroups]);
```

```ts
const confirmResumeDraft = () => {
  if (!canResumeDraft(gameDraft)) return;

  Alert.alert("Unfinished Draft", "You already have an unfinished game draft.", [
    { text: "Resume", onPress: () => router.push(resolveDraftResumeRoute(gameDraft!.phase) as any) },
    {
      text: "Discard",
      style: "destructive",
      onPress: async () => {
        await deleteUserGameDraft(gameDraft!.profileId);
        clearGameDraft();
      },
    },
    {
      text: "Start over",
      onPress: async () => {
        await deleteUserGameDraft(gameDraft!.profileId);
        clearGameDraft();
        setSelectedIds([]);
        setSelectedGroup(null);
      },
    },
  ]);
};
```

- [ ] **Step 2: Replace the JSON route-param launch path with draft seeding and push only the destination route.**

```ts
const startGame = async () => {
  if (!canStart || !authSession?.user?.id) return;

  const effectiveGroup = selectedGroup
    ? {
        ...selectedGroup,
        playerIds: ensureRequiredPlayerSelection(selectedIds, signedInPlayerId),
      }
    : null;

  const seedDraft = {
    profileId: authSession.user.id,
    draftId: gameDraft?.draftId ?? `${Date.now()}`,
    phase: "setup" as const,
    revision: gameDraft?.revision ?? 0,
    updatedAt: Date.now(),
    deviceUpdatedAt: Date.now(),
    selectedPlayerIds: effectiveGroup ? effectiveGroup.playerIds : selectedIds,
    selectedGroupId: effectiveGroup?.id ?? null,
    selectedGroupName: effectiveGroup?.name ?? null,
    turnOrder: effectiveGroup ? effectiveGroup.playerIds : selectedIds,
    playerSnapshots: rankedPlayers
      .filter((player) => (effectiveGroup ? effectiveGroup.playerIds : selectedIds).includes(player.id))
      .map((player) => ({
        id: player.id,
        name: player.name ?? "Unknown",
        initials: player.initials,
        color: player.color,
        assignedCardArtIndex: player.assignedCardArtIndex ?? null,
      })),
    gameplay: null,
  };

  patchGameDraft(() => seedDraft);
  await queueRemoteSave(seedDraft);
  router.push(APP_ROUTES.gameSetup as any);
};
```

- [ ] **Step 3: Make `app/game-setup.tsx` read and mutate the draft directly.**

```ts
// app/game-setup.tsx
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";

const { gameDraft, patchGameDraft, queueRemoteSave, hydrateGameDraft } = useSyncedGameDraft();

const selectedPlayers = useMemo(() => {
  const ids = gameDraft?.turnOrder?.length ? gameDraft.turnOrder : gameDraft?.selectedPlayerIds ?? [];
  return ids
    .map((playerId) => players.find((player) => player.id === playerId))
    .filter(Boolean) as PlayerLike[];
}, [gameDraft, players]);

const handleDragEnd = async (nextPlayers: PlayerLike[]) => {
  if (!gameDraft) return;
  const nextTurnOrder = nextPlayers.map((player) => player.id);
  const nextDraft = { ...gameDraft, phase: "setup" as const, turnOrder: nextTurnOrder, updatedAt: Date.now(), deviceUpdatedAt: Date.now() };
  patchGameDraft(() => nextDraft);
  await queueRemoteSave(nextDraft);
};

const handleStartGame = async () => {
  if (!gameDraft) return;
  const nextDraft = {
    ...gameDraft,
    phase: "in_progress" as const,
    gameplay: {
      turnIndex: 0,
      rounds: [],
      totals: {},
      current: {
        prestige: 0,
        contracts: 0,
        failures: 0,
        assistRecipients: {},
        assistPrestigeRecipients: {},
        objectiveCount: 0,
      },
      roundCount: 0,
      selectedWinnerId: null,
    },
    updatedAt: Date.now(),
    deviceUpdatedAt: Date.now(),
  };
  hydrateGameDraft({ draft: nextDraft });
  await queueRemoteSave(nextDraft);
  router.push(APP_ROUTES.game as any);
};
```

- [ ] **Step 4: Run the route-flow guard and verify the home/setup assertions pass.**

Run: `node .\scripts\game-draft-route-flow.test.cjs`

Expected: still FAIL, but only on the `app/game.tsx` and `app/add-players.tsx` assertions.

- [ ] **Step 5: Commit the home and setup migration.**

```bash
git add app/index.tsx app/game-setup.tsx
git commit -m "feat: route launch flow through synced game draft"
```

## Task 6: Rewire Live Gameplay, Finish Semantics, And Roster Awareness

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\game.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\lib\game-session\useGameSessionController.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx`

- [ ] **Step 1: Make the game screen write through the draft controller after every meaningful gameplay mutation.**

```ts
// app/game.tsx
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";
import { buildActiveGameProjection } from "@/lib/game-draft/buildActiveGameProjection";

const { gameDraft, patchGameDraft, queueRemoteSave, hydrateGameDraft } = useSyncedGameDraft();

useEffect(() => {
  if (!activeGame && gameDraft && (gameDraft.phase === "in_progress" || gameDraft.phase === "ready_to_finish")) {
    hydrateGameDraft({ draft: gameDraft });
  }
}, [activeGame, gameDraft, hydrateGameDraft]);

async function updateGameplay(nextPatch: Partial<ActiveGame>) {
  if (!gameDraft) return;

  patchActiveGame(nextPatch);

  const projected = { ...buildActiveGameProjection(gameDraft), ...nextPatch };
  const nextDraft = {
    ...gameDraft,
    phase: "in_progress" as const,
    gameplay: {
      turnIndex: projected.turnIndex,
      rounds: projected.rounds,
      totals: projected.totals,
      current: projected.current,
      roundCount: projected.roundCount,
      selectedWinnerId: projected.selectedWinnerId ?? null,
    },
    updatedAt: Date.now(),
    deviceUpdatedAt: Date.now(),
  };

  patchGameDraft(() => nextDraft);
  await queueRemoteSave(nextDraft);
}
```

- [ ] **Step 2: Clear the draft only after the completed-game save succeeds.**

```ts
// lib/game-session/useGameSessionController.ts
type HookArgs = {
  activeGame: Record<string, unknown> | null;
  players: Array<Record<string, unknown>>;
  rounds: SessionRound[];
  winnerId?: string | null;
  authSession: AuthSessionLike;
  playerDirectory: Array<Record<string, unknown>>;
  groupDirectory: Array<Record<string, unknown>>;
  clearActiveGame: () => void;
  hydrateCloudSnapshot: (input: {
    session: AuthSessionLike;
    snapshot: unknown;
    statsSnapshot?: unknown;
  }) => void;
  router: RouterLike;
  onDraftFinished?: () => Promise<void> | void;
};

await saveCompletedGame({
  hostProfileId: args.authSession.user.id!,
  activeGame: cloudGame,
  winnerId: cloudSave.winnerId,
});

await args.onDraftFinished?.();
args.clearActiveGame();
```

```ts
// app/game.tsx
const { deleteUserGameDraft, clearGameDraft } = useSyncedGameDraft();
```

Add this exact property to the existing `useGameSessionController({ ... })` argument object in `app/game.tsx`:

```ts
onDraftFinished: async () => {
  if (!gameDraft?.profileId) return;
  await deleteUserGameDraft(gameDraft.profileId);
  clearGameDraft();
  await remove("gameDraft");
},
```

- [ ] **Step 3: Make roster management draft-aware without turning it into a new launch step.**

```ts
// app/add-players.tsx
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";
import { resolveDraftResumeRoute } from "@/lib/game-draft/phase";

const { gameDraft } = useSyncedGameDraft();
const draftedPlayerIds = useMemo(() => new Set(gameDraft?.selectedPlayerIds ?? []), [gameDraft]);

{gameDraft ? (
  <HeroCard
    eyebrow="Unfinished Draft"
    title="Resume your in-progress setup"
    subtitle="Roster edits are still available, but the current draft can be resumed at any time."
    actionLabel="Resume draft"
    onAction={() => router.push(resolveDraftResumeRoute(gameDraft.phase) as any)}
  />
) : null}

async function handleDeleteGroup(groupId: string) {
  if (gameDraft?.selectedGroupId === groupId) {
    Alert.alert("Group used in unfinished draft", "Discard or finish the unfinished draft before deleting this group.");
    return;
  }
}

async function handleDeleteProfile(playerId: string) {
  if (draftedPlayerIds.has(playerId)) {
    Alert.alert("Player used in unfinished draft", "Discard or finish the unfinished draft before deleting this player.");
    return;
  }
}
```

Insert the `if (...) { Alert.alert(...); return; }` guards at the top of the existing group-delete and profile-delete handlers so the current delete logic only runs when the active draft does not reference the target.

- [ ] **Step 4: Run the route-flow guard until it passes.**

Run: `node .\scripts\game-draft-route-flow.test.cjs`

Expected: PASS with `game-draft-route-flow.test.cjs passed`.

- [ ] **Step 5: Commit the live-game and roster integration.**

```bash
git add app/game.tsx lib/game-session/useGameSessionController.ts app/add-players.tsx
git commit -m "feat: sync live gameplay through unfinished draft"
```

## Task 7: Final Verification

**Files:**
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-domain.test.ts`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-cloud-contract.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-bootstrap-recovery.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-draft-route-flow.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-flow-shell-upgrades.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\layout-bootstrap-extraction.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\home-command-player-search.test.cjs`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\package-verification-scripts.test.cjs`

- [ ] **Step 1: Run the new draft-focused tests.**

Run:

```bash
node .\scripts\game-draft-domain.test.ts
node .\scripts\game-draft-cloud-contract.test.cjs
node .\scripts\game-draft-bootstrap-recovery.test.cjs
node .\scripts\game-draft-route-flow.test.cjs
```

Expected: all four commands PASS and print their `passed` success line.

- [ ] **Step 2: Run the affected existing guards.**

Run:

```bash
node .\scripts\game-flow-shell-upgrades.test.cjs
node .\scripts\layout-bootstrap-extraction.test.cjs
node .\scripts\home-command-player-search.test.cjs
node .\scripts\package-verification-scripts.test.cjs
```

Expected: PASS with no new route, bootstrap, or package-script regressions.

- [ ] **Step 3: Run the full typecheck and record the exact result.**

Run: `& 'C:\Program Files\nodejs\npm.cmd' run typecheck`

Expected: PASS with the repo's standard TypeScript success output and exit code `0`.

- [ ] **Step 4: Commit the finished implementation branch state.**

```bash
git add app/index.tsx app/game-setup.tsx app/game.tsx app/add-players.tsx lib/auth/useSharedCloudBootstrap.ts lib/app-status/types.ts lib/game-draft lib/cloud/game-drafts store/useStore.ts utils/storage/storageKeys.ts supabase/migrations/20260525164000_moonrakers_user_game_drafts.sql scripts/game-draft-domain.test.ts scripts/game-draft-cloud-contract.test.cjs scripts/game-draft-bootstrap-recovery.test.cjs scripts/game-draft-route-flow.test.cjs
git commit -m "feat: add synced new game draft recovery"
```
