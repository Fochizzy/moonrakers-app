# Moonrakers Convert Local Active Game To Synced Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically convert a legacy local-only `activeGame` into the synced `gameDraft` model the first time the user resumes it, without blocking local play when draft sync or roster identity checks fail.

**Architecture:** Add one pure mapper that turns `ActiveGame` into `GameDraft`, then expose one new `useSyncedGameDraft` action that calls the existing `replaceDraft(...)` path so local shadow persistence and remote save stay centralized. Wire that action into the home-screen continue flow and the game-screen direct-entry safety net, and reuse the existing app-status banner to warn about local-only continuation and cloud-finish blockers.

**Tech Stack:** Expo Router, React Native, Zustand, TypeScript, Supabase draft persistence, focused Node source-guard tests, `npm.cmd` for workspace scripts

---

## File Structure

### New files

- `lib/game-draft/buildDraftFromLegacyActiveGame.ts`
  - Pure `ActiveGame -> GameDraft` mapper used only for first-resume conversion.
- `scripts/legacy-active-game-draft-controller.test.cjs`
  - Source guard for the synced-draft controller seam and warning copy.
- `scripts/legacy-active-game-resume-route.test.cjs`
  - Source guard for home continue and direct game-route conversion wiring.

### Modified files

- `lib/game-draft/useSyncedGameDraft.ts`
  - Add `ensureDraftForLegacyActiveGame(...)`, reuse `replaceDraft(...)`, and soften failed draft-save status copy to a warning-toned local-continuation message.
- `app/index.tsx`
  - Convert the active game before routing to `/game`.
- `app/game.tsx`
  - Add the direct-entry safety-net effect so legacy state converts even if the user lands on `/game` without using the home continue button.
- `scripts/game-draft-domain.test.ts`
  - Add direct coverage for the pure mapper.
- `scripts/game-draft-route-flow.test.cjs`
  - Keep existing route-flow guarantees green after the new resume wiring lands.

## Task 1: Add The Pure Legacy Active Game Mapper

**Files:**
- Create: `lib/game-draft/buildDraftFromLegacyActiveGame.ts`
- Modify: `scripts/game-draft-domain.test.ts`

- [ ] **Step 1: Write the failing domain test**

Add this block near the end of `scripts/game-draft-domain.test.ts` after the existing `buildActiveGameProjection(...)` assertions:

```ts
import { buildDraftFromLegacyActiveGame } from "../lib/game-draft/buildDraftFromLegacyActiveGame.ts";

const legacyActiveGame = {
  id: "legacy-active-1",
  players: [
    {
      id: "captain-2",
      name: "Pike",
      initials: "PI",
      color: "#F472B6",
      assignedCardArtIndex: 1,
      startOrder: 0,
    },
    {
      id: "captain-1",
      name: "Nova",
      initials: "NO",
      color: "#60A5FA",
      assignedCardArtIndex: 0,
      startOrder: 1,
    },
  ],
  turnIndex: 1,
  rounds: [
    {
      id: "round-1",
      playerId: "captain-2",
      prestige: 3,
      contracts: 1,
      failures: 0,
      assistRecipients: {},
      assistPrestigeRecipients: {},
      objectiveCount: 1,
      objectivePrestige: 1,
      createdAt: 1716651000000,
    },
  ],
  totals: {
    "captain-2": {
      totalPrestige: 4,
      directPrestige: 3,
      objectivePrestige: 1,
      score: 4,
      assists: 0,
      failures: 0,
      contracts: 1,
    },
  },
  current: {
    prestige: 2,
    contracts: 1,
    failures: 0,
    assistRecipients: {},
    assistPrestigeRecipients: {},
    objectiveCount: 0,
    headToHeadFirstPlaceId: null,
    headToHeadSecondPlaceId: null,
  },
  createdAt: 1716650000000,
  groupId: "group-1",
  groupName: "Night Shift",
  selectedWinnerId: "captain-2",
  roundCount: 1,
};

const convertedDraft = buildDraftFromLegacyActiveGame({
  profileId: "captain-1",
  activeGame: legacyActiveGame,
  now: 1716652000000,
});

assert.equal(convertedDraft.profileId, "captain-1");
assert.equal(convertedDraft.draftId, "legacy-active-1");
assert.equal(convertedDraft.phase, "in_progress");
assert.deepEqual(convertedDraft.selectedPlayerIds, ["captain-2", "captain-1"]);
assert.deepEqual(convertedDraft.turnOrder, ["captain-2", "captain-1"]);
assert.equal(convertedDraft.selectedGroupId, "group-1");
assert.equal(convertedDraft.selectedGroupName, "Night Shift");
assert.equal(convertedDraft.gameplay?.turnIndex, 1);
assert.equal(convertedDraft.gameplay?.roundCount, 1);
assert.equal(convertedDraft.gameplay?.selectedWinnerId, "captain-2");
assert.notEqual(convertedDraft.gameplay?.rounds, legacyActiveGame.rounds);
assert.notEqual(convertedDraft.gameplay?.totals, legacyActiveGame.totals);
```

- [ ] **Step 2: Run the domain test and verify it fails**

Run:

```powershell
node --experimental-strip-types .\scripts\game-draft-domain.test.ts
```

Expected:

- process exits non-zero
- error mentions `buildDraftFromLegacyActiveGame` missing or not exported

- [ ] **Step 3: Write the minimal mapper implementation**

Create `lib/game-draft/buildDraftFromLegacyActiveGame.ts` with this implementation:

```ts
import type { ActiveGame } from "../../store/useStore.ts";

import type { GameDraft } from "./types.ts";

type Input = {
  profileId: string;
  activeGame: ActiveGame;
  now?: number;
};

function cloneRounds(rounds: ActiveGame["rounds"]) {
  return (Array.isArray(rounds) ? rounds : []).map((round) => ({
    ...round,
    assistRecipients: { ...(round.assistRecipients ?? {}) },
    assistPrestigeRecipients: { ...(round.assistPrestigeRecipients ?? {}) },
  }));
}

function cloneTotals(totals: ActiveGame["totals"]) {
  return Object.fromEntries(
    Object.entries(totals ?? {}).map(([playerId, value]) => [
      playerId,
      {
        ...(value ?? {}),
        assistPrestigeBySource: { ...(value?.assistPrestigeBySource ?? {}) },
        assistCountBySource: { ...(value?.assistCountBySource ?? {}) },
      },
    ]),
  );
}

export function buildDraftFromLegacyActiveGame({
  profileId,
  activeGame,
  now = Date.now(),
}: Input): GameDraft {
  const orderedPlayers = Array.isArray(activeGame.players) ? activeGame.players : [];
  const orderedIds = orderedPlayers.map((player) => player.id).filter(Boolean);

  return {
    profileId,
    draftId: String(activeGame.id),
    phase: "in_progress",
    revision: 0,
    updatedAt: now,
    deviceUpdatedAt: now,
    selectedPlayerIds: orderedIds,
    selectedGroupId: activeGame.groupId ?? null,
    selectedGroupName: activeGame.groupName ?? null,
    turnOrder: orderedIds,
    playerSnapshots: orderedPlayers.map((player) => ({
      id: player.id,
      name: player.name ?? "Unknown",
      initials: player.initials,
      color: player.color,
      assignedCardArtIndex: player.assignedCardArtIndex ?? null,
    })),
    gameplay: {
      turnIndex: activeGame.turnIndex ?? 0,
      rounds: cloneRounds(activeGame.rounds),
      totals: cloneTotals(activeGame.totals) as GameDraft["gameplay"]["totals"],
      current: {
        prestige: activeGame.current?.prestige ?? 0,
        contracts: activeGame.current?.contracts ?? 0,
        failures: activeGame.current?.failures ?? 0,
        assistRecipients: { ...(activeGame.current?.assistRecipients ?? {}) },
        assistPrestigeRecipients: {
          ...(activeGame.current?.assistPrestigeRecipients ?? {}),
        },
        objectiveCount: activeGame.current?.objectiveCount ?? 0,
        headToHeadFirstPlaceId: activeGame.current?.headToHeadFirstPlaceId ?? null,
        headToHeadSecondPlaceId: activeGame.current?.headToHeadSecondPlaceId ?? null,
      },
      roundCount:
        activeGame.roundCount ?? (Array.isArray(activeGame.rounds) ? activeGame.rounds.length : 0),
      selectedWinnerId: activeGame.selectedWinnerId ?? null,
    },
  };
}
```

- [ ] **Step 4: Run the domain test and verify it passes**

Run:

```powershell
node --experimental-strip-types .\scripts\game-draft-domain.test.ts
```

Expected:

- exit code `0`
- output contains `game-draft-domain.test.ts passed`

- [ ] **Step 5: Commit the mapper slice**

Run:

```powershell
git add .\lib\game-draft\buildDraftFromLegacyActiveGame.ts .\scripts\game-draft-domain.test.ts
git commit -m "feat: map legacy active games into synced drafts"
```

Expected:

- git creates one commit containing only the new mapper and its domain test

### Task 2: Extend The Synced Draft Controller And Warning Copy

**Files:**
- Modify: `lib/game-draft/useSyncedGameDraft.ts`
- Create: `scripts/legacy-active-game-draft-controller.test.cjs`

- [ ] **Step 1: Write the failing controller source guard**

Create `scripts/legacy-active-game-draft-controller.test.cjs` with this content:

```js
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "lib", "game-draft", "useSyncedGameDraft.ts"),
  "utf8",
);

assert.match(
  source,
  /buildDraftFromLegacyActiveGame/,
  "expected useSyncedGameDraft to import the legacy active-game draft mapper",
);

assert.match(
  source,
  /resolveCloudGameSaveState/,
  "expected useSyncedGameDraft to preview finishability through resolveCloudGameSaveState",
);

assert.match(
  source,
  /async function ensureDraftForLegacyActiveGame\(activeGame:/,
  "expected useSyncedGameDraft to expose an ensureDraftForLegacyActiveGame helper",
);

assert.match(
  source,
  /const convertedDraft = buildDraftFromLegacyActiveGame\(/,
  "expected useSyncedGameDraft to build a canonical draft from the legacy active game",
);

assert.match(
  source,
  /await replaceDraft\(convertedDraft\);/,
  "expected ensureDraftForLegacyActiveGame to reuse replaceDraft for local shadow persistence and remote queueing",
);

assert.match(
  source,
  /title: "Continuing locally"/,
  "expected failed draft sync to publish a local-continuation warning instead of a hard failure title",
);

assert.match(
  source,
  /title: "Cloud finish may be blocked"/,
  "expected legacy conversion to warn when local-only roster identities will block finish-to-Supabase",
);

assert.match(
  source,
  /ensureDraftForLegacyActiveGame,/,
  "expected the synced draft hook to return ensureDraftForLegacyActiveGame",
);

console.log("legacy-active-game-draft-controller.test.cjs passed");
```

- [ ] **Step 2: Run the controller source guard and verify it fails**

Run:

```powershell
node .\scripts\legacy-active-game-draft-controller.test.cjs
```

Expected:

- process exits non-zero
- first failure mentions `ensureDraftForLegacyActiveGame` or `buildDraftFromLegacyActiveGame`

- [ ] **Step 3: Implement the minimal controller changes**

Modify `lib/game-draft/useSyncedGameDraft.ts` so the relevant sections look like this:

```ts
import { buildDraftFromLegacyActiveGame } from "./buildDraftFromLegacyActiveGame";
import { resolveCloudGameSaveState } from "@/lib/game-save/resolveCloudGameSave";
import { useStore, type ActiveGame } from "@/store/useStore";

export function useSyncedGameDraft() {
  const authSession = useStore((state) => state.authSession);
  const players = useStore((state) => state.players);
  const groups = useStore((state) => state.groups);
  const gameDraft = useStore((state) => state.gameDraft);
  const syncState = useStore((state) => state.gameDraftSyncState);
  const hydrateGameDraft = useStore((state) => state.hydrateGameDraft);
  const setGameDraftSyncState = useStore((state) => state.setGameDraftSyncState);
  const clearGameDraft = useStore((state) => state.clearGameDraft);

  // existing refs...

  async function ensureDraftForLegacyActiveGame(activeGame: ActiveGame | null) {
    if (!activeGame || gameDraft) {
      return gameDraft;
    }

    const profileId = String(authSession?.user?.id ?? "").trim();
    if (!profileId) {
      return null;
    }

    const convertedDraft = buildDraftFromLegacyActiveGame({
      profileId,
      activeGame,
    });

    const cloudPreview = resolveCloudGameSaveState({
      activeGame,
      winnerId: activeGame.selectedWinnerId ?? null,
      playerDirectory: players,
      groupDirectory: groups,
    });

    if (cloudPreview.unresolvedPlayerNames.length) {
      publishAppStatus({
        scope: "game_draft",
        state: "success_with_warning",
        title: "Cloud finish may be blocked",
        detail: `${cloudPreview.unresolvedPlayerNames.join(", ")} need Moonrakers accounts before this game can finish to Supabase.`,
      });
    }

    await replaceDraft(convertedDraft);
    return convertedDraft;
  }

  function queueRemoteSave(nextDraft: GameDraft) {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
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
          detail: "Draft sync could not be saved yet. Local gameplay can continue on this device.",
        });
      }
    }, 250);
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
    clearGameDraft,
    hydrateGameDraft,
    setGameDraftSyncState,
    deleteUserGameDraft,
  };
}
```

- [ ] **Step 4: Run the controller source guard and verify it passes**

Run:

```powershell
node .\scripts\legacy-active-game-draft-controller.test.cjs
```

Expected:

- exit code `0`
- output contains `legacy-active-game-draft-controller.test.cjs passed`

- [ ] **Step 5: Commit the controller slice**

Run:

```powershell
git add .\lib\game-draft\useSyncedGameDraft.ts .\scripts\legacy-active-game-draft-controller.test.cjs
git commit -m "feat: convert legacy active games through synced draft controller"
```

Expected:

- git creates one commit containing only the hook changes and controller guard

### Task 3: Wire First-Resume Conversion Into Home And Game Routes

**Files:**
- Modify: `app/index.tsx`
- Modify: `app/game.tsx`
- Create: `scripts/legacy-active-game-resume-route.test.cjs`
- Modify: `scripts/game-draft-route-flow.test.cjs`

- [ ] **Step 1: Write the failing route source guard**

Create `scripts/legacy-active-game-resume-route.test.cjs` with this content:

```js
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const projectRoot = path.resolve(__dirname, "..");
const home = fs.readFileSync(path.join(projectRoot, "app", "index.tsx"), "utf8");
const game = fs.readFileSync(path.join(projectRoot, "app", "game.tsx"), "utf8");

assert.match(
  home,
  /ensureDraftForLegacyActiveGame/,
  "expected the home screen to read ensureDraftForLegacyActiveGame from useSyncedGameDraft",
);

assert.match(
  home,
  /await ensureDraftForLegacyActiveGame\(activeGame\);[\s\S]*router\.push\(APP_ROUTES\.game/,
  "expected the home continue flow to convert the legacy active game before routing to /game",
);

assert.match(
  game,
  /ensureDraftForLegacyActiveGame/,
  "expected the game screen to read ensureDraftForLegacyActiveGame from useSyncedGameDraft",
);

assert.match(
  game,
  /if \(!activeGame \|\| gameDraft \|\| !authSession\?\.user\?\.id\) \{\s*return;\s*\}[\s\S]*void ensureDraftForLegacyActiveGame\(activeGame/,
  "expected the game screen to safety-net convert legacy active state on direct entry",
);

console.log("legacy-active-game-resume-route.test.cjs passed");
```

Also extend `scripts/game-draft-route-flow.test.cjs` with these assertions after the existing home assertions:

```js
assert.match(home, /ensureDraftForLegacyActiveGame/);
assert.match(home, /router\.push\(APP_ROUTES\.game/);
```

- [ ] **Step 2: Run the route source guard and verify it fails**

Run:

```powershell
node .\scripts\legacy-active-game-resume-route.test.cjs
node .\scripts\game-draft-route-flow.test.cjs
```

Expected:

- first command exits non-zero because the new conversion wiring does not exist yet
- second command stays green or fails only after you add the new assertions

- [ ] **Step 3: Implement the minimal route wiring**

Update the relevant sections of `app/index.tsx` like this:

```tsx
const {
  gameDraft,
  replaceDraft,
  ensureDraftForLegacyActiveGame,
} = useSyncedGameDraft();

const continueActiveGame = async () => {
  if (activeGame) {
    await ensureDraftForLegacyActiveGame(activeGame);
  }

  router.push(APP_ROUTES.game as any);
};
```

And change the active-game continue button to:

```tsx
<ActionButton
  title="Continue"
  onPress={() => {
    void continueActiveGame();
  }}
  style={styles.commandHalfButton}
/>
```

Update the relevant `app/game.tsx` sections like this:

```tsx
const {
  gameDraft,
  updateGameplay,
  hydrateGameDraft,
  ensureDraftForLegacyActiveGame,
} = useSyncedGameDraft();

useEffect(() => {
  if (!activeGame || gameDraft || !authSession?.user?.id) {
    return;
  }

  void ensureDraftForLegacyActiveGame(activeGame);
}, [activeGame, authSession?.user?.id, ensureDraftForLegacyActiveGame, gameDraft]);

useEffect(() => {
  if (
    !activeGame &&
    gameDraft &&
    (gameDraft.phase === "in_progress" || gameDraft.phase === "ready_to_finish")
  ) {
    hydrateGameDraft({ draft: gameDraft });
  }
}, [activeGame, gameDraft, hydrateGameDraft]);
```

- [ ] **Step 4: Run the route guards and verify they pass**

Run:

```powershell
node .\scripts\legacy-active-game-resume-route.test.cjs
node .\scripts\game-draft-route-flow.test.cjs
```

Expected:

- both commands exit `0`
- output contains both `legacy-active-game-resume-route.test.cjs passed` and `game-draft-route-flow.test.cjs passed`

- [ ] **Step 5: Commit the route slice**

Run:

```powershell
git add .\app\index.tsx .\app\game.tsx .\scripts\legacy-active-game-resume-route.test.cjs .\scripts\game-draft-route-flow.test.cjs
git commit -m "feat: convert legacy active games on first resume"
```

Expected:

- git creates one commit containing only the route wiring and route guards

### Task 4: Run Focused Verification And Final Integration Checks

**Files:**
- Verify: `lib/game-draft/buildDraftFromLegacyActiveGame.ts`
- Verify: `lib/game-draft/useSyncedGameDraft.ts`
- Verify: `app/index.tsx`
- Verify: `app/game.tsx`
- Verify: `scripts/game-draft-domain.test.ts`
- Verify: `scripts/legacy-active-game-draft-controller.test.cjs`
- Verify: `scripts/legacy-active-game-resume-route.test.cjs`
- Verify: `scripts/game-draft-route-flow.test.cjs`
- Verify: `scripts/shared-app-status-warning.test.cjs`

- [ ] **Step 1: Run the focused test set**

Run:

```powershell
node --experimental-strip-types .\scripts\game-draft-domain.test.ts
node .\scripts\legacy-active-game-draft-controller.test.cjs
node .\scripts\legacy-active-game-resume-route.test.cjs
node .\scripts\game-draft-route-flow.test.cjs
node .\scripts\shared-app-status-warning.test.cjs
```

Expected:

- every command exits `0`
- each command prints its `...passed` line

- [ ] **Step 2: Run typecheck to catch route and hook drift**

Run:

```powershell
npm.cmd run typecheck
```

Expected:

- exit code `0`
- no TypeScript errors

- [ ] **Step 3: Review the final commit range**

Run:

```powershell
git show --stat --name-only HEAD~3..HEAD
```

Expected:

- the last three commits cover only the mapper, hook integration, route wiring, and related tests
- no unrelated files are mixed into the feature slice

- [ ] **Step 4: Confirm the implementation worktree is ready for handoff**

Run:

```powershell
git status --short
```

Expected:

- no new unstaged changes remain from Tasks 1-3
- unrelated pre-existing worktree changes, if any, remain untouched
