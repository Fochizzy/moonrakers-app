# Moonrakers Stats Shared Focus Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote one shared searchable `Focus Player` control under the stats tab rail and use it to drive the player-aware parts of the stats page.

**Architecture:** Keep the Supabase `get_stats_screen` contract unchanged and implement this as a route-level UI state change in `app/stats.tsx`. The page will own the single `selectedPlayerId` and `playerSearchQuery`, render one shared `PlayerSearchPicker` under `AnalyticsControlRail`, remove the duplicate picker from the `Players` tab, and simplify `PlaystyleSection` so it keeps only the synced segmented quick-switch rows.

**Tech Stack:** React Native, Expo Router, TypeScript, Node regex/script tests, server-authored Supabase analytics payloads

---

## File Structure

- Create: `scripts/stats-shared-focus-player-layout.test.cjs`
  - Static route guard for the new shared focus card in `app/stats.tsx`.
  - Verify the picker sits under `AnalyticsControlRail`, uses the shared route state, clears the query on selection, searches multiple player fields, and removes the old `Player Directory` section.
- Modify: `scripts/playstyle-player-selector-layout.test.cjs`
  - Flip the current expectations so the playstyle section keeps segmented controls but no longer imports or renders `PlayerSearchPicker`.
- Modify: `app/stats.tsx`
  - Add shared focus search items and a shared selection handler.
  - Expand filtering to match `label`, `displayName`, `playerName`, and `id`.
  - Render the shared `Focus Player` card under `AnalyticsControlRail`.
  - Remove the old `Player Directory` picker from the `Players` tab.
  - Update the player-detail copy to reflect the shared page-level focus.
- Modify: `components/stats/PlaystyleSection.tsx`
  - Remove the local search query state and the nested `PlayerSearchPicker`.
  - Keep the segmented quick-switch rows synced to the shared selected player.

### Task 1: Remove the Nested Playstyle Search With a Failing Layout Test First

**Files:**
- Modify: `scripts/playstyle-player-selector-layout.test.cjs`
- Modify: `components/stats/PlaystyleSection.tsx`

- [ ] **Step 1: Write the failing playstyle layout test**

Update `scripts/playstyle-player-selector-layout.test.cjs` so it expects segmented controls to remain but the nested search picker to be gone:

```js
assert.match(
  source,
  /import SegmentedControl/,
  "expected PlaystyleSection to keep the shared segmented selector control",
);

assert.doesNotMatch(
  source,
  /import PlayerSearchPicker/,
  "expected PlaystyleSection to stop importing the nested player search picker",
);

assert.doesNotMatch(
  source,
  /const \[playerSearchQuery, setPlayerSearchQuery\] = useState\(""\);/,
  "expected PlaystyleSection to stop owning its own search query state",
);

assert.match(
  source,
  /<View style=\{styles\.selectorSection\}>[\s\S]*<SegmentedControl/s,
  "expected the playstyle selector section to keep the segmented quick-switch rows",
);

assert.doesNotMatch(
  source,
  /<PlayerSearchPicker[\s\S]*placeholder="Search players"/s,
  "expected the playstyle search box to be removed in favor of the shared stats-page focus picker",
);
```

- [ ] **Step 2: Run the playstyle layout test to verify it fails**

Run:

```powershell
node .\scripts\playstyle-player-selector-layout.test.cjs
```

Expected: FAIL because `PlaystyleSection.tsx` still imports `PlayerSearchPicker`, owns `playerSearchQuery`, and renders the nested search box.

- [ ] **Step 3: Write the minimal playstyle implementation**

Remove the nested search state, import, and picker block from `components/stats/PlaystyleSection.tsx` while preserving the segmented quick-switch rows:

```ts
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

// remove: import PlayerSearchPicker from "@/components/players/PlayerSearchPicker";

export default function PlaystyleSection({
  authProfileId = null,
  players,
  games,
  leaderboard,
  selectedPlayerId,
  onSelectPlayer,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Playstyle</Text>
      <Text style={styles.title}>Stay at Base Profile</Text>

      <View style={styles.selectorSection}>
        <View style={styles.selectorTabStack}>
          {playerTabRows.map((row, index) => (
            <SegmentedControl
              key={`playstyle-selector-row-${index}`}
              items={row}
              value={resolvedPlayer.id}
              onChange={onSelectPlayer}
              style={styles.selectorSegmentedControl}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run the playstyle layout test to verify it passes**

Run:

```powershell
node .\scripts\playstyle-player-selector-layout.test.cjs
```

Expected: PASS.

### Task 2: Add the Shared Stats Focus Picker With a Failing Route Test First

**Files:**
- Create: `scripts/stats-shared-focus-player-layout.test.cjs`
- Modify: `app/stats.tsx`

- [ ] **Step 1: Write the failing stats layout test**

Create `scripts/stats-shared-focus-player-layout.test.cjs` with a static route guard for the shared focus picker:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "app", "stats.tsx"), "utf8");

assert.match(
  source,
  /<AnalyticsControlRail[\s\S]*\/>[\s\S]*<SectionCard[\s\S]*title="Focus Player"[\s\S]*<PlayerSearchPicker/s,
  "expected the stats screen to render a shared Focus Player card directly under the tab rail",
);

assert.match(
  source,
  /player\.label[\s\S]*player\.displayName[\s\S]*player\.playerName[\s\S]*player\.id/s,
  "expected the shared stats-player filter to match label, display name, player name, and id",
);

assert.match(
  source,
  /const handleSharedPlayerSelect = \(playerId: string\) => \{[\s\S]*setSelectedPlayerId\(playerId\);[\s\S]*setPlayerSearchQuery\(""\);[\s\S]*\}/,
  "expected stats.tsx to clear the shared player search after a selection",
);

assert.doesNotMatch(
  source,
  /<SectionCard title="Player Directory">/,
  "expected the Players tab to stop rendering the old nested Player Directory search card",
);

assert.match(
  source,
  /<PlaystyleSection[\s\S]*selectedPlayerId=\{selectedPlayerId\}[\s\S]*onSelectPlayer=\{setSelectedPlayerId\}/s,
  "expected PlaystyleSection to stay synced to the shared selected player state",
);

console.log("stats-shared-focus-player-layout.test.cjs passed");
```

- [ ] **Step 2: Run the stats layout test to verify it fails**

Run:

```powershell
node .\scripts\stats-shared-focus-player-layout.test.cjs
```

Expected: FAIL because `app/stats.tsx` does not yet render the shared `Focus Player` card, does not clear the query after selection, and still contains the nested `Player Directory` section.

- [ ] **Step 3: Write the minimal stats-route implementation**

Update `app/stats.tsx` so the route owns one shared focus picker under the tab rail:

```ts
const normalizedQuery = deferredPlayerSearchQuery.trim().toLowerCase();
const filteredPlayerOptions = useMemo(() => {
  if (!normalizedQuery) {
    return playerOptions;
  }

  return playerOptions.filter((player) => {
    const searchable = [
      player.label,
      player.displayName,
      player.playerName,
      player.id,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);

    return searchable.some((value) => value.includes(normalizedQuery));
  });
}, [normalizedQuery, playerOptions]);

const focusPlayerSearchItems = useMemo(
  () =>
    filteredPlayerOptions.map((player) => ({
      id: player.id,
      label: player.label,
      meta:
        player.id === selectedPlayerId
          ? "Currently focused across the stats page"
          : player.displayName ||
            player.playerName ||
            "Switch the page focus to this player",
    })),
  [filteredPlayerOptions, selectedPlayerId],
);

const showSharedFocusPicker =
  !loading &&
  !error &&
  playerOptions.length > 0 &&
  (activeTab === "overview" ||
    activeTab === "players" ||
    activeTab === "playstyle" ||
    activeTab === "correlations" ||
    activeTab === "games");

const handleSharedPlayerSelect = (playerId: string) => {
  setSelectedPlayerId(playerId);
  setPlayerSearchQuery("");
};
```

Render the card directly under `AnalyticsControlRail` and remove the old `Player Directory` block from `renderPlayersTab()`:

```tsx
<AnalyticsControlRail
  title="Browse Statistics"
  subtitle="Move between the current server-authored slices without leaving the screen."
  tabs={statsTabs}
  activeTabKey={activeTab}
  onTabChange={(key) => setActiveTab(key as StatsTab)}
/>

{showSharedFocusPicker ? (
  <SectionCard
    title="Focus Player"
    subtitle="Change the player-specific focus without leaving the current stats tab."
  >
    <PlayerSearchPicker
      query={playerSearchQuery}
      onQueryChange={setPlayerSearchQuery}
      onClearQuery={() => setPlayerSearchQuery("")}
      placeholder="Search players"
      items={focusPlayerSearchItems}
      selectedIds={selectedPlayerId ? [selectedPlayerId] : []}
      onSelect={handleSharedPlayerSelect}
      inputProps={{ returnKeyType: "search" }}
      showResultsOnlyWhenQuery
    />
  </SectionCard>
) : null}
```

And in `renderPlayersTab()` keep only the detail panel with shared-focus copy:

```tsx
return (
  <View style={styles.playersList}>
    <AnalyticsStateSection
      eyebrow="Player Detail"
      title={toStringValue(selectedPlayerDetail.label, "Selected player")}
      subtitle={toStringValue(
        selectedPlayerDetail.summary,
        "This panel follows the shared Focus Player selection at the top of the stats page.",
      )}
      actions={<DefinitionsJumpLink category="efficiency" />}
      helpCategory="efficiency"
      state="ready"
      sourceCaption={freshness.sourceCaption(
        "This detail card follows the shared Focus Player selection so the same player read carries across the stats surface.",
      )}
    >
      {detailStats.length > 0 ? (
        <View style={styles.compactGrid}>
          {detailStats.map((item) => (
            <StatPill
              key={item.key}
              label={item.label}
              metric={item.key}
              value={item.value}
              accent={COLORS.purple}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyInlineText}>
          No detailed player stats were returned in the current Supabase payload.
        </Text>
      )}
    </AnalyticsStateSection>
  </View>
);
```

- [ ] **Step 4: Run the stats layout test to verify it passes**

Run:

```powershell
node .\scripts\stats-shared-focus-player-layout.test.cjs
```

Expected: PASS.

### Task 3: Run the Focused Regression Sweep

**Files:**
- Verify: `scripts/playstyle-player-selector-layout.test.cjs`
- Verify: `scripts/stats-shared-focus-player-layout.test.cjs`
- Verify: `scripts/stats-primary-tab-rail.test.cjs`
- Verify: `scripts/playstyle-stats.test.cjs`

- [ ] **Step 1: Re-run the focused layout tests together**

Run:

```powershell
node .\scripts\playstyle-player-selector-layout.test.cjs
node .\scripts\stats-shared-focus-player-layout.test.cjs
```

Expected: both PASS.

- [ ] **Step 2: Re-run the nearby regression guards**

Run:

```powershell
node .\scripts\stats-primary-tab-rail.test.cjs
node .\scripts\playstyle-stats.test.cjs
```

Expected: both PASS, confirming the top-level stats rail and deeper playstyle analytics wiring still hold.

- [ ] **Step 3: Review the final diff before reporting completion**

Run:

```powershell
git diff -- app/stats.tsx components/stats/PlaystyleSection.tsx scripts/playstyle-player-selector-layout.test.cjs scripts/stats-shared-focus-player-layout.test.cjs
```

Expected: diff shows one shared stats-page focus picker, no nested player-directory picker in `Players`, and no nested search picker in `PlaystyleSection`.
