# Moonrakers Targeted Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize player search and analytics shell behavior across the main Moonrakers surfaces while centralizing shared cloud rehydration behind one reusable helper.

**Architecture:** Land the shared cloud rehydration helper first, then move mutation/bootstrap callers to that helper before standardizing UI adoption. Reuse the existing `PlayerSearchPicker`, `AnalyticsControlRail`, `AnalyticsRecoveryCard`, and `useAnalyticsRecovery` pieces instead of inventing a new abstraction layer, and limit route changes to the screens that are currently outliers.

**Tech Stack:** Expo Router, React 19, React Native 0.81, TypeScript 5.9, Zustand, Supabase client helpers, Node `assert`-based repo tests in `scripts/*.test.cjs`

---

## File Structure

- Create: `lib/cloud/loadHydratedCloudState.ts`
  Shared neutral helper that loads the signed-in snapshot, merges registered profiles, computes the stats snapshot, and returns the exact payload shape consumed by `hydrateCloudSnapshot(...)`.
- Modify: `lib/auth/bootstrapSharedCloudState.ts`
  Delegate `loadHydratedSharedSnapshot(...)` to the new helper so existing auth bootstrap imports keep working while the neutral helper becomes the canonical implementation.
- Modify: `lib/auth/useSharedCloudBootstrap.ts`
  Keep auth bootstrap ownership of refresh timing and realtime subscriptions, but read hydration payloads from the shared helper.
- Modify: `lib/game-session/useGameSessionController.ts`
  Replace the inline post-save `loadCloudSnapshot` / `loadRegisteredProfiles` / `loadStatsSnapshot` chain with the shared helper.
- Modify: `lib/history/useHistoryDataManager.ts`
  Replace the inline history import/delete refresh chain with the shared helper.
- Modify: `app/game.tsx`
  Remove the remaining route-level inline rehydration block after finish-game save and use the shared helper path.
- Modify: `app/history.tsx`
  Remove the remaining route-level inline rehydration block after delete/import and use the shared helper path.
- Modify: `app/register.tsx`
  Replace the profile-finish rehydration chain with the shared helper.
- Modify: `app/add-players.tsx`
  Replace the roster-sync rehydration chain with the shared helper.
- Modify: `components/players/PlayerSearchPicker.tsx`
  Add the small capabilities needed for standardization: query clear affordance, configurable `autoCapitalize`, and prop pass-through for existing route differences.
- Modify: `components/analytics/AnalyticsControlRail.tsx`
  Pass the expanded search props through to `PlayerSearchPicker` and keep the rail as the shared analytics control wrapper.
- Modify: `app/analytics.tsx`
  Adopt `useAnalyticsRecovery(...)` instead of resolving the hub recovery state manually.
- Modify: `app/elo.tsx`
  Replace the custom player search plus underline selector shell with the shared `AnalyticsControlRail` + `PlayerSearchPicker` pattern while preserving route-specific ELO content.
- Modify: `app/index.tsx`
  Replace the command-screen custom player search input/results block with `PlayerSearchPicker` while preserving selection and long-press profile behavior.
- Modify: `app/player-profile/index.tsx`
  Replace the custom directory search input with `PlayerSearchPicker` while preserving the route’s card-grid results.
- Modify: `app/stats.tsx`
  Keep using shared analytics controls, and pass the new shared picker props (`onClearQuery`, `autoCapitalize`, and standardized search copy`) into the player search surface.
- Modify: `app/player-profile/[playerId].tsx`
  Keep using shared analytics controls, and pass the new shared picker props (`onClearQuery`, `autoCapitalize`, and standardized search copy`) into the profile-search control rail.
- Modify: `scripts/run-focused-suite.cjs`
  Register the new tests in the existing `analytics` and `ui` focused suites.
- Create: `scripts/shared-cloud-rehydration-helper.test.cjs`
  Guard the new helper’s existence, wiring, and shape.
- Create: `scripts/shared-cloud-rehydration-callers.test.cjs`
  Guard the key bootstrap/mutation/history callers so they use the helper instead of duplicating the refresh chain.
- Modify: `scripts/finish-game-supabase-only-wireup.test.cjs`
  Update the expectations so the route proves it hydrates through the shared helper rather than inline snapshot calls.
- Modify: `scripts/history-delete-supabase-only-wireup.test.cjs`
  Update the expectations so history refresh is validated through the shared helper.
- Modify: `scripts/shared-cloud-data-access.test.cjs`
  Update the registration rehydration expectations so they match the shared helper path.
- Create: `scripts/player-search-picker-standardization.test.cjs`
  Guard the shared picker API and standard adoption in the targeted screens.
- Create: `scripts/analytics-hub-shared-recovery.test.cjs`
  Guard that `app/analytics.tsx` uses `useAnalyticsRecovery(...)` rather than a route-local recovery implementation.
- Create: `scripts/elo-analytics-shell-standardization.test.cjs`
  Guard that `app/elo.tsx` adopts `AnalyticsControlRail` + shared picker props instead of the custom search shell.

## Task 1: Add the Shared Cloud Rehydration Helper

**Files:**
- Create: `lib/cloud/loadHydratedCloudState.ts`
- Modify: `lib/auth/bootstrapSharedCloudState.ts`
- Test: `scripts/shared-cloud-rehydration-helper.test.cjs`

- [ ] **Step 1: Write the failing helper test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const helperSource = read(path.join("lib", "cloud", "loadHydratedCloudState.ts"));
const bootstrapSource = read(path.join("lib", "auth", "bootstrapSharedCloudState.ts"));

assert.match(
  helperSource,
  /export async function loadHydratedCloudState\(session:/,
  "expected a shared cloud rehydration helper to be exported from lib/cloud/loadHydratedCloudState.ts",
);

assert.match(
  helperSource,
  /loadCloudSnapshot\(profileId\)/,
  "expected the helper to load the shared cloud snapshot",
);

assert.match(
  helperSource,
  /loadRegisteredProfiles\(\)\.catch\(\(\) => \[\]\)/,
  "expected the helper to merge registered profiles defensively",
);

assert.match(
  helperSource,
  /loadStatsSnapshot\(\{\s*profileId,\s*groups:\s*snapshot\.groups,\s*games:\s*snapshot\.games,\s*\}\)/,
  "expected the helper to rebuild the stats snapshot from the refreshed shared snapshot",
);

assert.match(
  helperSource,
  /players:\s*mergeRegisteredProfilesIntoPlayers\(snapshot\.players,\s*registeredProfiles\)/,
  "expected the helper to merge registered profiles into snapshot.players",
);

assert.match(
  bootstrapSource,
  /return loadHydratedCloudState\(session\);/,
  "expected bootstrapSharedCloudState to delegate shared hydration to the new helper",
);

console.log("shared-cloud-rehydration-helper.test.cjs passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/shared-cloud-rehydration-helper.test.cjs`
Expected: FAIL with `ENOENT` for `lib/cloud/loadHydratedCloudState.ts` or a missing export assertion.

- [ ] **Step 3: Add the helper and delegate the bootstrap wrapper**

```ts
// lib/cloud/loadHydratedCloudState.ts
import { loadCloudSnapshot } from "@/lib/cloud/loadCloudSnapshot";
import { loadRegisteredProfiles } from "@/lib/cloud/loadRegisteredProfiles";
import { loadStatsSnapshot } from "@/lib/cloud/loadStatsSnapshot";
import type { AuthSession } from "@/store/useStore";
import { mergeRegisteredProfilesIntoPlayers } from "@/utils/registeredProfilePlayer";

export async function loadHydratedCloudState(session: AuthSession) {
  const profileId = String(session?.user?.id ?? "").trim();
  if (!profileId) {
    throw new Error("Signed-in session required to hydrate the shared cloud snapshot.");
  }

  const [snapshot, registeredProfiles] = await Promise.all([
    loadCloudSnapshot(profileId),
    loadRegisteredProfiles().catch(() => []),
  ]);

  const statsSnapshot = await loadStatsSnapshot({
    profileId,
    groups: snapshot.groups,
    games: snapshot.games,
  });

  return {
    session,
    snapshot: {
      ...snapshot,
      players: mergeRegisteredProfilesIntoPlayers(snapshot.players, registeredProfiles),
    },
    statsSnapshot,
  };
}
```

```ts
// lib/auth/bootstrapSharedCloudState.ts
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";

export async function loadHydratedSharedSnapshot(session: AuthSession) {
  return loadHydratedCloudState(session);
}
```

- [ ] **Step 4: Run the helper test and typecheck**

Run: `node scripts/shared-cloud-rehydration-helper.test.cjs`
Expected: PASS

Run: `npm.cmd run typecheck`
Expected: PASS with `tsc --noEmit --pretty false --skipLibCheck --incremental false`

- [ ] **Step 5: Commit**

```bash
git add lib/cloud/loadHydratedCloudState.ts lib/auth/bootstrapSharedCloudState.ts scripts/shared-cloud-rehydration-helper.test.cjs
git commit -m "refactor: add shared cloud rehydration helper"
```

## Task 2: Move Bootstrap And Shared Managers To The Helper

**Files:**
- Modify: `lib/auth/useSharedCloudBootstrap.ts`
- Modify: `lib/game-session/useGameSessionController.ts`
- Modify: `lib/history/useHistoryDataManager.ts`
- Create: `scripts/shared-cloud-rehydration-callers.test.cjs`

- [ ] **Step 1: Write the failing caller-adoption test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

for (const [label, relPath] of [
  ["bootstrap", path.join("lib", "auth", "useSharedCloudBootstrap.ts")],
  ["game session", path.join("lib", "game-session", "useGameSessionController.ts")],
  ["history manager", path.join("lib", "history", "useHistoryDataManager.ts")],
]) {
  const source = read(relPath);

  assert.match(
    source,
    /loadHydratedCloudState|loadHydratedSharedSnapshot/,
    `expected ${label} to use the shared cloud rehydration helper`,
  );
}

const gameSessionSource = read(path.join("lib", "game-session", "useGameSessionController.ts"));
assert.doesNotMatch(
  gameSessionSource,
  /loadCloudSnapshot\(args\.authSession\.user\.id!\)/,
  "expected game-session refresh to stop inlining loadCloudSnapshot",
);

const historySource = read(path.join("lib", "history", "useHistoryDataManager.ts"));
assert.doesNotMatch(
  historySource,
  /loadCloudSnapshot\(activeSession\.user\.id\)/,
  "expected history refresh to stop inlining loadCloudSnapshot",
);

console.log("shared-cloud-rehydration-callers.test.cjs passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/shared-cloud-rehydration-callers.test.cjs`
Expected: FAIL because `useGameSessionController.ts` and `useHistoryDataManager.ts` still inline `loadCloudSnapshot(...)`.

- [ ] **Step 3: Replace the inline manager refresh chains**

```ts
// lib/game-session/useGameSessionController.ts
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";

const hydratedSnapshot = await loadHydratedCloudState(args.authSession);
args.hydrateCloudSnapshot(hydratedSnapshot);
```

```ts
// lib/history/useHistoryDataManager.ts
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";

async function refreshCloudHistoryState(activeSession: AuthSessionLike = args.authSession) {
  if (!activeSession?.user?.id) {
    return;
  }

  args.hydrateCloudSnapshot(await loadHydratedCloudState(activeSession as any));
}
```

```ts
// lib/auth/useSharedCloudBootstrap.ts
const hydratedSnapshot = await loadHydratedSharedSnapshot(session);
hydrateCloudSnapshot(hydratedSnapshot);
```

- [ ] **Step 4: Run the caller test and the existing shared-cloud guard**

Run: `node scripts/shared-cloud-rehydration-callers.test.cjs`
Expected: PASS

Run: `node scripts/shared-groups-realtime-sync.test.cjs`
Expected: PASS

Run: `npm.cmd run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth/useSharedCloudBootstrap.ts lib/game-session/useGameSessionController.ts lib/history/useHistoryDataManager.ts scripts/shared-cloud-rehydration-callers.test.cjs
git commit -m "refactor: share cloud rehydration across managers"
```

## Task 3: Remove Remaining Route-Level Inline Rehydration

**Files:**
- Modify: `app/game.tsx`
- Modify: `app/history.tsx`
- Modify: `app/register.tsx`
- Modify: `app/add-players.tsx`
- Modify: `scripts/finish-game-supabase-only-wireup.test.cjs`
- Modify: `scripts/history-delete-supabase-only-wireup.test.cjs`
- Modify: `scripts/shared-cloud-data-access.test.cjs`

- [ ] **Step 1: Update the existing route tests to expect the helper**

```js
// scripts/finish-game-supabase-only-wireup.test.cjs
assert.match(
  gameSource,
  /loadHydratedCloudState|loadHydratedSharedSnapshot/,
  "expected app/game.tsx to refresh the hydrated cloud snapshot through the shared helper after finishing a game",
);

assert.doesNotMatch(
  gameSource,
  /loadCloudSnapshot\(/,
  "expected app/game.tsx to stop reloading the cloud snapshot inline after finishing a game",
);
```

```js
// scripts/history-delete-supabase-only-wireup.test.cjs
assert.match(
  historySource,
  /loadHydratedCloudState|loadHydratedSharedSnapshot/,
  "expected app/history.tsx to rehydrate through the shared helper after deleting or importing history",
);

assert.doesNotMatch(
  historySource,
  /loadCloudSnapshot\(/,
  "expected app/history.tsx to stop reloading the cloud snapshot inline",
);
```

```js
// scripts/shared-cloud-data-access.test.cjs
assert.match(
  registerSource,
  /loadHydratedCloudState|loadHydratedSharedSnapshot/,
  "expected finish-profile registration to use the shared cloud rehydration helper",
);
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `node scripts/finish-game-supabase-only-wireup.test.cjs`
Expected: FAIL because `app/game.tsx` still contains inline snapshot reload calls.

Run: `node scripts/history-delete-supabase-only-wireup.test.cjs`
Expected: FAIL because `app/history.tsx` still contains inline snapshot reload calls.

Run: `node scripts/shared-cloud-data-access.test.cjs`
Expected: FAIL because `app/register.tsx` still contains inline snapshot reload calls.

- [ ] **Step 3: Replace the route-level refresh blocks**

```ts
// app/game.tsx
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";

const hydratedSnapshot = await loadHydratedCloudState(authSession);
hydrateCloudSnapshot(hydratedSnapshot);
```

```ts
// app/history.tsx
const hydratedSnapshot = await loadHydratedCloudState(activeSession as any);
hydrateCloudSnapshot(hydratedSnapshot);
```

```ts
// app/register.tsx and app/add-players.tsx
const hydratedSnapshot = await loadHydratedCloudState(authSession);
hydrateCloudSnapshot(hydratedSnapshot);
```

- [ ] **Step 4: Run the route tests and focused analytics suite**

Run: `node scripts/finish-game-supabase-only-wireup.test.cjs`
Expected: PASS

Run: `node scripts/history-delete-supabase-only-wireup.test.cjs`
Expected: PASS

Run: `node scripts/shared-cloud-data-access.test.cjs`
Expected: PASS

Run: `npm.cmd run test:analytics`
Expected: PASS with `run-focused-suite.cjs passed (analytics)` at the end

- [ ] **Step 5: Commit**

```bash
git add app/game.tsx app/history.tsx app/register.tsx app/add-players.tsx scripts/finish-game-supabase-only-wireup.test.cjs scripts/history-delete-supabase-only-wireup.test.cjs scripts/shared-cloud-data-access.test.cjs
git commit -m "refactor: remove inline route rehydration"
```

## Task 4: Expand The Shared Search Controls

**Files:**
- Modify: `components/players/PlayerSearchPicker.tsx`
- Modify: `components/analytics/AnalyticsControlRail.tsx`
- Create: `scripts/player-search-picker-standardization.test.cjs`

- [ ] **Step 1: Write the failing shared-control test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const pickerSource = read(path.join("components", "players", "PlayerSearchPicker.tsx"));
const railSource = read(path.join("components", "analytics", "AnalyticsControlRail.tsx"));

assert.match(
  pickerSource,
  /autoCapitalize\?: "none" \| "words" \| "sentences" \| "characters"/,
  "expected PlayerSearchPicker to expose a configurable autoCapitalize prop",
);

assert.match(
  pickerSource,
  /onClearQuery\?: \(\) => void;/,
  "expected PlayerSearchPicker to expose an optional clear-query handler",
);

assert.match(
  pickerSource,
  /query\.trim\(\)\.length > 0 && onClearQuery/,
  "expected PlayerSearchPicker to render a shared clear affordance when the query is non-empty",
);

assert.match(
  railSource,
  /autoCapitalize=\{search\.autoCapitalize \?\? "words"\}/,
  "expected AnalyticsControlRail to pass autoCapitalize through to the shared picker",
);

assert.match(
  railSource,
  /onClearQuery=\{search\.onClearQuery\}/,
  "expected AnalyticsControlRail to pass the shared clear-query handler through to PlayerSearchPicker",
);

console.log("player-search-picker-standardization.test.cjs passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/player-search-picker-standardization.test.cjs`
Expected: FAIL because the new picker props do not exist yet.

- [ ] **Step 3: Expand the shared picker and rail**

```ts
// components/players/PlayerSearchPicker.tsx
type PlayerSearchPickerProps = {
  activeLabel?: string;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  clearLabel?: string;
  emptyText?: string;
  helperText?: string | null;
  hideResults?: boolean;
  inactiveLabel?: string;
  items: PlayerSearchPickerItem[];
  nestedScrollEnabled?: boolean;
  onClearQuery?: () => void;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  placeholder: string;
  query: string;
  selectedIds: string[];
  selectionMode?: "single" | "multiple";
  showResultsOnlyWhenQuery?: boolean;
  variant?: "list" | "rail";
};

export default function PlayerSearchPicker({
  activeLabel = "Selected",
  autoCapitalize = "words",
  clearLabel = "Clear",
  emptyText = "No players match that search yet.",
  helperText = null,
  hideResults = false,
  inactiveLabel = "View",
  items,
  nestedScrollEnabled = false,
  onClearQuery,
  onQueryChange,
  onSelect,
  placeholder,
  query,
  selectedIds,
  selectionMode = "single",
  showResultsOnlyWhenQuery = false,
  variant = "list",
}: PlayerSearchPickerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          autoCorrect={false}
          placeholderTextColor={COLORS.textMuted}
          style={styles.searchInput}
        />
        {query.trim().length > 0 && onClearQuery ? (
          <Pressable onPress={onClearQuery} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>{clearLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {!hideResults && (!showResultsOnlyWhenQuery || query.trim().length > 0) ? (
        variant === "rail" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {items.map((item) => (
              <Pressable key={item.id} onPress={() => onSelect(item.id)} style={styles.railItem}>
                <Text style={styles.railLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={styles.list} nestedScrollEnabled={nestedScrollEnabled} showsVerticalScrollIndicator={false}>
            <View style={styles.listContent}>
              {items.length > 0 ? (
                items.map((item) => (
                  <Pressable key={item.id} onPress={() => onSelect(item.id)} style={styles.listItem}>
                    <View style={styles.listCopy}>
                      <Text style={styles.listLabel}>{item.label}</Text>
                      {item.meta ? <Text style={styles.listMeta}>{item.meta}</Text> : null}
                    </View>
                    <Text style={styles.listAction}>
                      {selectedIds.includes(item.id)
                        ? activeLabel
                        : selectionMode === "multiple"
                          ? inactiveLabel.replace("View", "Add")
                          : inactiveLabel}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>{emptyText}</Text>
              )}
            </View>
          </ScrollView>
        )
      ) : null}
    </View>
  );
}
```

```ts
// components/analytics/AnalyticsControlRail.tsx
type AnalyticsControlRailSearch = {
  activeLabel?: string;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  clearLabel?: string;
  emptyText?: string;
  helperText?: string | null;
  hideResults?: boolean;
  inactiveLabel?: string;
  items: PlayerSearchPickerItem[];
  onClearQuery?: () => void;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  placeholder: string;
  query: string;
  selectedIds: string[];
  selectionMode?: "single" | "multiple";
  showResultsOnlyWhenQuery?: boolean;
  variant?: "list" | "rail";
};

<PlayerSearchPicker
  activeLabel={search.activeLabel}
  autoCapitalize={search.autoCapitalize ?? "words"}
  clearLabel={search.clearLabel}
  emptyText={search.emptyText}
  helperText={search.helperText}
  hideResults={search.hideResults}
  inactiveLabel={search.inactiveLabel}
  items={search.items}
  onClearQuery={search.onClearQuery}
  onQueryChange={search.onQueryChange}
  onSelect={search.onSelect}
  placeholder={search.placeholder}
  query={search.query}
  selectedIds={search.selectedIds}
  selectionMode={search.selectionMode}
  showResultsOnlyWhenQuery={search.showResultsOnlyWhenQuery}
  variant={search.variant}
/>
```

- [ ] **Step 4: Run the shared-control tests**

Run: `node scripts/player-search-picker-standardization.test.cjs`
Expected: PASS

Run: `node scripts/analytics-control-rail.test.cjs`
Expected: PASS

Run: `npm.cmd run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/players/PlayerSearchPicker.tsx components/analytics/AnalyticsControlRail.tsx scripts/player-search-picker-standardization.test.cjs
git commit -m "feat: expand shared player search controls"
```

## Task 5: Standardize The Analytics Hub And ELO Shell

**Files:**
- Modify: `app/analytics.tsx`
- Modify: `app/elo.tsx`
- Create: `scripts/analytics-hub-shared-recovery.test.cjs`
- Create: `scripts/elo-analytics-shell-standardization.test.cjs`

- [ ] **Step 1: Write the failing analytics-shell tests**

```js
// scripts/analytics-hub-shared-recovery.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app", "analytics.tsx"), "utf8");

assert.match(
  source,
  /useAnalyticsRecovery\(\{/,
  "expected the analytics hub to use the shared analytics recovery hook",
);

assert.doesNotMatch(
  source,
  /resolveAnalyticsRecoveryState\(\{/,
  "expected the analytics hub to stop resolving recovery state manually",
);

console.log("analytics-hub-shared-recovery.test.cjs passed");
```

```js
// scripts/elo-analytics-shell-standardization.test.cjs
const source = fs.readFileSync(path.join(__dirname, "..", "app", "elo.tsx"), "utf8");

assert.match(
  source,
  /import AnalyticsControlRail from ["']@\/components\/analytics\/AnalyticsControlRail["']/,
  "expected ELO to import the shared AnalyticsControlRail",
);

assert.match(
  source,
  /<AnalyticsControlRail[\s\S]*query:\s*playerSearchQuery,[\s\S]*selectedIds:\s*selectedPlayerId \? \[selectedPlayerId\] : \[\]/,
  "expected ELO to drive player focus selection through the shared control rail search",
);

assert.doesNotMatch(
  source,
  /styles\.underlineSelectorRow:/,
  "expected ELO to drop the route-local underline player selector shell",
);

console.log("elo-analytics-shell-standardization.test.cjs passed");
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node scripts/analytics-hub-shared-recovery.test.cjs`
Expected: FAIL because `app/analytics.tsx` still imports `resolveAnalyticsRecoveryState(...)`.

Run: `node scripts/elo-analytics-shell-standardization.test.cjs`
Expected: FAIL because `app/elo.tsx` still renders its custom search shell.

- [ ] **Step 3: Move analytics hub and ELO onto the shared shell**

```ts
// app/analytics.tsx
import { useAnalyticsRecovery } from "@/utils/useAnalyticsRecovery";

const {
  recoveryState,
  sectionState: analyticsSectionState,
  messageTitle: analyticsSectionTitle,
  messageBody: analyticsSectionBody,
  primaryAction: analyticsPrimaryAction,
  secondaryAction: analyticsSecondaryAction,
} = useAnalyticsRecovery({
  loading,
  error,
  playersCount: players.length,
  gamesCount: games.length,
  context: "hub",
});
```

```ts
// app/elo.tsx
import AnalyticsControlRail from "@/components/analytics/AnalyticsControlRail";

<AnalyticsControlRail
  title="Player Focus"
  subtitle="Select a player to explore ratings"
  search={{
    query: playerSearchQuery,
    onQueryChange: setPlayerSearchQuery,
    onClearQuery: () => setPlayerSearchQuery(""),
    autoCapitalize: "none",
    placeholder: "Search players",
    items: filteredPlayerOptions.map((player) => ({
      id: normalizeId(player.id),
      label: player.name || "Unknown",
      meta: normalizeId(player.id) === normalizeId(selectedPlayerId) ? "Focused" : "View",
    })),
    selectedIds: selectedPlayerId ? [selectedPlayerId] : [],
    onSelect: (id) => setSelectedPlayerId(normalizeId(id)),
    variant: "rail",
  }}
/>
```

- [ ] **Step 4: Run the analytics-shell tests and suites**

Run: `node scripts/analytics-hub-shared-recovery.test.cjs`
Expected: PASS

Run: `node scripts/elo-analytics-shell-standardization.test.cjs`
Expected: PASS

Run: `npm.cmd run test:analytics`
Expected: PASS

Run: `npm.cmd run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/analytics.tsx app/elo.tsx scripts/analytics-hub-shared-recovery.test.cjs scripts/elo-analytics-shell-standardization.test.cjs
git commit -m "refactor: standardize analytics hub and elo shell"
```

## Task 6: Standardize Home And Player Directory Search Surfaces

**Files:**
- Modify: `app/index.tsx`
- Modify: `app/player-profile/index.tsx`
- Modify: `app/stats.tsx`
- Modify: `app/player-profile/[playerId].tsx`
- Create: `scripts/player-search-surface-standardization.test.cjs`

- [ ] **Step 1: Write the failing surface-adoption test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const homeSource = read(path.join("app", "index.tsx"));
const directorySource = read(path.join("app", "player-profile", "index.tsx"));
const statsSource = read(path.join("app", "stats.tsx"));
const profileSource = read(path.join("app", "player-profile", "[playerId].tsx"));

for (const [label, source] of [
  ["home", homeSource],
  ["player directory", directorySource],
  ["stats", statsSource],
  ["player profile", profileSource],
]) {
  assert.match(
    source,
    /import PlayerSearchPicker from ["']@\/components\/players\/PlayerSearchPicker["']/,
    `expected ${label} to import the shared PlayerSearchPicker`,
  );
}

assert.match(
  homeSource,
  /<PlayerSearchPicker[\s\S]*placeholder="Search players"[\s\S]*hideResults/,
  "expected the Home command screen to render the shared player picker while preserving the custom player grid",
);

assert.match(
  directorySource,
  /<PlayerSearchPicker[\s\S]*placeholder="Search players"[\s\S]*hideResults/,
  "expected the player directory to render the shared player picker while preserving the directory card grid",
);

console.log("player-search-surface-standardization.test.cjs passed");
```

- [ ] **Step 2: Run the surface-adoption test to verify it fails**

Run: `node scripts/player-search-surface-standardization.test.cjs`
Expected: FAIL because `app/index.tsx` and `app/player-profile/index.tsx` still render custom search inputs.

- [ ] **Step 3: Adopt the shared picker in the outlier routes**

```tsx
// app/index.tsx
<PlayerSearchPicker
  query={playerSearch}
  onQueryChange={setPlayerSearch}
  onClearQuery={() => setPlayerSearch("")}
  autoCapitalize="none"
  placeholder="Search players"
  helperText="Filter the crew grid below. Tap a card to select and hold a card to open a profile."
  hideResults
  items={filteredPlayers.map((player) => ({
    id: player.id,
    label: player.name ?? "Unknown",
    meta: selectedIds.includes(player.id) ? "Selected" : "Add",
  }))}
  selectedIds={selectedIds}
  selectionMode="multiple"
  onSelect={(id) => toggleSelectedId(id)}
/>
```

```tsx
// app/player-profile/index.tsx
<PlayerSearchPicker
  query={playerSearch}
  onQueryChange={setPlayerSearch}
  onClearQuery={() => setPlayerSearch("")}
  autoCapitalize="none"
  placeholder="Search players"
  helperText="Filter the player cards below."
  hideResults
  items={filteredPlayers.map((player) => ({
    id: player.id,
    label: player.name ?? "Unknown Player",
    meta: "Open Profile",
  }))}
  selectedIds={[]}
  onSelect={(id) => router.push(buildPlayerProfileRoute(id))}
/>
```

```tsx
// app/stats.tsx
<PlayerSearchPicker
  query={playerSearchQuery}
  onQueryChange={setPlayerSearchQuery}
  onClearQuery={() => setPlayerSearchQuery("")}
  autoCapitalize="none"
  placeholder="Search players"
  items={filteredPlayerOptions.map((player) => ({
    id: player.id,
    label: player.label,
    meta: player.displayName || player.playerName || null,
  }))}
  selectedIds={selectedPlayerId ? [selectedPlayerId] : []}
  onSelect={(id) => setSelectedPlayerId(id)}
  variant="list"
/>
```

```tsx
// app/player-profile/[playerId].tsx
<AnalyticsControlRail
  search={{
    query: playerSearchQuery,
    onQueryChange: setPlayerSearchQuery,
    onClearQuery: () => setPlayerSearchQuery(""),
    autoCapitalize: "none",
    placeholder: "Search players",
    items: filteredPlayerOptions.map((player) => ({
      id: String(player.id),
      label: player.name ?? "Player",
      meta: String(player.id) === String(playerId) ? "Viewing" : "Open Profile",
    })),
    selectedIds: playerId ? [String(playerId)] : [],
    onSelect: (id) => handleSelectPlayer(id),
    variant: "list",
  }}
/>
```

- [ ] **Step 4: Run the surface tests and UI suite**

Run: `node scripts/player-search-surface-standardization.test.cjs`
Expected: PASS

Run: `npm.cmd run test:ui`
Expected: PASS with `run-focused-suite.cjs passed (ui)` at the end

Run: `npm.cmd run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx app/player-profile/index.tsx app/stats.tsx app/player-profile/[playerId].tsx scripts/player-search-surface-standardization.test.cjs
git commit -m "refactor: standardize shared player search surfaces"
```

## Task 7: Register The New Tests And Run Final Verification

**Files:**
- Modify: `scripts/run-focused-suite.cjs`
- Test: `scripts/shared-cloud-rehydration-helper.test.cjs`
- Test: `scripts/shared-cloud-rehydration-callers.test.cjs`
- Test: `scripts/player-search-picker-standardization.test.cjs`
- Test: `scripts/analytics-hub-shared-recovery.test.cjs`
- Test: `scripts/elo-analytics-shell-standardization.test.cjs`
- Test: `scripts/player-search-surface-standardization.test.cjs`

- [ ] **Step 1: Add the new tests to the focused suites**

```js
// scripts/run-focused-suite.cjs
const suites = {
  analytics: [
    "scripts/analytics-shared-state-shell.test.cjs",
    "scripts/analytics-hub-shared-recovery.test.cjs",
    "scripts/elo-analytics-shell-standardization.test.cjs",
    "scripts/shared-cloud-rehydration-helper.test.cjs",
    "scripts/shared-cloud-rehydration-callers.test.cjs",
    "scripts/analytics-provenance-fallback.test.cjs",
  ],
  ui: [
    "scripts/analytics-control-rail.test.cjs",
    "scripts/player-search-picker-standardization.test.cjs",
    "scripts/player-search-surface-standardization.test.cjs",
    "scripts/player-directory-visual-system.test.cjs",
  ],
};
```

- [ ] **Step 2: Run the focused suites**

Run: `npm.cmd run test:analytics`
Expected: PASS with `run-focused-suite.cjs passed (analytics)`

Run: `npm.cmd run test:ui`
Expected: PASS with `run-focused-suite.cjs passed (ui)`

- [ ] **Step 3: Run final typecheck**

Run: `npm.cmd run typecheck`
Expected: PASS

- [ ] **Step 4: Run the manual route verification checklist**

Manual checks:

- Home command player selection still supports search plus multi-select.
- Player directory search still opens the selected profile.
- ELO player search and focus selection work through the shared rail.
- Stats and player profile search controls still behave correctly after picker prop normalization.
- Analytics hub still shows the right empty/loading/error states.
- Finish-game save still refreshes the shared cloud snapshot.
- History import or delete still refreshes the shared cloud snapshot.

Expected: all seven route/flow checks succeed without stale local-only state.

- [ ] **Step 5: Commit**

```bash
git add scripts/run-focused-suite.cjs
git commit -m "test: register targeted standardization coverage"
```
