# Moonrakers Hybrid Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Home quick-launch block, smarter saved-group discovery, player-profile launch actions, and state-aware analytics empty states with a real History-backed import landing.

**Architecture:** Add small shared route helpers in `utils/appRoutes.ts`, extract shared group-usage ranking into a focused utility, add one reusable analytics recovery card plus state resolver, and keep the History import flow isolated in a dedicated migration helper so the UI routes stay thin. The work is intentionally route-first so later tasks can reuse the same helpers instead of duplicating navigation and state-branch logic.

**Tech Stack:** Expo Router, React Native, TypeScript route/screens, focused CommonJS regression scripts in `scripts/`, Expo Document Picker / FileSystem for backup import, and existing Supabase migration helpers.

---

## File Structure

- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\appRoutes.ts`
  - Add shared route builders for compare, charts, and History import intent.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
  - Render the Home `Quick Launch` block and switch it to the new route helpers.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\home-quick-launch.test.cjs`
  - Lock the new route helpers and Home quick-launch UI.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\groupUsageRanking.ts`
  - Shared usage / recency / search / hint helpers for saved groups.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx`
  - Add group search, sort chips, and usage hints to `Saved groups`.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\group-discovery.test.cjs`
  - Lock the shared group helper integration and add-players discovery UI.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`
  - Add the `Quick Actions` launchpad plus recent-games scroll target.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-launchpad.test.cjs`
  - Lock `Compare with...`, `Open charts`, and `Recent games`.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\analytics\AnalyticsRecoveryCard.tsx`
  - Reusable CTA card for healthy-empty analytics states.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\analyticsRecoveryState.ts`
  - Shared state resolver for no-players, no-games, and player-empty scenarios.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
  - Render route-level recovery CTAs when the analytics hub is empty but healthy.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
  - Render state-aware recovery CTAs for overview and player-specific empty states.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-recovery-states.test.cjs`
  - Lock the shared recovery-state branches and route usage.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\backup.ts`
  - Export a backup-payload parser so the History import flow can reuse the existing normalization logic.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\migration\importBackupFromPicker.ts`
  - File-picker-backed backup import orchestration for History.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\history.tsx`
  - Add the visible import landing, optional `intent=import` highlight, and post-import refresh.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\history-import-backup-flow.test.cjs`
  - Lock the History import entry point and the picker-backed helper wiring.

### Task 1: Shared Route Builders And Home Quick Launch

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\appRoutes.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\home-quick-launch.test.cjs`

- [ ] **Step 1: Write the failing Home quick-launch regression**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\home-quick-launch.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const routesSource = fs.readFileSync(
  path.join(projectRoot, "utils", "appRoutes.ts"),
  "utf8",
);
const homeSource = fs.readFileSync(
  path.join(projectRoot, "app", "index.tsx"),
  "utf8",
);

assert.match(
  routesSource,
  /export function buildCompareRoute\(/,
  "expected utils/appRoutes.ts to expose a shared compare route builder",
);

assert.match(
  routesSource,
  /export function buildChartsRoute\(/,
  "expected utils/appRoutes.ts to expose a shared charts route builder",
);

assert.match(
  routesSource,
  /export function buildHistoryRoute\(/,
  "expected utils/appRoutes.ts to expose a shared History route builder",
);

assert.match(
  homeSource,
  /<SectionCard[\s\S]*title="Quick Launch"/,
  "expected the Home game tab to render a Quick Launch section",
);

assert.match(
  homeSource,
  /title="Compare"[\s\S]*title="Charts"[\s\S]*title="Profiles"[\s\S]*title="History"/s,
  "expected the Quick Launch block to render Compare, Charts, Profiles, and History buttons",
);

assert.match(
  homeSource,
  /router\.push\(buildCompareRoute\(\)\)/,
  "expected the Compare shortcut to use the shared compare route builder",
);

assert.match(
  homeSource,
  /router\.push\(buildChartsRoute\(\)\)/,
  "expected the Charts shortcut to use the shared charts route builder",
);

assert.match(
  homeSource,
  /router\.push\(APP_ROUTES\.playerDirectory\)/,
  "expected the Profiles shortcut to open the player directory directly",
);

assert.match(
  homeSource,
  /router\.push\(buildHistoryRoute\(\)\)/,
  "expected the History shortcut to use the shared History route builder",
);

console.log("home-quick-launch.test.cjs passed");
```

- [ ] **Step 2: Run the quick-launch regression and confirm it fails**

Run:

```powershell
node .\scripts\home-quick-launch.test.cjs
```

Expected: FAIL because `buildCompareRoute`, `buildChartsRoute`, `buildHistoryRoute`, and the `Quick Launch` section do not exist yet.

- [ ] **Step 3: Add route builders and the Quick Launch section**

Update `C:\Users\izzyh\Desktop\moonrakers-app\utils\appRoutes.ts` with shared helpers:

```ts
export function buildCompareRoute(input?: {
  mode?: "players" | "groups";
  ids?: string[];
}) {
  const ids = (input?.ids ?? []).map((id) => String(id).trim()).filter(Boolean);

  return {
    pathname: APP_ROUTES.compare,
    params: {
      ...(input?.mode ? { mode: input.mode } : {}),
      ...(ids.length ? { ids: ids.join(",") } : {}),
    },
  } as const;
}

export function buildChartsRoute(input?: {
  playerId?: string | null;
  compareId?: string | null;
  ids?: string[];
  setup?: boolean;
}) {
  const ids = (input?.ids ?? []).map((id) => String(id).trim()).filter(Boolean);
  const playerId = String(input?.playerId ?? "").trim();
  const compareId = String(input?.compareId ?? "").trim();

  return {
    pathname: APP_ROUTES.charts,
    params: {
      ...(playerId ? { playerId } : {}),
      ...(compareId ? { compareId } : {}),
      ...(ids.length ? { ids: ids.join(",") } : {}),
      ...(input?.setup ? { setup: "1" } : {}),
    },
  } as const;
}

export function buildHistoryRoute(input?: { intent?: "import" | null }) {
  return {
    pathname: APP_ROUTES.history,
    params: input?.intent ? { intent: input.intent } : undefined,
  } as const;
}
```

Update the route import in `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`:

```tsx
import {
  APP_ROUTES,
  buildCompareRoute,
  buildHistoryRoute,
  buildPlayerProfileRoute,
  normalizeHomeTab,
  buildChartsRoute,
} from "@/utils/appRoutes";
```

Update `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx` so the Home `Game` tab renders the shortcuts between the `Start Game` button and the player picker:

```tsx
      <SectionCard title="Quick Launch">
        <View style={styles.quickLaunchGrid}>
          <ActionButton
            title="Compare"
            variant="secondary"
            style={styles.quickLaunchButton}
            onPress={() => router.push(buildCompareRoute())}
          />
          <ActionButton
            title="Charts"
            variant="secondary"
            style={styles.quickLaunchButton}
            onPress={() => router.push(buildChartsRoute())}
          />
          <ActionButton
            title="Profiles"
            variant="secondary"
            style={styles.quickLaunchButton}
            onPress={() => router.push(APP_ROUTES.playerDirectory)}
          />
          <ActionButton
            title="History"
            variant="secondary"
            style={styles.quickLaunchButton}
            onPress={() => router.push(buildHistoryRoute())}
          />
        </View>
      </SectionCard>
```

Add the matching Home styles:

```ts
  quickLaunchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickLaunchButton: {
    flexBasis: "48%",
    flexGrow: 1,
  },
```

- [ ] **Step 4: Re-run the quick-launch regression**

Run:

```powershell
node .\scripts\home-quick-launch.test.cjs
```

Expected: PASS with `home-quick-launch.test.cjs passed`.

- [ ] **Step 5: Commit the route-helper and Home quick-launch slice**

Run:

```powershell
git add .\utils\appRoutes.ts .\app\index.tsx .\scripts\home-quick-launch.test.cjs
git commit -m "feat: add Moonrakers home quick launch"
```

Expected: commit succeeds with only the route-helper and Home quick-launch changes.

### Task 2: Shared Group Usage Ranking And Saved Group Discovery

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\groupUsageRanking.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\group-discovery.test.cjs`

- [ ] **Step 1: Write the failing group-discovery regression**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\group-discovery.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const helperSource = fs.readFileSync(
  path.join(projectRoot, "utils", "groupUsageRanking.ts"),
  "utf8",
);
const homeSource = fs.readFileSync(
  path.join(projectRoot, "app", "index.tsx"),
  "utf8",
);
const addPlayersSource = fs.readFileSync(
  path.join(projectRoot, "app", "add-players.tsx"),
  "utf8",
);

assert.match(
  helperSource,
  /export function rankGroupsWithUsage\(/,
  "expected a shared group-usage ranking helper",
);

assert.match(
  helperSource,
  /export function filterGroupsByQuery\(/,
  "expected a shared group search helper",
);

assert.match(
  helperSource,
  /export function formatGroupUsageHint\(/,
  "expected a shared group usage-hint formatter",
);

assert.match(
  homeSource,
  /rankGroupsWithUsage\(/,
  "expected the Home screen to use the shared group ranking helper",
);

assert.match(
  addPlayersSource,
  /const \[groupSearchQuery,\s*setGroupSearchQuery\] = useState\(""\);/,
  "expected add-players to track a Search groups query",
);

assert.match(
  addPlayersSource,
  /const \[groupSortMode,\s*setGroupSortMode\] = useState<"most-played" \| "recent" \| "az">\("most-played"\);/,
  "expected add-players to default group sorting to most-played",
);

assert.match(
  addPlayersSource,
  /placeholder="Search groups"/,
  "expected add-players to render a Search groups input",
);

assert.match(
  addPlayersSource,
  /Most Played[\s\S]*Recent[\s\S]*A-Z/s,
  "expected add-players to render Most Played, Recent, and A-Z sort chips",
);

assert.match(
  addPlayersSource,
  /formatGroupUsageHint\(/,
  "expected add-players to render a usage hint for each saved group",
);

console.log("group-discovery.test.cjs passed");
```

- [ ] **Step 2: Run the group-discovery regression and confirm it fails**

Run:

```powershell
node .\scripts\group-discovery.test.cjs
```

Expected: FAIL because the shared helper, group search state, sort chips, and usage hints do not exist yet.

- [ ] **Step 3: Extract shared group ranking and add the new saved-group controls**

Create `C:\Users\izzyh\Desktop\moonrakers-app\utils\groupUsageRanking.ts`:

```ts
export type GroupSortMode = "most-played" | "recent" | "az";

type RankedGroupShape = {
  id: string;
  name: string;
  playerIds: string[];
};

type RankedGameShape = {
  createdAt?: number;
  groupId?: string;
  players?: Array<{ id?: string; playerId?: string }>;
};

export function rankGroupsWithUsage<T extends RankedGroupShape>(
  groups: T[],
  games: RankedGameShape[],
) {
  const groupUseCount: Record<string, number> = {};
  const groupRecentAt: Record<string, number> = {};
  const comboUseCount: Record<string, number> = {};
  const comboRecentAt: Record<string, number> = {};

  for (const game of games) {
    const createdAt = typeof game?.createdAt === "number" ? game.createdAt : 0;
    const playerIds = Array.from(
      new Set(
        (Array.isArray(game?.players) ? game.players : [])
          .map((player) => String(player?.id ?? player?.playerId ?? "").trim())
          .filter(Boolean),
      ),
    );
    const comboKey = [...playerIds].sort().join("|");

    if (game?.groupId) {
      groupUseCount[game.groupId] = (groupUseCount[game.groupId] ?? 0) + 1;
      groupRecentAt[game.groupId] = Math.max(groupRecentAt[game.groupId] ?? 0, createdAt);
    }

    if (comboKey) {
      comboUseCount[comboKey] = (comboUseCount[comboKey] ?? 0) + 1;
      comboRecentAt[comboKey] = Math.max(comboRecentAt[comboKey] ?? 0, createdAt);
    }
  }

  return [...groups]
    .map((group) => {
      const comboKey = [...group.playerIds].sort().join("|");
      return {
        ...group,
        inferredUseCount: Math.max(groupUseCount[group.id] ?? 0, comboUseCount[comboKey] ?? 0),
        inferredRecentAt: Math.max(groupRecentAt[group.id] ?? 0, comboRecentAt[comboKey] ?? 0),
      };
    })
    .sort((left, right) => {
      if ((right.inferredUseCount ?? 0) !== (left.inferredUseCount ?? 0)) {
        return (right.inferredUseCount ?? 0) - (left.inferredUseCount ?? 0);
      }
      if ((right.inferredRecentAt ?? 0) !== (left.inferredRecentAt ?? 0)) {
        return (right.inferredRecentAt ?? 0) - (left.inferredRecentAt ?? 0);
      }
      return left.name.localeCompare(right.name);
    });
}

export function filterGroupsByQuery<T extends RankedGroupShape>(
  groups: Array<T & { inferredUseCount?: number; inferredRecentAt?: number }>,
  playersById: Map<string, { name?: string }>,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return groups;

  return groups.filter((group) => {
    if (group.name.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    return group.playerIds.some((playerId) =>
      String(playersById.get(playerId)?.name ?? "").toLowerCase().includes(normalizedQuery),
    );
  });
}

export function formatGroupUsageHint(input: {
  inferredUseCount?: number;
  inferredRecentAt?: number;
  playerCount: number;
}) {
  const uses = Number.isFinite(input.inferredUseCount) ? Number(input.inferredUseCount) : 0;
  const recentAt = Number.isFinite(input.inferredRecentAt) ? Number(input.inferredRecentAt) : 0;
  const parts: string[] = [];

  if (uses > 0) {
    parts.push(`${uses} mission${uses === 1 ? "" : "s"}`);
  }

  if (recentAt > 0) {
    parts.push(`last used ${new Date(recentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
  }

  if (parts.length) {
    return parts.join(" / ");
  }

  return `${input.playerCount} players`;
}
```

Update `C:\Users\izzyh\Desktop\moonrakers-app\app\index.tsx` to import and reuse the helper:

```tsx
import { rankGroupsWithUsage } from "@/utils/groupUsageRanking";
```

Then change `rankedGroups` so it uses `rankGroupsWithUsage(commandGroups, games)`.

Update `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx`:

```tsx
import {
  filterGroupsByQuery,
  formatGroupUsageHint,
  rankGroupsWithUsage,
} from "@/utils/groupUsageRanking";

  const rawGames = useStore((state: any) => state.games ?? []);
  const games = useMemo(() => (Array.isArray(rawGames) ? rawGames : []), [rawGames]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSortMode, setGroupSortMode] = useState<"most-played" | "recent" | "az">("most-played");

  const playersById = useMemo(
    () => new Map(sortedPlayers.map((player) => [player.id, player])),
    [sortedPlayers],
  );

  const rankedGroups = useMemo(() => rankGroupsWithUsage(groups, games), [groups, games]);

  const visibleGroups = useMemo(() => {
    const filtered = filterGroupsByQuery(rankedGroups, playersById, groupSearchQuery);

    if (groupSortMode === "recent") {
      return [...filtered].sort((left, right) => {
        if ((right.inferredRecentAt ?? 0) !== (left.inferredRecentAt ?? 0)) {
          return (right.inferredRecentAt ?? 0) - (left.inferredRecentAt ?? 0);
        }
        return left.name.localeCompare(right.name);
      });
    }

    if (groupSortMode === "az") {
      return [...filtered].sort((left, right) => left.name.localeCompare(right.name));
    }

    return filtered;
  }, [games, groupSearchQuery, groupSortMode, groups, playersById, rankedGroups]);
```

Render the UI above `Saved groups`:

```tsx
              <TextInput
                value={groupSearchQuery}
                onChangeText={setGroupSearchQuery}
                placeholder="Search groups"
                placeholderTextColor="#6E87AE"
                style={styles.input}
              />

              <View style={styles.groupSortRow}>
                {[
                  { key: "most-played", label: "Most Played" },
                  { key: "recent", label: "Recent" },
                  { key: "az", label: "A-Z" },
                ].map((option) => {
                  const active = groupSortMode === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setGroupSortMode(option.key as "most-played" | "recent" | "az")}
                      style={[styles.sortChip, active && styles.sortChipActive]}
                    >
                      <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
```

Render the hint inside each group card:

```tsx
                          <Text style={styles.groupMeta}>
                            {formatGroupUsageHint({
                              inferredUseCount: group.inferredUseCount,
                              inferredRecentAt: group.inferredRecentAt,
                              playerCount: group.playerIds.length,
                            })}
                          </Text>
```

- [ ] **Step 4: Re-run the group-discovery regression**

Run:

```powershell
node .\scripts\group-discovery.test.cjs
```

Expected: PASS with `group-discovery.test.cjs passed`.

- [ ] **Step 5: Commit the saved-group discovery slice**

Run:

```powershell
git add .\utils\groupUsageRanking.ts .\app\index.tsx .\app\add-players.tsx .\scripts\group-discovery.test.cjs
git commit -m "feat: improve saved group discovery"
```

Expected: commit succeeds with only the shared group helper, Home helper reuse, and add-players group discovery changes.

### Task 3: Player Profile Quick Actions Launchpad

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-launchpad.test.cjs`

- [ ] **Step 1: Write the failing player-profile launchpad regression**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\player-profile-launchpad.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "app", "player-profile", "[playerId].tsx"),
  "utf8",
);

assert.match(
  source,
  /Quick Actions/,
  "expected the player profile route to render a Quick Actions section",
);

assert.match(
  source,
  /Compare with\.\.\./,
  "expected the player profile launchpad to expose Compare with...",
);

assert.match(
  source,
  /Open charts/,
  "expected the player profile launchpad to expose Open charts",
);

assert.match(
  source,
  /Recent games/,
  "expected the player profile launchpad to expose Recent games",
);

assert.match(
  source,
  /router\.push\(buildCompareRoute\(\{[\s\S]*mode:\s*"players"[\s\S]*ids:\s*\[String\(playerId\)\][\s\S]*\}\)\)/s,
  "expected Compare with... to preselect the current player on the compare route",
);

assert.match(
  source,
  /router\.push\(buildChartsRoute\(\{[\s\S]*playerId:\s*String\(playerId\)[\s\S]*setup:\s*true[\s\S]*\}\)\)/s,
  "expected Open charts to hand the current player into the charts route",
);

assert.match(
  source,
  /scrollViewRef\.current\?\.scrollTo\(/,
  "expected Recent games to scroll to the existing recent-games section",
);

console.log("player-profile-launchpad.test.cjs passed");
```

- [ ] **Step 2: Run the player-profile launchpad regression and confirm it fails**

Run:

```powershell
node .\scripts\player-profile-launchpad.test.cjs
```

Expected: FAIL because the `Quick Actions` block, compare/charts route handoffs, and recent-games jump do not exist yet.

- [ ] **Step 3: Add the player-profile launchpad and recent-games scroll target**

Update `C:\Users\izzyh\Desktop\moonrakers-app\app\player-profile\[playerId].tsx`:

```tsx
import { APP_ROUTES, buildChartsRoute, buildCompareRoute, buildPlayerProfileRoute } from "@/utils/appRoutes";
```

Add refs and handlers near the route state:

```tsx
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [recentGamesAnchorY, setRecentGamesAnchorY] = useState(0);

  const openCompareRoute = () => {
    if (!playerId) return;
    router.push(buildCompareRoute({ mode: "players", ids: [String(playerId)] }));
  };

  const openChartsRoute = () => {
    if (!playerId) return;
    router.push(buildChartsRoute({ playerId: String(playerId), setup: true }));
  };

  const jumpToRecentGames = () => {
    scrollViewRef.current?.scrollTo({ y: Math.max(recentGamesAnchorY - 16, 0), animated: true });
  };
```

Attach the ref to the screen scroll view:

```tsx
      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
      >
```

Render the new action block after the top metric cards:

```tsx
        <View style={styles.sectionCompact}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSub}>Jump straight into this player's next move</Text>
          </View>

          <View style={styles.quickActionGrid}>
            <Pressable style={styles.quickActionCard} onPress={openCompareRoute}>
              <Text style={styles.quickActionTitle}>Compare with...</Text>
              <Text style={styles.quickActionMeta}>Lock this player, then choose the rival</Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={openChartsRoute}>
              <Text style={styles.quickActionTitle}>Open charts</Text>
              <Text style={styles.quickActionMeta}>Carry this player into chart setup</Text>
            </Pressable>

            <Pressable style={styles.quickActionCard} onPress={jumpToRecentGames}>
              <Text style={styles.quickActionTitle}>Recent games</Text>
              <Text style={styles.quickActionMeta}>Jump to this player's latest mission history</Text>
            </Pressable>
          </View>
        </View>
```

Capture the existing recent-games section location:

```tsx
        <View
          style={styles.sectionCompact}
          onLayout={(event) => setRecentGamesAnchorY(event.nativeEvent.layout.y)}
        >
```

- [ ] **Step 4: Re-run the player-profile launchpad regression**

Run:

```powershell
node .\scripts\player-profile-launchpad.test.cjs
```

Expected: PASS with `player-profile-launchpad.test.cjs passed`.

- [ ] **Step 5: Commit the player-profile launchpad slice**

Run:

```powershell
git add .\app\player-profile\[playerId].tsx .\scripts\player-profile-launchpad.test.cjs
git commit -m "feat: add player profile quick actions"
```

Expected: commit succeeds with only the player-profile launchpad and recent-games scroll work.

### Task 4: Shared Analytics Recovery States And Route-Level CTA Cards

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\analytics\AnalyticsRecoveryCard.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\utils\analyticsRecoveryState.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-recovery-states.test.cjs`

- [ ] **Step 1: Write the failing analytics recovery regression**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\analytics-recovery-states.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const helperSource = fs.readFileSync(
  path.join(projectRoot, "utils", "analyticsRecoveryState.ts"),
  "utf8",
);
const analyticsSource = fs.readFileSync(
  path.join(projectRoot, "app", "analytics.tsx"),
  "utf8",
);
const statsSource = fs.readFileSync(
  path.join(projectRoot, "app", "stats.tsx"),
  "utf8",
);

assert.match(
  helperSource,
  /type AnalyticsRecoveryKind = "none" \| "no-players" \| "no-games" \| "player-empty"/,
  "expected a shared analytics recovery-state kind union",
);

assert.match(
  helperSource,
  /export function resolveAnalyticsRecoveryState\(/,
  "expected a shared analytics recovery-state resolver",
);

assert.match(
  analyticsSource,
  /AnalyticsRecoveryCard/,
  "expected the analytics hub to render the shared AnalyticsRecoveryCard",
);

assert.match(
  analyticsSource,
  /Open roster[\s\S]*Profiles/s,
  "expected the analytics hub recovery actions to cover the no-players state",
);

assert.match(
  analyticsSource,
  /Start tracked game[\s\S]*Import backup/s,
  "expected the analytics hub recovery actions to cover the no-games state",
);

assert.match(
  statsSource,
  /Choose another player/,
  "expected the stats route to render a narrower player-empty recovery action",
);

assert.match(
  statsSource,
  /Open charts/,
  "expected the stats route to offer Open charts for player-specific empty states",
);

console.log("analytics-recovery-states.test.cjs passed");
```

- [ ] **Step 2: Run the analytics recovery regression and confirm it fails**

Run:

```powershell
node .\scripts\analytics-recovery-states.test.cjs
```

Expected: FAIL because the shared recovery-state helper and CTA card do not exist yet.

- [ ] **Step 3: Add the shared recovery resolver and wire it into analytics and stats**

Create `C:\Users\izzyh\Desktop\moonrakers-app\utils\analyticsRecoveryState.ts`:

```ts
export type AnalyticsRecoveryKind = "none" | "no-players" | "no-games" | "player-empty";

type Input = {
  loading: boolean;
  error: string | null;
  playersCount: number;
  gamesCount: number;
  playerOptionsCount?: number;
  selectedPlayerHasDetail?: boolean;
  hasLeagueData?: boolean;
};

export function resolveAnalyticsRecoveryState(input: Input) {
  if (input.loading || input.error) {
    return { kind: "none" as const };
  }

  if (input.playersCount < 1) {
    return { kind: "no-players" as const };
  }

  if (input.gamesCount < 1) {
    return { kind: "no-games" as const };
  }

  if (
    typeof input.playerOptionsCount === "number" &&
    input.playerOptionsCount > 0 &&
    input.hasLeagueData &&
    input.selectedPlayerHasDetail === false
  ) {
    return { kind: "player-empty" as const };
  }

  return { kind: "none" as const };
}
```

Create `C:\Users\izzyh\Desktop\moonrakers-app\components\analytics\AnalyticsRecoveryCard.tsx`:

```tsx
import React from "react";
import { View, StyleSheet } from "react-native";

import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";

type RecoveryAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
};

export default function AnalyticsRecoveryCard({
  title,
  body,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  body: string;
  primaryAction: RecoveryAction;
  secondaryAction?: RecoveryAction | null;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>
        <ActionButton
          title={primaryAction.label}
          onPress={primaryAction.onPress}
          style={styles.action}
        />
        {secondaryAction ? (
          <ActionButton
            title={secondaryAction.label}
            variant={secondaryAction.variant ?? "secondary"}
            onPress={secondaryAction.onPress}
            style={styles.action}
          />
        ) : null}
      </View>
    </View>
  );
}
```

Update the imports in `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx`:

```tsx
import AnalyticsRecoveryCard from "@/components/analytics/AnalyticsRecoveryCard";
import { buildHistoryRoute, buildHomeRoute, APP_ROUTES } from "@/utils/appRoutes";
import { resolveAnalyticsRecoveryState } from "@/utils/analyticsRecoveryState";
```

Update `C:\Users\izzyh\Desktop\moonrakers-app\app\analytics.tsx` to:

```tsx
  const players = useStore((state: any) => state?.players ?? []);
  const games = useStore((state: any) => state?.games ?? []);

  const recoveryState = useMemo(
    () =>
      resolveAnalyticsRecoveryState({
        loading,
        error,
        playersCount: Array.isArray(players) ? players.length : 0,
        gamesCount: Array.isArray(games) ? games.length : 0,
      }),
    [error, games, loading, players],
  );
```

Render the recovery card below the hero when `kind !== "none"`:

```tsx
      {recoveryState.kind === "no-players" ? (
        <AnalyticsRecoveryCard
          title="No tracked players yet"
          body="Set up your roster first so the analytics surfaces have real commanders to work with."
          primaryAction={{ label: "Open roster", onPress: () => router.push(APP_ROUTES.roster) }}
          secondaryAction={{ label: "Profiles", onPress: () => router.push(APP_ROUTES.playerDirectory), variant: "secondary" }}
        />
      ) : null}

      {recoveryState.kind === "no-games" ? (
        <AnalyticsRecoveryCard
          title="No tracked games yet"
          body="Your roster is ready, but you need mission history before the analytics hub can populate."
          primaryAction={{ label: "Start tracked game", onPress: () => router.push(buildHomeRoute("game")) }}
          secondaryAction={{ label: "Import backup", onPress: () => router.push(buildHistoryRoute({ intent: "import" })), variant: "secondary" }}
        />
      ) : null}
```

Update the imports in `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx`:

```tsx
import AnalyticsRecoveryCard from "@/components/analytics/AnalyticsRecoveryCard";
import { APP_ROUTES, buildChartsRoute, buildHistoryRoute, buildHomeRoute } from "@/utils/appRoutes";
import { resolveAnalyticsRecoveryState } from "@/utils/analyticsRecoveryState";
```

Update `C:\Users\izzyh\Desktop\moonrakers-app\app\stats.tsx` so the overview path uses the same no-players / no-games recovery card, while the player-specific branch uses the `player-empty` state:

```tsx
  const overviewRecoveryState = useMemo(
    () =>
      resolveAnalyticsRecoveryState({
        loading,
        error,
        playersCount: playerOptions.length,
        gamesCount: toNumberValue(hero.games, 0),
      }),
    [error, hero.games, loading, playerOptions.length],
  );

  const playerRecoveryState = useMemo(
    () =>
      resolveAnalyticsRecoveryState({
        loading,
        error,
        playersCount: playerOptions.length,
        gamesCount: toNumberValue(hero.games, 0),
        playerOptionsCount: playerOptions.length,
        selectedPlayerHasDetail: detailStats.length > 0,
        hasLeagueData: heroHighlights.length > 0 || gamesItems.length > 0 || topSignals.length > 0,
      }),
    [detailStats.length, error, gamesItems.length, hero.games, heroHighlights.length, loading, playerOptions.length, topSignals.length],
  );
```

Render the narrower player-empty CTA in the player tab:

```tsx
        <AnalyticsRecoveryCard
          title="No player-specific detail yet"
          body="League data exists, but the current player does not have a full detail payload on this screen yet."
          primaryAction={{
            label: "Choose another player",
            onPress: () => {
              const fallbackPlayer = filteredPlayerOptions[0] ?? playerOptions[0];
              if (fallbackPlayer?.id) {
                setSelectedPlayerId(fallbackPlayer.id);
              }
            },
          }}
          secondaryAction={{
            label: "Open charts",
            onPress: () => router.push(buildChartsRoute()),
            variant: "secondary",
          }}
        />
```

- [ ] **Step 4: Re-run the analytics recovery regression**

Run:

```powershell
node .\scripts\analytics-recovery-states.test.cjs
```

Expected: PASS with `analytics-recovery-states.test.cjs passed`.

- [ ] **Step 5: Commit the analytics recovery slice**

Run:

```powershell
git add .\components\analytics\AnalyticsRecoveryCard.tsx .\utils\analyticsRecoveryState.ts .\app\analytics.tsx .\app\stats.tsx .\scripts\analytics-recovery-states.test.cjs
git commit -m "feat: add state-aware analytics recovery actions"
```

Expected: commit succeeds with only the shared recovery card, helper, and analytics/stats integrations.

### Task 5: History Import Landing And Picker-Backed Backup Import

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\backup.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\lib\migration\importBackupFromPicker.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\history.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\history-import-backup-flow.test.cjs`

- [ ] **Step 1: Write the failing History import regression**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\history-import-backup-flow.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const backupSource = fs.readFileSync(
  path.join(projectRoot, "utils", "backup.ts"),
  "utf8",
);
const helperSource = fs.readFileSync(
  path.join(projectRoot, "lib", "migration", "importBackupFromPicker.ts"),
  "utf8",
);
const historySource = fs.readFileSync(
  path.join(projectRoot, "app", "history.tsx"),
  "utf8",
);

assert.match(
  backupSource,
  /export function parseBackupPayload\(/,
  "expected utils/backup.ts to export a reusable backup parser",
);

assert.match(
  helperSource,
  /from "expo-document-picker"/,
  "expected the import helper to use expo-document-picker",
);

assert.match(
  helperSource,
  /buildLegacyMigrationPayload\(/,
  "expected the import helper to build a legacy migration payload from the selected backup",
);

assert.match(
  helperSource,
  /importLegacyPayload\(/,
  "expected the import helper to hand the payload into importLegacyPayload",
);

assert.match(
  historySource,
  /useLocalSearchParams/,
  "expected History to read the optional import intent from route params",
);

assert.match(
  historySource,
  /Import backup/,
  "expected History to expose a visible Import backup action",
);

assert.match(
  historySource,
  /importBackupFromPicker\(/,
  "expected History to call the shared import helper",
);

assert.match(
  historySource,
  /intent:\s*"import"/,
  "expected History import routing to support an import intent",
);

console.log("history-import-backup-flow.test.cjs passed");
```

- [ ] **Step 2: Run the History import regression and confirm it fails**

Run:

```powershell
node .\scripts\history-import-backup-flow.test.cjs
```

Expected: FAIL because the backup parser export, picker-backed import helper, and visible History import landing do not exist yet.

- [ ] **Step 3: Export the parser, create the import helper, and wire History to it**

Update `C:\Users\izzyh\Desktop\moonrakers-app\utils\backup.ts`:

```ts
export function parseBackupPayload(data: unknown): BackupPayload {
  return sanitizeBackupPayload(data);
}
```

Create `C:\Users\izzyh\Desktop\moonrakers-app\lib\migration\importBackupFromPicker.ts`:

```ts
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { parseBackupPayload } from "../../utils/backup";
import { buildLegacyMigrationPayload } from "./buildLegacyMigrationPayload";
import { importLegacyPayload } from "./importLegacyPayload";

type ResolvedProfile = {
  id: string;
  player_name: string;
};

export async function importBackupFromPicker(input: {
  signedInProfileId: string;
  signedInPlayerName: string;
  resolvedProfilesByName: Record<string, ResolvedProfile>;
}) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/json"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return { imported: false as const, reason: "cancelled" as const };
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error("Selected backup did not include a readable file URI.");
  }

  const raw = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const backup = parseBackupPayload(JSON.parse(raw));
  const payload = buildLegacyMigrationPayload({
    signedInProfileId: input.signedInProfileId,
    signedInPlayerName: input.signedInPlayerName,
    localPlayers: backup.players,
    localGroups: backup.groups,
    localGames: backup.games,
    resolvedProfilesByName: input.resolvedProfilesByName,
  });

  const resultPayload = await importLegacyPayload({
    hostProfileId: input.signedInProfileId,
    payload,
  });

  return {
    imported: true as const,
    importedGroups: resultPayload.importedGroups,
    importedGames: resultPayload.importedGames,
  };
}
```

Update `C:\Users\izzyh\Desktop\moonrakers-app\app\history.tsx`:

```tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { importBackupFromPicker } from "@/lib/migration/importBackupFromPicker";
import ActionButton from "@/components/ui/ActionButton";
```

Add the route intent and import state:

```tsx
  const params = useLocalSearchParams<{ intent?: string | string[] }>();
  const importIntent = String(Array.isArray(params.intent) ? params.intent[0] : params.intent ?? "").trim().toLowerCase() === "import";
  const [importingBackup, setImportingBackup] = useState(false);
```

Extract the existing cloud refresh logic into a local helper so delete and import can both reuse it:

```tsx
  async function refreshCloudHistoryState() {
    if (!authSession?.user?.id) {
      return;
    }

    const [snapshot, registeredProfiles] = await Promise.all([
      loadCloudSnapshot(authSession.user.id),
      loadRegisteredProfiles().catch(() => []),
    ]);
    const statsSnapshot = await loadStatsSnapshot({
      profileId: authSession.user.id,
      groups: snapshot.groups,
      games: snapshot.games,
    });

    hydrateCloudSnapshot({
      session: authSession,
      snapshot: {
        ...snapshot,
        players: mergeRegisteredProfilesIntoPlayers(snapshot.players, registeredProfiles),
      },
      statsSnapshot,
    });
  }
```

Add the import handler:

```tsx
  async function handleImportBackup() {
    const signedInProfileId = String(authSession?.user?.id ?? "").trim();
    const signedInPlayerName =
      String(authProfile?.player_name ?? "").trim() ||
      String(authProfile?.display_name ?? "").trim();

    if (!signedInProfileId || !signedInPlayerName) {
      Alert.alert("Profile required", "Finish login and profile setup before importing a backup.");
      return;
    }

    setImportingBackup(true);

    try {
      const registeredProfiles = await loadRegisteredProfiles().catch(() => []);
      const resolvedProfilesByName = Object.fromEntries(
        registeredProfiles
          .filter((profile: any) => String(profile?.name ?? "").trim())
          .map((profile: any) => [
            String(profile.name).trim().toLowerCase(),
            { id: String(profile.id), player_name: String(profile.name).trim() },
          ]),
      );

      const result = await importBackupFromPicker({
        signedInProfileId,
        signedInPlayerName,
        resolvedProfilesByName,
      });

      if (!result.imported) {
        return;
      }

      await refreshCloudHistoryState();
      Alert.alert(
        "Backup imported",
        `Imported ${result.importedGroups} groups and ${result.importedGames} games.`,
      );
    } catch (error) {
      Alert.alert(
        "Import failed",
        formatSupabaseConfigError(error) || "Something went wrong while importing that backup.",
      );
    } finally {
      setImportingBackup(false);
    }
  }
```

Render the visible History landing near the top of the screen:

```tsx
        <View style={[styles.sectionCompact, importIntent && styles.sectionCompactHighlighted]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Backup Center</Text>
              <Text style={styles.sectionSub}>Import older Moonrakers backups into this cloud profile</Text>
            </View>
          </View>

          <ActionButton
            title={importingBackup ? "Importing..." : "Import backup"}
            onPress={() => {
              void handleImportBackup();
            }}
            disabled={importingBackup}
          />
        </View>
```

- [ ] **Step 4: Re-run the History import regression**

Run:

```powershell
node .\scripts\history-import-backup-flow.test.cjs
```

Expected: PASS with `history-import-backup-flow.test.cjs passed`.

- [ ] **Step 5: Commit the History import slice**

Run:

```powershell
git add .\utils\backup.ts .\lib\migration\importBackupFromPicker.ts .\app\history.tsx .\scripts\history-import-backup-flow.test.cjs
git commit -m "feat: add History backup import landing"
```

Expected: commit succeeds with only the parser export, picker-backed import helper, and History landing changes.

### Task 6: Focused Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the new focused regressions**

Run:

```powershell
node .\scripts\home-quick-launch.test.cjs
node .\scripts\group-discovery.test.cjs
node .\scripts\player-profile-launchpad.test.cjs
node .\scripts\analytics-recovery-states.test.cjs
node .\scripts\history-import-backup-flow.test.cjs
```

Expected: all five scripts print `passed`.

- [ ] **Step 2: Re-run nearby existing regressions on touched surfaces**

Run:

```powershell
node .\scripts\home-screen-jsx-parse.test.cjs
node .\scripts\player-profile-header-controls.test.cjs
node .\scripts\analytics-command-link.test.cjs
node .\scripts\history-underline-tabs.test.cjs
node .\scripts\chart-focus-player-selector.test.cjs
```

Expected: all five scripts pass so the new launchpads and CTA flows did not regress adjacent route behavior.

- [ ] **Step 3: Review the diff for only the intended route and recovery changes**

Run:

```powershell
git diff --stat
git diff -- .\app\index.tsx .\utils\appRoutes.ts .\utils\groupUsageRanking.ts .\app\add-players.tsx .\app\player-profile\[playerId].tsx .\components\analytics\AnalyticsRecoveryCard.tsx .\utils\analyticsRecoveryState.ts .\app\analytics.tsx .\app\stats.tsx .\utils\backup.ts .\lib\migration\importBackupFromPicker.ts .\app\history.tsx .\scripts\home-quick-launch.test.cjs .\scripts\group-discovery.test.cjs .\scripts\player-profile-launchpad.test.cjs .\scripts\analytics-recovery-states.test.cjs .\scripts\history-import-backup-flow.test.cjs
```

Expected: only the planned navigation, group discovery, player launchpad, analytics recovery, and History import files are touched.

## Self-Review

- Spec coverage: the plan covers Home quick launch, shared route helpers, saved-group search/sort/hints, player-profile launch actions, state-aware empty states, and the History import landing with a real picker-backed flow.
- Placeholder scan: there are no `TODO`, `TBD`, or "implement later" steps; each task has exact files, commands, and concrete code snippets.
- Type consistency: the route helpers introduced in Task 1 are the same helpers reused in Tasks 3, 4, and 5; the group-usage helper introduced in Task 2 is the same ranking seam reused by Home and add-players.
