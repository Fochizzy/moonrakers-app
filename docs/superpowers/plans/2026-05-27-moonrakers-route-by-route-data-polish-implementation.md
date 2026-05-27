# Moonrakers Route-by-Route Data Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the analytics family to `Data`, add denser shared launcher cards, turn the Players hub into a signed-in-player preview surface, tighten analytics rails route-by-route, and simplify staged disclosure on Charts and Game Setup without changing routes or source-of-truth behavior.

**Architecture:** Land the shared entry-surface primitives first so the `Data` rename and compact card mode become stable building blocks, then implement the Players hub preview before tightening the analytics-family control shells. Finish by simplifying Charts and Game Setup in place, preserving the current single-screen route model while reducing visual duplication and flattening.

**Tech Stack:** Expo Router, React 19, React Native 0.81, TypeScript 5.9, Zustand store selectors, shared UI components in `components/ui`, Node `assert`-based repo tests in `scripts/*.test.cjs`

---

## File Structure

- Modify: `utils/appHubs.ts`
  Keep route keys stable while changing the visible bridge title to `Data` and preserving the existing analytics/player hub metadata collections.
- Modify: `components/ui/HubTileCard.tsx`
  Add a compact density mode to the existing shared hub card so dense launcher grids can stay in the same visual family without cloning the component.
- Modify: `app/analytics.tsx`
  Rename the landing surface from `Analytics` to `Data` and keep the existing full-width featured-card hierarchy.
- Create: `scripts/data-entry-surfaces.test.cjs`
  Guard the `Data` rename and the new compact hub-card API in one focused UI regression.
- Modify: `app/players.tsx`
  Insert the read-only signed-in-player preview card, keep quick actions, and switch the lower launcher tiles to the compact hub-card density.
- Create: `scripts/players-hub-preview.test.cjs`
  Guard the signed-in-player preview contract and the compact tile usage on the Players hub.
- Modify: `components/analytics/AnalyticsControlRail.tsx`
  Add explicit density support so Stats, Insights, and Player Profile can share the same rail language with route-specific spacing.
- Modify: `app/stats.tsx`
  Keep the route utility-first and adopt the compact rail density.
- Modify: `app/insights.tsx`
  Keep the editorial stacked-lens behavior while using the shared rail density and cleaner lens-shell copy.
- Modify: `app/player-profile/[playerId].tsx`
  Tighten the search and tab rails so the full profile reads as one control family instead of separate stacked control blocks.
- Create: `scripts/analytics-route-shells.test.cjs`
  Guard the shared density contract plus the route-level adoption points in Stats, Insights, and Player Profile.
- Modify: `app/charts/index.tsx`
  Keep the current three-stage guided rail, but replace the duplicate hidden-picker-plus-conditional-picker pattern with one visible search surface per chooser.
- Create: `scripts/chart-guided-stage-disclosure.test.cjs`
  Guard the single visible picker per chooser and the removal of the duplicate `hideResults` setup.
- Modify: `app/game-setup.tsx`
  Rebalance the top of the screen so the launch summary reads first, the turn-order list remains dominant, and the `Change Color` action stays a secondary header affordance.
- Create: `scripts/game-setup-hierarchy.test.cjs`
  Guard the start-summary-first ordering and the continued header placement of `Change Color`.
- Modify: `scripts/run-focused-suite.cjs`
  Register the new targeted tests in the `ui` suite so follow-up work can run one real repo-native command for this polish batch.

## Task 1: Rename The Entry Surfaces To Data And Add Compact Hub Cards

**Files:**
- Modify: `utils/appHubs.ts`
- Modify: `components/ui/HubTileCard.tsx`
- Modify: `app/analytics.tsx`
- Create: `scripts/data-entry-surfaces.test.cjs`

- [ ] **Step 1: Write the failing entry-surface regression**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const appHubsSource = read(path.join("utils", "appHubs.ts"));
const hubTileSource = read(path.join("components", "ui", "HubTileCard.tsx"));
const analyticsSource = read(path.join("app", "analytics.tsx"));

assert.match(
  appHubsSource,
  /key:\s*"analytics"[\s\S]*title:\s*"Data"/,
  "expected the analytics bridge destination to use the visible Data label",
);

assert.match(
  hubTileSource,
  /density\?:\s*"default"\s*\|\s*"compact"/,
  "expected HubTileCard to expose a compact density mode",
);

assert.match(
  hubTileSource,
  /compact\s*=\s*density === "compact"/,
  "expected HubTileCard to derive compact styling from the density prop",
);

assert.match(
  analyticsSource,
  /title="Data"/,
  "expected the analytics landing hero to be renamed to Data",
);

assert.match(
  analyticsSource,
  /"Data Destinations"/,
  "expected the analytics landing section copy to be renamed to Data Destinations",
);

console.log("data-entry-surfaces.test.cjs passed");
```

- [ ] **Step 2: Run the regression to verify it fails**

Run: `node scripts/data-entry-surfaces.test.cjs`
Expected: FAIL because `HubTileCard` does not yet expose `density?: "default" | "compact"` and `app/analytics.tsx` still renders `title="Analytics"`.

- [ ] **Step 3: Add the compact card API and rename the landing surface**

```ts
// components/ui/HubTileCard.tsx
type HubTileCardProps = {
  badge?: string;
  density?: "default" | "compact";
  description?: string;
  emphasis?: "default" | "large";
  iconKey?: AppIconKey | null;
  layout?: "graphic" | "text" | "graphic-horizontal";
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  tint?: string;
  title: string;
};

export default function HubTileCard({
  badge,
  density = "default",
  description,
  emphasis = "default",
  iconKey,
  layout,
  onPress,
  style,
  tint = "rgba(96,165,250,0.14)",
  title,
}: HubTileCardProps) {
  const compact = density === "compact";
  const hasIcon = Boolean(iconKey);
  const isLarge = emphasis === "large";
  const resolvedLayout = layout ?? (hasIcon ? "graphic" : "text");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.cardCompact : null,
        isLarge ? styles.cardLarge : null,
        resolvedLayout === "graphic-horizontal" ? styles.cardHorizontalGraphic : null,
        resolvedLayout === "text" ? styles.cardText : null,
        style,
        pressed && styles.cardPressed,
      ]}
    >
```

```ts
// components/ui/HubTileCard.tsx
const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    minHeight: 196,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,18,34,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardCompact: {
    minHeight: 156,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
  },
});
```

```ts
// app/analytics.tsx
const analyticsSectionTitle =
  recoveryState.kind === "no-players"
    ? "No tracked players yet"
    : recoveryState.kind === "no-games"
      ? "No tracked games yet"
      : error
        ? "Data unavailable"
        : "Data Destinations";

return (
  <PageShell preset="analytics" density="compact" contentContainerStyle={styles.pageContent}>
    <HeroCard
      eyebrow="Data Center"
      title="Data"
      size="compact"
      variant="stat"
      style={styles.heroCard}
      headerAction={
        <Pressable
          style={styles.commandButton}
          onPress={() => router.push(APP_ROUTES.home)}
        >
          <Text style={styles.commandButtonText}>Command</Text>
        </Pressable>
      }
    />
```

- [ ] **Step 4: Re-run the targeted entry-surface checks**

Run: `node scripts/data-entry-surfaces.test.cjs`
Expected: PASS

Run: `node scripts/ui-navigation.test.cjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/HubTileCard.tsx utils/appHubs.ts app/analytics.tsx scripts/data-entry-surfaces.test.cjs
git commit -m "feat: rename data hub and add compact hub cards"
```

## Task 2: Turn The Players Hub Into A Signed-In-Player Preview Surface

**Files:**
- Modify: `app/players.tsx`
- Create: `scripts/players-hub-preview.test.cjs`

- [ ] **Step 1: Write the failing Players hub regression**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "players.tsx"),
  "utf8",
);

assert.match(
  source,
  /title="Signed-in Player"/,
  "expected the Players hub to surface a signed-in-player preview section",
);

assert.match(
  source,
  /title="Open profile"/,
  "expected the signed-in-player preview to expose a single Open profile action",
);

assert.match(
  source,
  /buildPlayerProfileRoute\(/,
  "expected the Players hub to reuse the canonical player-profile route helper",
);

assert.match(
  source,
  /density="compact"/,
  "expected the lower launcher tiles to opt into the compact HubTileCard density",
);

console.log("players-hub-preview.test.cjs passed");
```

- [ ] **Step 2: Run the regression to verify it fails**

Run: `node scripts/players-hub-preview.test.cjs`
Expected: FAIL because `app/players.tsx` does not yet render a `Signed-in Player` preview card or compact `HubTileCard` usage.

- [ ] **Step 3: Insert the preview card and switch the launcher grid to compact cards**

```ts
// app/players.tsx
import { buildPlayerProfileRoute, APP_ROUTES } from "@/utils/appRoutes";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";

const authProfile = useStore((state: any) => state?.authProfile ?? null);
const authSession = useStore((state: any) => state?.authSession ?? null);

const signedInPlayerId = useMemo(
  () => String(authProfile?.id ?? authSession?.user?.id ?? "").trim(),
  [authProfile?.id, authSession?.user?.id],
);

const signedInRosterPlayer = useMemo(
  () => players.find((player: any) => String(player?.id ?? "").trim() === signedInPlayerId) ?? null,
  [players, signedInPlayerId],
);

const signedInPreview = useMemo(() => {
  if (!signedInPlayerId) return null;

  if (signedInRosterPlayer) {
    return {
      id: signedInPlayerId,
      name: signedInRosterPlayer.name,
      color: signedInRosterPlayer.color,
      assignedCardArtIndex: signedInRosterPlayer.assignedCardArtIndex ?? null,
      status: "Roster ready",
      detail: `${groups.length} saved groups available`,
    };
  }

  return {
    id: signedInPlayerId,
    name:
      String(authProfile?.display_name ?? authProfile?.player_name ?? "").trim() ||
      "Signed-in Player",
    color: authProfile?.favorite_color ?? undefined,
    assignedCardArtIndex: authProfile?.assigned_card_art_index ?? null,
    status: "Not in local roster",
    detail: "Account identity is available even though this player is not in the local playable roster yet.",
  };
}, [authProfile, groups.length, signedInPlayerId, signedInRosterPlayer]);
```

```tsx
// app/players.tsx
{signedInPreview ? (
  <SectionCard
    title="Signed-in Player"
    subtitle="Read-only preview of the player this account opens by default."
  >
    <View style={styles.previewRow}>
      <PlayerCardIcon player={signedInPreview as any} size={52} showInitial={false} />
      <View style={styles.previewCopy}>
        <Text style={styles.previewName}>{signedInPreview.name}</Text>
        <Text style={styles.previewMeta}>{signedInPreview.status}</Text>
        <Text style={styles.previewDetail}>{signedInPreview.detail}</Text>
      </View>
    </View>

    <ActionButton
      title="Open profile"
      variant="secondary"
      onPress={() => router.push(buildPlayerProfileRoute(signedInPreview.id))}
    />
  </SectionCard>
) : null}
```

```tsx
// app/players.tsx
<HubTileCard
  key={card.key}
  density="compact"
  description={card.description}
  iconKey={card.iconKey ?? null}
  layout={card.key === "cards" ? "graphic-horizontal" : card.iconKey ? "graphic" : "text"}
  title={card.title}
  badge={card.bestFor}
  style={[
    card.iconKey ? styles.surfaceTileGraphic : styles.surfaceTileText,
    card.key === "cards" ? styles.surfaceTileWide : null,
  ]}
  onPress={() => router.push(card.route as any)}
/>
```

- [ ] **Step 4: Re-run the Players hub checks**

Run: `node scripts/players-hub-preview.test.cjs`
Expected: PASS

Run: `node scripts/ui-style-above-the-fold.test.cjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/players.tsx scripts/players-hub-preview.test.cjs
git commit -m "feat: add signed-in player preview to players hub"
```

## Task 3: Tighten Stats, Insights, And Profile Around One Rail Language

**Files:**
- Modify: `components/analytics/AnalyticsControlRail.tsx`
- Modify: `app/stats.tsx`
- Modify: `app/insights.tsx`
- Modify: `app/player-profile/[playerId].tsx`
- Create: `scripts/analytics-route-shells.test.cjs`

- [ ] **Step 1: Write the failing analytics-shell regression**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const railSource = read(path.join("components", "analytics", "AnalyticsControlRail.tsx"));
const statsSource = read(path.join("app", "stats.tsx"));
const insightsSource = read(path.join("app", "insights.tsx"));
const profileSource = read(path.join("app", "player-profile", "[playerId].tsx"));

assert.match(
  railSource,
  /density\?:\s*"default"\s*\|\s*"compact"/,
  "expected AnalyticsControlRail to expose a density prop",
);

assert.match(
  railSource,
  /const compact = density === "compact";/,
  "expected AnalyticsControlRail to derive compact chrome from the density prop",
);

assert.match(
  statsSource,
  /<AnalyticsControlRail[\s\S]*density="compact"/,
  "expected Stats to adopt the compact shared rail density",
);

assert.match(
  insightsSource,
  /<AnalyticsControlRail[\s\S]*tabVariant="stacked"/,
  "expected Insights to keep the stacked lens rail on the shared shell",
);

assert.match(
  profileSource,
  /<AnalyticsControlRail[\s\S]*title="Player Search"[\s\S]*density="compact"/,
  "expected Player Profile search to use the compact shared rail density",
);

assert.match(
  profileSource,
  /<AnalyticsControlRail[\s\S]*title="Profile Tabs"[\s\S]*density="compact"/,
  "expected Player Profile tabs to use the compact shared rail density",
);

console.log("analytics-route-shells.test.cjs passed");
```

- [ ] **Step 2: Run the regression to verify it fails**

Run: `node scripts/analytics-route-shells.test.cjs`
Expected: FAIL because `AnalyticsControlRail` does not yet expose a `density` prop and the target routes do not pass `density="compact"`.

- [ ] **Step 3: Add the density contract and adopt it route-by-route**

```ts
// components/analytics/AnalyticsControlRail.tsx
type AnalyticsControlRailProps = {
  actions?: React.ReactNode;
  activeTabKey?: string;
  density?: "default" | "compact";
  onTabChange?: (key: string) => void;
  search?: AnalyticsControlRailSearch | null;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  tabVariant?: "underline" | "stacked";
  tabs?: AnalyticsControlRailTab[];
  title?: string;
};

export default function AnalyticsControlRail({
  actions,
  activeTabKey,
  density = "default",
  onTabChange,
  search = null,
  style,
  subtitle,
  tabVariant = "underline",
  tabs = [],
  title,
}: AnalyticsControlRailProps) {
  const compact = density === "compact";

  return (
    <SectionCard title={title} subtitle={subtitle} actions={actions} style={style}>
      {tabs.length ? (
        <View
          style={[
            styles.tabRail,
            compact ? styles.tabRailCompact : null,
            tabVariant === "stacked" && styles.tabRailStacked,
          ]}
        >
```

```ts
// components/analytics/AnalyticsControlRail.tsx
const styles = StyleSheet.create({
  tabRailCompact: {
    gap: 6,
  },
  tabButtonCompact: {
    paddingVertical: 3,
    gap: 4,
  },
  tabButtonTextCompact: {
    fontSize: 10,
  },
});
```

```tsx
// app/stats.tsx
<AnalyticsControlRail
  title="Browse Statistics"
  subtitle="Move between the current server-authored slices without leaving the screen."
  density="compact"
  tabs={statsTabs}
  activeTabKey={activeTab}
  onTabChange={(key) => setActiveTab(key as StatsTab)}
/>
```

```tsx
// app/insights.tsx
<AnalyticsControlRail
  title="Insight Lenses"
  subtitle="Pick the lens first, then narrow it to a specific player when the route supports it."
  tabVariant="stacked"
  tabs={insightSectionTabs}
  activeTabKey={activeSectionTab}
  onTabChange={(key) => setActiveSectionTab(key as InsightSectionTab)}
  actions={<DefinitionsJumpLink category="correlations" />}
  search={
    activeSectionTab === "pairingCorrelations"
      ? {
          query: playerSearchQuery,
          onQueryChange: setPlayerSearchQuery,
          placeholder: "Search players",
          items: filteredPlayerOptions.map((player) => ({
            id: player.id,
            label: player.label,
            meta:
              player.displayName ||
              player.playerName ||
              (player.id === authProfileId
                ? "Signed-in player"
                : "Shared-network player"),
          })),
          selectedIds: selectedProfileId ? [selectedProfileId] : [],
          onSelect: (id) => setSelectedProfileId(id),
          emptyText: "No players match this search.",
          helperText: "Pick a player to inspect personal correlations.",
          variant: "list",
        }
      : null
  }
/>
```

```tsx
// app/player-profile/[playerId].tsx
<AnalyticsControlRail
  title="Player Search"
  subtitle="Swap the focus player without leaving this full profile breakdown."
  density="compact"
  search={{
    query: playerSearchQuery,
    onQueryChange: setPlayerSearchQuery,
    placeholder: "Search User",
    items: profileSearchItems,
    selectedIds: resolvedPlayerId ? [String(resolvedPlayerId)] : [],
    onSelect: handleSelectPlayer,
    helperText: "Pick another player to reuse the same analytics layout with a different focus.",
    variant: "rail",
  }}
/>

<AnalyticsControlRail
  title="Profile Tabs"
  subtitle="Custom player breakdown"
  density="compact"
  tabs={PROFILE_TABS.map((tab) => ({ key: tab, label: tab }))}
  activeTabKey={activeTab}
  onTabChange={(key) => setActiveTab(key as EloMetricTab)}
  style={styles.profileTabsRail}
/>
```

- [ ] **Step 4: Re-run the analytics-shell checks**

Run: `node scripts/analytics-control-rail.test.cjs`
Expected: PASS

Run: `node scripts/analytics-route-shells.test.cjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/analytics/AnalyticsControlRail.tsx app/stats.tsx app/insights.tsx app/player-profile/[playerId].tsx scripts/analytics-route-shells.test.cjs
git commit -m "feat: standardize route-specific analytics rail shells"
```

## Task 4: Simplify The Charts Guided Rail To One Visible Search Surface Per Chooser

**Files:**
- Modify: `app/charts/index.tsx`
- Create: `scripts/chart-guided-stage-disclosure.test.cjs`

- [ ] **Step 1: Write the failing Charts staged-disclosure regression**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8",
);

assert.match(
  source,
  /const focusSearchItems = useMemo\(/,
  "expected the charts route to derive one visible focus-player picker item list",
);

assert.match(
  source,
  /const scopeSearchItems = useMemo\(/,
  "expected the charts route to derive one visible scope-player picker item list",
);

assert.equal(
  (source.match(/placeholder="Search for Player"/g) ?? []).length,
  1,
  "expected the focus-player chooser to render one visible search picker",
);

assert.equal(
  (source.match(/placeholder="Player Search"/g) ?? []).length,
  1,
  "expected the scope-player chooser to render one visible search picker",
);

assert.doesNotMatch(
  source,
  /hideResults/,
  "expected the charts route to stop rendering hidden placeholder pickers before the real search rail",
);

console.log("chart-guided-stage-disclosure.test.cjs passed");
```

- [ ] **Step 2: Run the regression to verify it fails**

Run: `node scripts/chart-guided-stage-disclosure.test.cjs`
Expected: FAIL because `app/charts/index.tsx` still renders duplicate picker instances and still uses `hideResults`.

- [ ] **Step 3: Replace the duplicate focus and scope pickers with one visible picker each**

```ts
// app/charts/index.tsx
const focusSearchItems = useMemo(() => {
  const source = focusPlayerSearch.trim()
    ? filteredFocusPlayerOptions
    : quickFocusPlayerOptions;

  return source.map((player) => ({
    id: String(player.key),
    label: player.label || "Unknown",
  }));
}, [filteredFocusPlayerOptions, focusPlayerSearch, quickFocusPlayerOptions]);

const scopeSearchItems = useMemo(() => {
  const source = scopePlayerSearch.trim()
    ? filteredScopePlayerOptions
    : quickScopePlayerOptions;

  return source.map((player) => ({
    id: String(player.key),
    label: player.label || "Unknown",
  }));
}, [filteredScopePlayerOptions, quickScopePlayerOptions, scopePlayerSearch]);
```

```tsx
// app/charts/index.tsx
<PlayerSearchPicker
  query={focusPlayerSearch}
  onQueryChange={setFocusPlayerSearch}
  placeholder="Search for Player"
  items={focusSearchItems}
  selectedIds={selectedPlayer ? [String(selectedPlayer.key)] : []}
  onSelect={setSelectedPlayerId}
  variant="rail"
/>
```

```tsx
// app/charts/index.tsx
<PlayerSearchPicker
  query={scopePlayerSearch}
  onQueryChange={setScopePlayerSearch}
  placeholder="Player Search"
  items={scopeSearchItems}
  selectedIds={selectedGroupIds}
  onSelect={(playerId) => toggleGroupPlayer(String(playerId))}
  variant="rail"
  selectionMode="multiple"
/>
```

- [ ] **Step 4: Re-run the Charts staged-disclosure checks**

Run: `node scripts/chart-guided-rail-structure.test.cjs`
Expected: PASS

Run: `node scripts/chart-setup-primary-cta.test.cjs`
Expected: PASS

Run: `node scripts/chart-guided-stage-disclosure.test.cjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/charts/index.tsx scripts/chart-guided-stage-disclosure.test.cjs
git commit -m "feat: simplify charts stage disclosure"
```

## Task 5: Rebalance Game Setup So Readiness Reads First

**Files:**
- Modify: `app/game-setup.tsx`
- Create: `scripts/game-setup-hierarchy.test.cjs`

- [ ] **Step 1: Write the failing Game Setup hierarchy regression**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "game-setup.tsx"),
  "utf8",
);

assert.match(
  source,
  /import SectionCard from ["']@\/components\/ui\/SectionCard["']/,
  "expected game setup to use a compact launch summary shell",
);

assert.match(
  source,
  /title="Launch"/,
  "expected the top summary shell to be titled Launch",
);

const launchIndex = source.indexOf('title="Launch"');
const startIndex = source.indexOf('title="Start Game"');
const orderIndex = source.indexOf("Turn Order");
const colorIndex = source.indexOf('title="Change Color"');

assert.ok(launchIndex >= 0, "expected a Launch section");
assert.ok(startIndex > launchIndex, "expected Start Game to live inside the Launch section");
assert.ok(orderIndex > startIndex, "expected the Turn Order section to follow the launch summary");
assert.ok(colorIndex > orderIndex, "expected Change Color to stay in the turn-order header");

console.log("game-setup-hierarchy.test.cjs passed");
```

- [ ] **Step 2: Run the regression to verify it fails**

Run: `node scripts/game-setup-hierarchy.test.cjs`
Expected: FAIL because `app/game-setup.tsx` does not yet render a `Launch` summary section.

- [ ] **Step 3: Add the launch summary shell while keeping the header-based color action**

```tsx
// app/game-setup.tsx
import SectionCard from "@/components/ui/SectionCard";

<View style={styles.topActionRow}>
  <SectionCard
    title="Launch"
    subtitle="Lock the first captain, confirm the order, then start the table."
  >
    <ActionButton
      title="Start Game"
      subtitle={buildTurnOrderSummary(turnOrder)}
      onPress={startGame}
      disabled={!canStart || isStarting}
      style={styles.topActionButton}
    />
  </SectionCard>
</View>
```

```tsx
// app/game-setup.tsx
<View style={styles.listHeader}>
  <View style={styles.listHeaderCopy}>
    <Text variant="utilityLabel" style={styles.sectionLabel}>
      Turn Order
    </Text>
    <Text style={styles.listHint}>
      Drag to reorder captains. Select one only when you want to change this game's color.
    </Text>
  </View>

  <ActionButton
    title="Change Color"
    subtitle={
      selectedPlayer
        ? resolveDisplayName(selectedPlayer, selectedPlayerIndex)
        : "Select a player"
    }
    onPress={openColorPicker}
    disabled={!selectedPlayer || isStarting}
    variant="secondary"
    style={styles.colorActionButton}
  />
</View>
```

- [ ] **Step 4: Re-run the Game Setup checks**

Run: `node scripts/game-setup-turn-order.test.cjs`
Expected: PASS

Run: `node scripts/game-setup-start-button-order.test.cjs`
Expected: PASS

Run: `node scripts/game-setup-hierarchy.test.cjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/game-setup.tsx scripts/game-setup-hierarchy.test.cjs
git commit -m "feat: rebalance game setup launch hierarchy"
```

## Task 6: Register The New UI Regressions And Run The Full Polish Verification Set

**Files:**
- Modify: `scripts/run-focused-suite.cjs`

- [ ] **Step 1: Extend the focused UI suite before final verification**

```js
// scripts/run-focused-suite.cjs
ui: [
  "scripts/action-button-hierarchy.test.cjs",
  "scripts/analytics-control-rail.test.cjs",
  "scripts/data-entry-surfaces.test.cjs",
  "scripts/players-hub-preview.test.cjs",
  "scripts/analytics-route-shells.test.cjs",
  "scripts/chart-guided-stage-disclosure.test.cjs",
  "scripts/game-setup-hierarchy.test.cjs",
  "scripts/game-trends-visual-system.test.cjs",
  "scripts/player-directory-visual-system.test.cjs",
  "scripts/game-flow-shell-upgrades.test.cjs",
  "scripts/visual-system-outliers.test.cjs",
  "scripts/legacy-cleanup-guards.test.cjs",
  "scripts/chart-guided-rail-model.test.cjs",
  "scripts/chart-guided-rail-structure.test.cjs",
  "scripts/chart-guided-rail-route.test.cjs",
  "scripts/chart-setup-primary-cta.test.cjs",
  "scripts/chart-setup-back-pill.test.cjs",
],
```

- [ ] **Step 2: Run the focused UI suite**

Run: `node scripts/run-focused-suite.cjs ui`
Expected: PASS lines for the existing UI regressions plus the new:

```text
data-entry-surfaces.test.cjs passed
players-hub-preview.test.cjs passed
analytics-route-shells.test.cjs passed
chart-guided-stage-disclosure.test.cjs passed
game-setup-hierarchy.test.cjs passed
run-focused-suite.cjs passed (ui)
```

- [ ] **Step 3: Run the broad typecheck**

Run: `npm.cmd run typecheck`
Expected:

```text
> moonrakers-app@1.0.0 typecheck
> tsc --noEmit --pretty false --skipLibCheck --incremental false
```

and then a zero exit status with no TypeScript errors.

- [ ] **Step 4: Commit the suite registration**

```bash
git add scripts/run-focused-suite.cjs
git commit -m "test: register route-by-route data polish regressions"
```
