# Moonrakers Shared Supabase Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Supabase the only live source of truth for visible groups, keep shared player/group visibility available to every signed-in player, and allow whole-group deletion only for current group members.

**Architecture:** Keep the existing shared snapshot hydrator and `createSharedGroup` / `deleteSharedGroup` helper, but change the Supabase authorization boundary with a new migration, then remove local-group fallback from bootstrap and `app/add-players.tsx`, and finally retire the legacy local management route so there is no remaining screen that behaves as if groups can live outside Supabase.

**Tech Stack:** Supabase Postgres row-level security migrations, Expo Router, React Native, TypeScript, Zustand, AsyncStorage-backed cache, and source-level Node/CommonJS regression scripts in `scripts/`.

---

## File Structure

- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-member-delete-policy.test.cjs`
  - Source-level guard that the new migration replaces creator-owned delete authority with current-member delete authority.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-cloud-only-bootstrap.test.cjs`
  - Source-level guard that `_layout.tsx` stops hydrating visible local groups during bootstrap.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-member-delete-ui.test.cjs`
  - Source-level guard that `app/add-players.tsx` no longer uses local group mutations and only offers delete to current group members.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\manage-players-groups-no-local-route.test.cjs`
  - Source-level guard that the legacy route no longer exposes local player/group mutation UI.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260523160000_moonrakers_member_delete_cloud_only_groups.sql`
  - Drops the old `groups_manage_own` `FOR ALL` policy and replaces it with separate insert, update, and membership-based delete policies.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\_layout.tsx:160-170`
  - Remove local group loading from the unsigned / incomplete-profile bootstrap helper.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx:177-445`
  - Remove local group create/delete fallbacks and gate shared deletion by current membership.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx:697-735`
  - Render the delete action only for member-owned shared groups and tighten the confirmation copy.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\manage-players-groups.tsx`
  - Replace the legacy local management screen with a redirect to the shared roster screen.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\safe-area-route-regression.test.cjs`
  - Remove the legacy route from the safe-area full-screen list once it becomes a redirect-only route.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\non-game-stability.test.cjs`
  - Update the stability regression so it no longer expects color-map UI from the retired local route.

Do not modify these files in this plan unless a task fails and the failing output proves they are required:

- `C:\Users\izzyh\Desktop\moonrakers-app\lib\cloud\sharedGroups.ts`
- `C:\Users\izzyh\Desktop\moonrakers-app\app\game.tsx`
- `C:\Users\izzyh\Desktop\moonrakers-app\utils\storage\storage.ts`

`app/game.tsx` already creates shared groups through Supabase only, and `lib/cloud/sharedGroups.ts` already deletes the whole group by removing the `groups` row.

### Task 1: Lock The Member-Delete Policy With A Failing Migration Test

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-member-delete-policy.test.cjs`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260523160000_moonrakers_member_delete_cloud_only_groups.sql`

- [ ] **Step 1: Write the failing migration source guard**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-member-delete-policy.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260523160000_moonrakers_member_delete_cloud_only_groups.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the member-delete migration file to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

assert.match(
  source,
  /drop policy if exists "groups_manage_own" on public\.groups;/i,
  "expected the migration to remove the legacy creator-owned FOR ALL policy",
);

assert.match(
  source,
  /create policy "groups_insert_self_created"[\s\S]*for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = created_by\);/i,
  "expected the migration to keep shared-group inserts tied to the signed-in creator",
);

assert.match(
  source,
  /create policy "groups_update_own"[\s\S]*for update[\s\S]*using \(\(select auth\.uid\(\)\) = created_by\)[\s\S]*with check \(\(select auth\.uid\(\)\) = created_by\);/i,
  "expected the migration to keep shared-group updates creator-owned",
);

assert.match(
  source,
  /create policy "groups_delete_group_members"[\s\S]*for delete[\s\S]*from public\.group_members[\s\S]*public\.group_members\.group_id = groups\.id[\s\S]*public\.group_members\.profile_id = \(select auth\.uid\(\)\)/i,
  "expected the migration to authorize shared-group deletes through current membership",
);

console.log("shared-groups-member-delete-policy.test.cjs passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/shared-groups-member-delete-policy.test.cjs`

Expected: FAIL with `expected the member-delete migration file to exist`

- [ ] **Step 3: Write the minimal migration**

Create `C:\Users\izzyh\Desktop\moonrakers-app\supabase\migrations\20260523160000_moonrakers_member_delete_cloud_only_groups.sql`:

```sql
drop policy if exists "groups_manage_own" on public.groups;

create policy "groups_insert_self_created"
on public.groups
for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy "groups_update_own"
on public.groups
for update
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

create policy "groups_delete_group_members"
on public.groups
for delete
to authenticated
using (
  exists (
    select 1
    from public.group_members
    where public.group_members.group_id = groups.id
      and public.group_members.profile_id = (select auth.uid())
  )
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node scripts/shared-groups-member-delete-policy.test.cjs`

Expected: PASS with `shared-groups-member-delete-policy.test.cjs passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/shared-groups-member-delete-policy.test.cjs supabase/migrations/20260523160000_moonrakers_member_delete_cloud_only_groups.sql
git commit -m "feat: allow shared-group deletes by current members"
```

### Task 2: Stop Hydrating Visible Local Groups During Bootstrap

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-cloud-only-bootstrap.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\_layout.tsx:160-170`

- [ ] **Step 1: Write the failing bootstrap regression**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-cloud-only-bootstrap.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const layoutSource = read(path.join("app", "_layout.tsx"));

assert.doesNotMatch(
  layoutSource,
  /loadGroups\(\)/,
  "expected _layout.tsx to stop loading local groups during bootstrap",
);

assert.match(
  layoutSource,
  /const \[players,\s*games\] = await Promise\.all\(\[\s*loadPlayers\(\),\s*loadGames\(\),\s*\]\);/s,
  "expected loadLocalSnapshot to keep only local players and games",
);

assert.match(
  layoutSource,
  /groups:\s*\[\],/,
  "expected loadLocalSnapshot to return an empty local groups array",
);

console.log("shared-groups-cloud-only-bootstrap.test.cjs passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/shared-groups-cloud-only-bootstrap.test.cjs`

Expected: FAIL with `expected _layout.tsx to stop loading local groups during bootstrap`

- [ ] **Step 3: Write the minimal bootstrap change**

Update the storage import and the helper in `C:\Users\izzyh\Desktop\moonrakers-app\app\_layout.tsx`:

```ts
import {
  loadGames,
  loadPlayers,
} from "@/utils/storage/storage";
```

```ts
async function loadLocalSnapshot() {
  const [players, games] = await Promise.all([
    loadPlayers(),
    loadGames(),
  ]);

  return {
    players: Array.isArray(players) ? players : [],
    groups: [],
    games: Array.isArray(games) ? games : [],
  };
}
```

Leave the signed-out and incomplete-profile bootstrap branches alone after this change. They already hydrate `localSnapshot.groups`, and this helper change makes that live value `[]`, which is what clears visible local groups and lets the existing persistence effect overwrite stale cached group data with an empty array.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node scripts/shared-groups-cloud-only-bootstrap.test.cjs`

Expected: PASS with `shared-groups-cloud-only-bootstrap.test.cjs passed`

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx scripts/shared-groups-cloud-only-bootstrap.test.cjs
git commit -m "feat: stop hydrating local groups during bootstrap"
```

### Task 3: Make The Roster Screen Cloud-Only And Gate Deletes By Membership

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-member-delete-ui.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx:177-445`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx:697-735`
- Test: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-cloud-sync.test.cjs`

- [ ] **Step 1: Write the failing roster-screen regression**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\shared-groups-member-delete-ui.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const screenSource = read(path.join("app", "add-players.tsx"));

assert.doesNotMatch(
  screenSource,
  /const addGroup = useStore/,
  "expected app/add-players.tsx to stop using the local addGroup store action",
);

assert.doesNotMatch(
  screenSource,
  /const deleteGroup = useStore/,
  "expected app/add-players.tsx to stop using the local deleteGroup store action",
);

assert.doesNotMatch(
  screenSource,
  /addGroup\?\.\(/,
  "expected app/add-players.tsx to stop creating local fallback groups",
);

assert.doesNotMatch(
  screenSource,
  /deleteGroup\?\.\(/,
  "expected app/add-players.tsx to stop deleting local fallback groups",
);

assert.match(
  screenSource,
  /group\.playerIds\.includes\(signedInUserId\)/,
  "expected shared-group delete access to depend on current membership",
);

assert.match(
  screenSource,
  /Only players in this group can delete it\./,
  "expected a non-member delete message in app/add-players.tsx",
);

assert.match(
  screenSource,
  /Log in before managing shared groups\./,
  "expected the shared-group flow to route signed-out users to login",
);

assert.match(
  screenSource,
  /Finish profile setup before managing shared groups\./,
  "expected the shared-group flow to route incomplete profiles to register",
);

console.log("shared-groups-member-delete-ui.test.cjs passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/shared-groups-member-delete-ui.test.cjs`

Expected: FAIL with `expected app/add-players.tsx to stop using the local addGroup store action`

- [ ] **Step 3: Write the minimal roster-screen implementation**

Remove the local store group actions from `C:\Users\izzyh\Desktop\moonrakers-app\app\add-players.tsx`:

```ts
// Remove both of these lines entirely.
const addGroup = useStore((state: any) => state.addGroup);
const deleteGroup = useStore((state: any) => state.deleteGroup ?? state.removeGroup);
```

Add one shared-access helper next to `refreshCloudGroupState()`:

```ts
function ensureSharedGroupAccess() {
  if (!signedInUserId) {
    Alert.alert("Login required", "Log in before managing shared groups.");
    router.push(APP_ROUTES.login as any);
    return false;
  }

  if (!profileReady) {
    Alert.alert("Finish profile", "Finish profile setup before managing shared groups.");
    router.push(APP_ROUTES.register as any);
    return false;
  }

  return true;
}
```

Replace the local create fallback in `handleCreateGroup()`:

```ts
async function handleCreateGroup() {
  const trimmed = groupName.trim();
  if (!trimmed) {
    Alert.alert("Group name required", "Enter a group name first.");
    return;
  }

  if (selectedGroupPlayerIds.length < 2) {
    Alert.alert("More players needed", "Select at least 2 players for a group.");
    return;
  }

  if (unregisteredSelectedPlayers.length > 0) {
    Alert.alert(
      "Registered players only",
      `${unregisteredSelectedPlayers
        .map((player) => player.name)
        .join(", ")} need an account before they can be added to a shared group.`,
    );
    return;
  }

  if (!ensureSharedGroupAccess()) {
    return;
  }

  setSavingGroup(true);

  try {
    await createSharedGroup({
      createdBy: signedInUserId,
      name: trimmed,
      playerIds: selectedGroupPlayerIds,
    });
    await refreshCloudGroupState();
    setGroupName("");
    setSelectedGroupPlayerIds([]);
  } catch (error) {
    Alert.alert("Couldn't save group", formatSupabaseConfigError(error));
  } finally {
    setSavingGroup(false);
  }
}
```

Replace the local delete fallback in `handleDeleteGroup()`:

```ts
async function handleDeleteGroup(group: GroupLike) {
  if (!group?.id) {
    return;
  }

  if (!ensureSharedGroupAccess()) {
    return;
  }

  if (!isLikelyRegisteredProfileId(group.id) || !group.playerIds.includes(signedInUserId)) {
    Alert.alert("Can't delete group", "Only players in this group can delete it.");
    return;
  }

  setDeletingGroupId(group.id);

  try {
    await deleteSharedGroup(group.id);
    await refreshCloudGroupState();
  } catch (error) {
    Alert.alert("Couldn't delete group", formatSupabaseConfigError(error));
  } finally {
    setDeletingGroupId((current) => (current === group.id ? null : current));
  }
}
```

Gate the visible delete button in the saved-groups render block:

```tsx
{sortedGroups.map((group) => {
  const canDeleteGroup =
    profileReady &&
    Boolean(signedInUserId) &&
    isLikelyRegisteredProfileId(group.id) &&
    group.playerIds.includes(signedInUserId);

  return (
    <View key={group.id} style={styles.groupCard}>
      <View style={styles.groupCardTop}>
        <View style={styles.flexGrow}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupMeta}>{group.playerIds.length} players</Text>
        </View>

        {canDeleteGroup ? (
          <Pressable
            onPress={() => {
              Alert.alert(
                "Delete shared group",
                `Delete ${group.name} for every member?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      void handleDeleteGroup(group);
                    },
                  },
                ],
              );
            }}
            disabled={deletingGroupId === group.id}
            style={styles.deleteSmallBtn}
          >
            {deletingGroupId === group.id ? (
              <ActivityIndicator color="#FDE2E2" />
            ) : (
              <Text style={styles.deleteSmallBtnText}>Delete</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
})}
```

- [ ] **Step 4: Run the targeted regressions to verify they pass**

Run:

```bash
node scripts/shared-groups-member-delete-ui.test.cjs
node scripts/shared-groups-cloud-sync.test.cjs
```

Expected:

- `shared-groups-member-delete-ui.test.cjs passed`
- `shared-groups-cloud-sync.test.cjs passed`

- [ ] **Step 5: Commit**

```bash
git add app/add-players.tsx scripts/shared-groups-member-delete-ui.test.cjs
git commit -m "feat: make shared groups cloud-only on the roster screen"
```

### Task 4: Retire The Legacy Local Group Management Route

**Files:**
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\manage-players-groups-no-local-route.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\manage-players-groups.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\safe-area-route-regression.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\non-game-stability.test.cjs`

- [ ] **Step 1: Write the failing legacy-route regression**

Create `C:\Users\izzyh\Desktop\moonrakers-app\scripts\manage-players-groups-no-local-route.test.cjs`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const routeSource = read(path.join("app", "manage-players-groups.tsx"));

assert.match(
  routeSource,
  /Redirect/,
  "expected manage-players-groups.tsx to become a redirect-only route",
);

assert.match(
  routeSource,
  /APP_ROUTES\.roster/,
  "expected manage-players-groups.tsx to send users to the shared roster screen",
);

assert.doesNotMatch(
  routeSource,
  /addGroup|removeGroup|addPlayer|removePlayer/,
  "expected the legacy route to stop exposing local player or group mutations",
);

console.log("manage-players-groups-no-local-route.test.cjs passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/manage-players-groups-no-local-route.test.cjs`

Expected: FAIL with `expected manage-players-groups.tsx to become a redirect-only route`

- [ ] **Step 3: Replace the route and update the companion regressions**

Replace `C:\Users\izzyh\Desktop\moonrakers-app\app\manage-players-groups.tsx` with:

```tsx
import React from "react";
import { Redirect } from "expo-router";

import { APP_ROUTES } from "@/utils/appRoutes";

export default function ManagePlayersGroupsScreen() {
  return <Redirect href={APP_ROUTES.roster as any} />;
}
```

Update the legacy-route list in `C:\Users\izzyh\Desktop\moonrakers-app\scripts\safe-area-route-regression.test.cjs` by removing `"app/manage-players-groups.tsx"` from `safeAreaRoutes`:

```js
const safeAreaRoutes = [
  "app/add-players.tsx",
  "app/charts/compare/index.tsx",
  "app/elo.tsx",
  "app/history.tsx",
  "app/player-profile/[playerId].tsx",
  "app/PlayerProfileScreen.tsx",
];
```

Update the first check in `C:\Users\izzyh\Desktop\moonrakers-app\scripts\non-game-stability.test.cjs` so it validates the redirect route instead of expecting legacy local-management color keys:

```js
run("Non-game TypeScript surfaces use the current option and color contracts", () => {
  const layoutSource = read("app/_layout.tsx");
  const manageSource = read("app/manage-players-groups.tsx");
  const cardSource = read("components/ColorPlayerCard.tsx");

  assert.equal(
    layoutSource.includes("headerBackTitleVisible"),
    false,
    "Expected app/_layout.tsx to stop using headerBackTitleVisible"
  );

  assert.ok(
    manageSource.includes("Redirect"),
    "Expected app/manage-players-groups.tsx to redirect to the shared roster route"
  );
  assert.ok(
    manageSource.includes("APP_ROUTES.roster"),
    "Expected app/manage-players-groups.tsx to target the shared roster route"
  );

  assert.equal(
    cardSource.includes("raw?.muted"),
    false,
    "Expected ColorPlayerCard to stop reading raw?.muted from getPlayerColors"
  );
  assert.ok(
    cardSource.includes("raw?.subtext"),
    "Expected ColorPlayerCard to use the current subtext color contract"
  );
});
```

- [ ] **Step 4: Run the regressions to verify they pass**

Run:

```bash
node scripts/manage-players-groups-no-local-route.test.cjs
node scripts/safe-area-route-regression.test.cjs
node scripts/non-game-stability.test.cjs
```

Expected:

- `manage-players-groups-no-local-route.test.cjs passed`
- `safe-area-route-regression.test.cjs passed`
- `PASS Non-game TypeScript surfaces use the current option and color contracts`

- [ ] **Step 5: Commit**

```bash
git add app/manage-players-groups.tsx scripts/manage-players-groups-no-local-route.test.cjs scripts/safe-area-route-regression.test.cjs scripts/non-game-stability.test.cjs
git commit -m "refactor: retire the legacy local group management route"
```
