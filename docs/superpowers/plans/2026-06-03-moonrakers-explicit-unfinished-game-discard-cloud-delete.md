# Moonrakers Explicit Unfinished Game Discard Cloud Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every explicit unfinished-game discard deletes the Supabase draft first and only clears local unfinished-game state after that cloud deletion succeeds.

**Architecture:** Add one shared explicit discard controller in `useSyncedGameDraft` that coordinates queued and in-flight draft saves, deletes the `user_game_drafts` row, and returns a structured success/failure result to UI callers. Then route the home-screen `Delete Active Game` action through that controller while keeping auth/bootstrap cleanup on the existing local-only clear path.

**Tech Stack:** Expo Router, React Native, Zustand, Supabase draft persistence, focused Node source-guard tests, TypeScript, `npm.cmd`

---

## File Structure

### New files

- `scripts/unfinished-game-discard-controller.test.cjs`
  - Source guard for the shared explicit discard helper inside `useSyncedGameDraft`.
- `scripts/unfinished-game-discard-route.test.cjs`
  - Source guard for the home-screen delete wiring and failure alert handling.
- `scripts/unfinished-game-discard-regression.test.cjs`
  - Regression guard that keeps sign-out/bootstrap clears local-only and confirms finish cleanup still deletes its draft.

### Modified files

- `lib/game-draft/useSyncedGameDraft.ts`
  - Add explicit unfinished-game discard orchestration, queued/in-flight save coordination, discard loading state, and a structured result for UI callers.
- `app/index.tsx`
  - Route `Delete Active Game` through the shared explicit discard helper and disable the active-game CTA while discard is running.
- `scripts/game-draft-route-flow.test.cjs`
  - Extend the existing home-route source guard so it stays aware of the new explicit discard seam.

## Task 1: Add The Shared Explicit Discard Controller

**Files:**
- Create: `scripts/unfinished-game-discard-controller.test.cjs`
- Create: `scripts/unfinished-game-discard-regression.test.cjs`
- Modify: `lib/game-draft/useSyncedGameDraft.ts`

- [ ] **Step 1: Write the failing controller source guard**

Create `scripts/unfinished-game-discard-controller.test.cjs` with this content:

```js
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const source = read(path.join("lib", "game-draft", "useSyncedGameDraft.ts"));

assert.match(
  source,
  /const saveInFlightRef = useRef<Promise<void> \| null>\(null\);/,
  "expected useSyncedGameDraft to track an in-flight draft save promise",
);

assert.match(
  source,
  /const \[isDiscardingUnfinishedGame, setIsDiscardingUnfinishedGame\] = useState\(false\);/,
  "expected useSyncedGameDraft to track explicit unfinished-game discard state",
);

assert.match(
  source,
  /async function waitForDraftSaveIdle\(\)/,
  "expected useSyncedGameDraft to expose a helper that waits for queued or in-flight draft saves",
);

assert.match(
  source,
  /clearTimeout\(saveTimerRef\.current\);[\s\S]*saveTimerRef\.current = null;/,
  "expected waitForDraftSaveIdle to cancel queued draft saves before discard starts",
);

assert.match(
  source,
  /const inFlightSave = saveInFlightRef\.current;[\s\S]*await inFlightSave;/,
  "expected waitForDraftSaveIdle to wait for an already-running draft save before deleting the cloud row",
);

assert.match(
  source,
  /async function discardUnfinishedGame\(profileIdOverride\?: string \| null\)/,
  "expected useSyncedGameDraft to expose a dedicated explicit discard helper",
);

assert.match(
  source,
  /await waitForDraftSaveIdle\(\);/,
  "expected explicit discard to coordinate with draft-save lifecycle before cloud deletion",
);

assert.match(
  source,
  /await deleteUserGameDraft\(normalizedProfileId\);/,
  "expected explicit discard to delete the Supabase unfinished draft before clearing local state",
);

assert.match(
  source,
  /clearActiveGame\(\);[\s\S]*clearGameDraft\(\);[\s\S]*await remove\("gameDraft"\);/,
  "expected explicit discard to clear activeGame, gameDraft, and the local draft shadow after successful delete",
);

assert.match(
  source,
  /title: "Couldn't discard unfinished game"/,
  "expected explicit discard failure to publish a dedicated discard error status",
);

assert.match(
  source,
  /title: "Unfinished game discarded"/,
  "expected explicit discard success to publish a dedicated success status",
);

assert.match(
  source,
  /return \{ ok: false, message \};/,
  "expected explicit discard to return a structured failure result that UI callers can surface",
);

assert.match(
  source,
  /isDiscardingUnfinishedGame,\s*discardUnfinishedGame,/,
  "expected useSyncedGameDraft to return the explicit discard state and helper",
);

console.log("unfinished-game-discard-controller.test.cjs passed");
```

- [ ] **Step 2: Write the failing regression guard**

Create `scripts/unfinished-game-discard-regression.test.cjs` with this content:

```js
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const bootstrapSource = read(path.join("lib", "auth", "useSharedCloudBootstrap.ts"));
const gameSource = read(path.join("app", "game.tsx"));

assert.doesNotMatch(
  bootstrapSource,
  /discardUnfinishedGame/,
  "expected auth/bootstrap cleanup to stay on local-only clear paths instead of using explicit cloud-gated discard",
);

assert.match(
  bootstrapSource,
  /clearGameDraft\(\);\s*await remove\("gameDraft"\);/,
  "expected auth/bootstrap cleanup to keep clearing the local draft shadow directly",
);

assert.match(
  gameSource,
  /await deleteUserGameDraft\(gameDraft\.profileId\);[\s\S]*clearGameDraft\(\);[\s\S]*await remove\(['"]gameDraft['"]\);/,
  "expected successful finish cleanup to keep deleting the draft after save succeeds",
);

console.log("unfinished-game-discard-regression.test.cjs passed");
```

- [ ] **Step 3: Run the new tests to verify they fail**

Run:

```powershell
node .\scripts\unfinished-game-discard-controller.test.cjs
node .\scripts\unfinished-game-discard-regression.test.cjs
```

Expected:

- the controller test exits non-zero because `saveInFlightRef`, `waitForDraftSaveIdle`, and `discardUnfinishedGame` do not exist yet
- the regression test stays green or fails only if the finish cleanup string shape drifted unexpectedly

- [ ] **Step 4: Implement the minimal discard controller in the synced draft hook**

Update `lib/game-draft/useSyncedGameDraft.ts` so the relevant sections look like this:

```ts
import { useEffect, useRef, useState } from "react";

import { publishAppStatus } from "@/lib/app-status/store";
import { deleteUserGameDraft } from "@/lib/cloud/game-drafts/deleteUserGameDraft";
import { loadUserGameDraft } from "@/lib/cloud/game-drafts/loadUserGameDraft";
import { saveUserGameDraft } from "@/lib/cloud/game-drafts/saveUserGameDraft";
import { resolveCloudGameSaveState } from "@/lib/game-save/resolveCloudGameSave";
import { useStore, type ActiveGame } from "@/store/useStore";
import { load, remove, save } from "@/utils/storage/storage";

import { buildDraftFromLegacyActiveGame } from "./buildDraftFromLegacyActiveGame";
import { resolveDraftResumeRoute } from "./phase";
import type {
  GameDraft,
  GameDraftGameplay,
  GameDraftSyncState,
} from "./types";

type DiscardUnfinishedGameResult =
  | { ok: true }
  | { ok: false; message: string };

export function useSyncedGameDraft() {
  const authSession = useStore((state) => state.authSession);
  const players = useStore((state) => state.players);
  const groups = useStore((state) => state.groups);
  const gameDraft = useStore((state) => state.gameDraft);
  const syncState = useStore((state) => state.gameDraftSyncState);
  const hydrateGameDraft = useStore((state) => state.hydrateGameDraft);
  const setGameDraftSyncState = useStore((state) => state.setGameDraftSyncState);
  const clearGameDraft = useStore((state) => state.clearGameDraft);
  const clearActiveGame = useStore((state) => state.clearActiveGame);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const [isDiscardingUnfinishedGame, setIsDiscardingUnfinishedGame] = useState(false);

  async function waitForDraftSaveIdle() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const inFlightSave = saveInFlightRef.current;
    if (!inFlightSave) {
      return;
    }

    try {
      await inFlightSave;
    } catch {
      // Save failures are already reflected in sync state and should not block explicit discard.
    }
  }

  function queueRemoteSave(nextDraft: GameDraft) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;

      const savePromise = (async () => {
        setGameDraftSyncState({ state: "saving" });

        try {
          const savedDraft = await saveUserGameDraft(nextDraft);

          hydrateGameDraft({
            draft: savedDraft,
            syncState: {
              state: savedDraft ? "saved" : "idle",
              dirty: false,
              lastSyncedAt: savedDraft?.updatedAt ?? null,
              conflictMessage: null,
            },
          });

          await persistDraftShadow({
            profileId: nextDraft.profileId,
            draft: savedDraft,
            dirty: false,
            syncStatus: "saved",
            lastSyncedAt: savedDraft?.updatedAt ?? null,
          });

          publishAppStatus({
            scope: "game_draft",
            state: "success",
            title: "Draft saved",
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : String(error ?? "Unable to save the unfinished draft.");

          setGameDraftSyncState({
            state: "failed",
            dirty: true,
            conflictMessage: message,
          });

          await persistDraftShadow({
            profileId: nextDraft.profileId,
            draft: nextDraft,
            dirty: true,
            syncStatus: "failed",
            lastSyncedAt: nextDraft.updatedAt,
          });

          publishAppStatus({
            scope: "game_draft",
            state: "stale",
            title: "Continuing locally",
            detail:
              "Draft sync could not be saved yet. Local gameplay can continue on this device.",
          });
        }
      })();

      saveInFlightRef.current = savePromise;
      void savePromise.finally(() => {
        if (saveInFlightRef.current === savePromise) {
          saveInFlightRef.current = null;
        }
      });
    }, 250);
  }

  async function discardUnfinishedGame(
    profileIdOverride?: string | null,
  ): Promise<DiscardUnfinishedGameResult> {
    if (isDiscardingUnfinishedGame) {
      return { ok: false, message: "An unfinished-game discard is already running." };
    }

    const normalizedProfileId = String(
      profileIdOverride ?? gameDraft?.profileId ?? authSession?.user?.id ?? "",
    ).trim();

    setIsDiscardingUnfinishedGame(true);
    publishAppStatus({
      scope: "game_draft",
      state: "running",
      title: "Discarding unfinished game",
    });

    try {
      await waitForDraftSaveIdle();

      if (normalizedProfileId) {
        await deleteUserGameDraft(normalizedProfileId);
      }

      clearActiveGame();
      clearGameDraft();
      await remove("gameDraft");

      publishAppStatus({
        scope: "game_draft",
        state: "success",
        title: "Unfinished game discarded",
      });

      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "Unable to discard the unfinished game.");

      publishAppStatus({
        scope: "game_draft",
        state: "failed",
        title: "Couldn't discard unfinished game",
        detail: message,
      });

      return { ok: false, message };
    } finally {
      setIsDiscardingUnfinishedGame(false);
    }
  }

  async function discardDraft(profileIdOverride?: string | null) {
    return discardUnfinishedGame(profileIdOverride);
  }

  return {
    gameDraft,
    syncState,
    restoreDraftForSession,
    replaceDraft,
    queueRemoteSave,
    beginGameplay,
    updateGameplay,
    ensureDraftForLegacyActiveGame,
    discardDraft,
    discardUnfinishedGame,
    isDiscardingUnfinishedGame,
    clearGameDraft,
    hydrateGameDraft,
    setGameDraftSyncState,
    deleteUserGameDraft,
  };
}
```

- [ ] **Step 5: Run the controller and regression guards to verify they pass**

Run:

```powershell
node .\scripts\unfinished-game-discard-controller.test.cjs
node .\scripts\unfinished-game-discard-regression.test.cjs
```

Expected:

- both commands exit `0`
- output contains `unfinished-game-discard-controller.test.cjs passed`
- output contains `unfinished-game-discard-regression.test.cjs passed`

- [ ] **Step 6: Commit the controller slice**

Run:

```powershell
git add .\lib\game-draft\useSyncedGameDraft.ts .\scripts\unfinished-game-discard-controller.test.cjs .\scripts\unfinished-game-discard-regression.test.cjs
git commit -m "feat: add explicit unfinished-game discard controller"
```

Expected:

- git creates one commit containing only the shared explicit discard controller and its guards

## Task 2: Route Home-Screen Delete Through The Shared Discard Helper

**Files:**
- Create: `scripts/unfinished-game-discard-route.test.cjs`
- Modify: `scripts/game-draft-route-flow.test.cjs`
- Modify: `app/index.tsx`

- [ ] **Step 1: Write the failing home-route source guard**

Create `scripts/unfinished-game-discard-route.test.cjs` with this content:

```js
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(projectRoot, "app", "index.tsx"), "utf8");

assert.match(
  home,
  /discardUnfinishedGame/,
  "expected the home screen to use the shared explicit unfinished-game discard helper",
);

assert.match(
  home,
  /isDiscardingUnfinishedGame/,
  "expected the home screen to read the shared discard loading state",
);

assert.match(
  home,
  /if \(isDiscardingUnfinishedGame\) \{\s*return;\s*\}[\s\S]*Alert\.alert\(/,
  "expected the delete confirmation flow to stop re-entering while a discard is already running",
);

assert.match(
  home,
  /const result = await discardUnfinishedGame\(\);[\s\S]*if \(!result\.ok\) \{\s*Alert\.alert\("Couldn't discard unfinished game", result\.message\);\s*\}/,
  "expected the home delete flow to surface explicit discard failures without clearing the game",
);

assert.doesNotMatch(
  home,
  /Delete", style: "destructive", onPress: clearActiveGame/,
  "expected the delete confirmation to stop clearing the active game directly",
);

assert.match(
  home,
  /title="Delete"[\s\S]*disabled=\{isDiscardingUnfinishedGame\}/,
  "expected the active-game delete CTA to disable itself while discard is running",
);

console.log("unfinished-game-discard-route.test.cjs passed");
```

- [ ] **Step 2: Extend the existing home route-flow guard**

Update `scripts/game-draft-route-flow.test.cjs` by adding these assertions after the existing home-screen assertions:

```js
assert.match(home, /discardUnfinishedGame/);
assert.doesNotMatch(home, /Delete", style: "destructive", onPress: clearActiveGame/);
```

- [ ] **Step 3: Run the new route guard to verify it fails**

Run:

```powershell
node .\scripts\unfinished-game-discard-route.test.cjs
node .\scripts\game-draft-route-flow.test.cjs
```

Expected:

- `unfinished-game-discard-route.test.cjs` exits non-zero because the delete path still clears `activeGame` directly
- `game-draft-route-flow.test.cjs` stays green or only fails after the new assertions are added

- [ ] **Step 4: Wire the home delete path through the shared helper**

Update `app/index.tsx` so the relevant sections look like this:

```tsx
import {
  useAuthBootstrapStatus,
  useAuthSession,
  useAuthProfile,
  usePasswordRecoveryPending,
  useClearAuthState,
  useSetPasswordRecoveryPending,
  useGames,
  useGroups,
  usePlayers,
  useActiveGame,
} from "@/store/useStore";

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialTab?: string }>();

  const authBootstrapStatus = useAuthBootstrapStatus();
  const authSession = useAuthSession();
  const authProfile = useAuthProfile();
  const passwordRecoveryPending = usePasswordRecoveryPending();
  const clearAuthState = useClearAuthState();
  const setPasswordRecoveryPending = useSetPasswordRecoveryPending();
  const rawPlayers = usePlayers() ?? [];
  const rawGroups = useGroups() ?? [];
  const rawGames = useGames() ?? [];
  const activeGame = useActiveGame();
  const {
    gameDraft,
    replaceDraft,
    ensureDraftForLegacyActiveGame,
    discardUnfinishedGame,
    isDiscardingUnfinishedGame,
  } = useSyncedGameDraft();

  const confirmDeleteActiveGame = () => {
    if (isDiscardingUnfinishedGame) {
      return;
    }

    Alert.alert(
      "Delete Active Game",
      "This will permanently discard the current game in progress. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const result = await discardUnfinishedGame();
              if (!result.ok) {
                Alert.alert("Couldn't discard unfinished game", result.message);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <PageShell
      preset="command"
      density="compact"
      viewport="fit"
      edges={["top", "left", "right", "bottom"]}
      contentContainerStyle={styles.homeShellContent}
    >
      {/* ... */}
      {activeGame ? (
        <SectionCard eyebrow="Active Game" title="Current Match">
          <View style={styles.commandActionRow}>
            <ActionButton
              title="Continue"
              onPress={() => {
                void continueActiveGame();
              }}
              disabled={isDiscardingUnfinishedGame}
              style={styles.commandHalfButton}
            />
            <ActionButton
              title="Delete"
              variant="danger"
              onPress={confirmDeleteActiveGame}
              disabled={isDiscardingUnfinishedGame}
              style={styles.commandHalfButton}
            />
          </View>
        </SectionCard>
      ) : null}
    </PageShell>
  );
}
```

- [ ] **Step 5: Run the home-route guards to verify they pass**

Run:

```powershell
node .\scripts\unfinished-game-discard-route.test.cjs
node .\scripts\game-draft-route-flow.test.cjs
```

Expected:

- both commands exit `0`
- output contains `unfinished-game-discard-route.test.cjs passed`
- output contains `game-draft-route-flow.test.cjs passed`

- [ ] **Step 6: Commit the route slice**

Run:

```powershell
git add .\app\index.tsx .\scripts\unfinished-game-discard-route.test.cjs .\scripts\game-draft-route-flow.test.cjs
git commit -m "feat: route unfinished-game deletes through cloud cleanup"
```

Expected:

- git creates one commit containing only the home delete wiring and route guards

## Task 3: Run Focused Verification And Review The Final Slice

**Files:**
- Verify: `lib/game-draft/useSyncedGameDraft.ts`
- Verify: `app/index.tsx`
- Verify: `lib/auth/useSharedCloudBootstrap.ts`
- Verify: `app/game.tsx`
- Verify: `scripts/unfinished-game-discard-controller.test.cjs`
- Verify: `scripts/unfinished-game-discard-route.test.cjs`
- Verify: `scripts/unfinished-game-discard-regression.test.cjs`
- Verify: `scripts/game-draft-route-flow.test.cjs`
- Verify: `scripts/legacy-active-game-draft-controller.test.cjs`
- Verify: `scripts/legacy-active-game-resume-route.test.cjs`
- Verify: `scripts/finish-game-submit-guard.test.cjs`
- Verify: `scripts/finish-game-supabase-only-wireup.test.cjs`

- [ ] **Step 1: Run the focused discard and regression tests**

Run:

```powershell
node .\scripts\unfinished-game-discard-controller.test.cjs
node .\scripts\unfinished-game-discard-route.test.cjs
node .\scripts\unfinished-game-discard-regression.test.cjs
node .\scripts\game-draft-route-flow.test.cjs
node .\scripts\legacy-active-game-draft-controller.test.cjs
node .\scripts\legacy-active-game-resume-route.test.cjs
node .\scripts\finish-game-submit-guard.test.cjs
node .\scripts\finish-game-supabase-only-wireup.test.cjs
```

Expected:

- every command exits `0`
- each command prints its `...passed` line

- [ ] **Step 2: Run typecheck to catch hook and route drift**

Run:

```powershell
npm.cmd run typecheck
```

Expected:

- exit code `0`
- no TypeScript errors

- [ ] **Step 3: Review the final feature commit range**

Run:

```powershell
git show --stat --name-only HEAD~2..HEAD
```

Expected:

- the last two commits cover only the explicit discard controller, the home route wiring, and their related tests
- no auth/bootstrap or finish-game behavior outside the intended seams is mixed in unexpectedly

- [ ] **Step 4: Confirm the worktree is ready for execution handoff**

Run:

```powershell
git status --short
```

Expected:

- no new unstaged changes remain from this feature
- unrelated pre-existing untracked docs, if any, remain untouched
