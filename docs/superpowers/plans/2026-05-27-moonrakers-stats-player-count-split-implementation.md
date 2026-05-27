# Moonrakers Stats Player Count Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the live Moonrakers `Stats` screen so `2-player` table-size guidance stays separate from `3+ players` guidance, with matching evidence in the `Games` tab.

**Architecture:** Keep the backend contract unchanged and extend the existing display-normalization layer in `lib/cloud/analytics/statsScreenDisplay.ts`. Feed two new normalized row sets into `app/stats.tsx`: one for compact `Overview -> Group Meta` recommendations and one for grouped `Games` tab evidence, then protect the route with one focused static UI regression test plus the helper normalization test.

**Tech Stack:** React Native, Expo Router, TypeScript, Node script tests, server-authored Supabase stats payloads

---

## File Structure

- Modify: `lib/cloud/analytics/statsScreenDisplay.ts`
  - Keep the existing correlation/game row normalizers intact.
  - Add one internal bucket aggregator for `groupMeta.playerCountSplit`.
  - Export two new display helpers: one compact recommendation view for `Overview`, one fuller summary view for `Games`.
- Modify: `scripts/stats-screen-server-rows.test.ts`
  - Extend the existing helper-level test to cover exact `2-player` rows, aggregated `3+ players` rows, weighted averages, and empty/single-bucket behavior.
- Modify: `app/stats.tsx`
  - Import the new display helpers.
  - Normalize `groupMeta.playerCountSplit` once near the other derived arrays.
  - Replace the single combined `Best table size` pill with split `2-player` and `3+ players` cards in `Overview -> Group Meta`.
  - Add a `By Table Size` section above recent game rows in the `Games` tab.
- Create: `scripts/stats-player-count-split-layout.test.cjs`
  - Add a small static route guard that confirms `app/stats.tsx` uses the new helpers and renders the `By Table Size` grouped section from `groupMeta.playerCountSplit`.

### Task 1: Add the Player-Count Split Display Helpers

**Files:**
- Modify: `lib/cloud/analytics/statsScreenDisplay.ts:1-152`
- Modify: `scripts/stats-screen-server-rows.test.ts:1-78`

- [ ] **Step 1: Write the failing helper test**

Append these assertions to `scripts/stats-screen-server-rows.test.ts` and expand the import list to pull in the two new helper names:

```ts
import {
  normalizeStatsCorrelationRows,
  normalizeStatsGameRows,
  normalizeStatsPlayerCountOverviewRows,
  normalizeStatsPlayerCountSummaryRows,
} from "../lib/cloud/analytics/statsScreenDisplay.ts";

const playerCountOverviewRows = normalizeStatsPlayerCountOverviewRows([
  {
    playerCount: 2,
    games: 4,
    wins: 3,
    winRate: 0.75,
    avgPrestige: 28,
    avgAssists: 1.5,
    avgFailures: 0.5,
  },
  {
    playerCount: 3,
    games: 2,
    wins: 1,
    winRate: 0.5,
    avgPrestige: 25,
    avgAssists: 2,
    avgFailures: 1,
  },
  {
    playerCount: 4,
    games: 3,
    wins: 2,
    winRate: 0.667,
    avgPrestige: 30,
    avgAssists: 1,
    avgFailures: 0.5,
  },
]);

assert.deepEqual(playerCountOverviewRows, [
  {
    key: "two-player-overview",
    label: "2-player",
    value: "75% win rate",
    detail: "4 games tracked | 3 wins | 28 avg prestige",
  },
  {
    key: "three-plus-overview",
    label: "3+ players",
    value: "60% win rate",
    detail: "5 games tracked | 3 wins | 28 avg prestige",
  },
]);

const playerCountSummaryRows = normalizeStatsPlayerCountSummaryRows([
  {
    playerCount: 2,
    games: 4,
    wins: 3,
    winRate: 0.75,
    avgPrestige: 28,
    avgAssists: 1.5,
    avgFailures: 0.5,
  },
  {
    playerCount: 3,
    games: 2,
    wins: 1,
    winRate: 0.5,
    avgPrestige: 25,
    avgAssists: 2,
    avgFailures: 1,
  },
  {
    playerCount: 4,
    games: 3,
    wins: 2,
    winRate: 0.667,
    avgPrestige: 30,
    avgAssists: 1,
    avgFailures: 0.5,
  },
]);

assert.deepEqual(playerCountSummaryRows, [
  {
    key: "two-player-summary",
    label: "2-player",
    value: "3W | 1L | 75% win rate",
    detail: "4 games | 28 avg prestige | 1.5 avg assists | 0.5 avg failures",
  },
  {
    key: "three-plus-summary",
    label: "3+ players",
    value: "3W | 2L | 60% win rate",
    detail: "5 games | 28 avg prestige | 1.4 avg assists | 0.7 avg failures",
  },
]);

assert.deepEqual(normalizeStatsPlayerCountOverviewRows([]), []);

assert.deepEqual(
  normalizeStatsPlayerCountSummaryRows([
    {
      playerCount: 2,
      games: 1,
      wins: 1,
      winRate: 1,
      avgPrestige: 31,
      avgAssists: 2,
      avgFailures: 0,
    },
  ]),
  [
    {
      key: "two-player-summary",
      label: "2-player",
      value: "1W | 0L | 100% win rate",
      detail: "1 game | 31 avg prestige | 2 avg assists | 0 avg failures",
    },
  ],
);
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```powershell
node --experimental-strip-types .\scripts\stats-screen-server-rows.test.ts
```

Expected: FAIL with a message similar to `normalizeStatsPlayerCountOverviewRows is not a function` or an assertion failure because the player-count split helpers do not exist yet.

- [ ] **Step 3: Write the minimal helper implementation**

Update `lib/cloud/analytics/statsScreenDisplay.ts` with one shared bucket builder plus the two exported display helpers:

```ts
type PlayerCountSplitRow = {
  playerCount: number;
  games: number;
  wins: number;
  avgPrestige: number | null;
  avgAssists: number | null;
  avgFailures: number | null;
};

type PlayerCountBucket = {
  key: "two-player" | "three-plus";
  label: "2-player" | "3+ players";
  games: number;
  wins: number;
  avgPrestige: number | null;
  avgAssists: number | null;
  avgFailures: number | null;
};

function buildPlayerCountBuckets(value: unknown): PlayerCountBucket[] {
  const buckets = new Map<
    PlayerCountBucket["key"],
    {
      key: PlayerCountBucket["key"];
      label: PlayerCountBucket["label"];
      games: number;
      wins: number;
      prestigeTotal: number;
      assistTotal: number;
      failureTotal: number;
      prestigeWeight: number;
      assistWeight: number;
      failureWeight: number;
    }
  >();

  for (const entry of toArray(value)) {
    const playerCount = toNumberValue(entry.playerCount);
    const games = toNumberValue(entry.games);
    const wins = toNumberValue(entry.wins);
    const avgPrestige = toNumberValue(entry.avgPrestige);
    const avgAssists = toNumberValue(entry.avgAssists);
    const avgFailures = toNumberValue(entry.avgFailures);

    if (playerCount === null || games === null || wins === null || games <= 0 || playerCount < 2) {
      continue;
    }

    const key: PlayerCountBucket["key"] = playerCount === 2 ? "two-player" : "three-plus";
    const label: PlayerCountBucket["label"] = playerCount === 2 ? "2-player" : "3+ players";
    const bucket =
      buckets.get(key) ??
      {
        key,
        label,
        games: 0,
        wins: 0,
        prestigeTotal: 0,
        assistTotal: 0,
        failureTotal: 0,
        prestigeWeight: 0,
        assistWeight: 0,
        failureWeight: 0,
      };

    bucket.games += games;
    bucket.wins += wins;

    if (avgPrestige !== null) {
      bucket.prestigeTotal += avgPrestige * games;
      bucket.prestigeWeight += games;
    }

    if (avgAssists !== null) {
      bucket.assistTotal += avgAssists * games;
      bucket.assistWeight += games;
    }

    if (avgFailures !== null) {
      bucket.failureTotal += avgFailures * games;
      bucket.failureWeight += games;
    }

    buckets.set(key, bucket);
  }

  return ["two-player", "three-plus"]
    .map((key) => buckets.get(key as PlayerCountBucket["key"]))
    .filter(
      (
        bucket,
      ): bucket is {
        key: PlayerCountBucket["key"];
        label: PlayerCountBucket["label"];
        games: number;
        wins: number;
        prestigeTotal: number;
        assistTotal: number;
        failureTotal: number;
        prestigeWeight: number;
        assistWeight: number;
        failureWeight: number;
      } => Boolean(bucket && bucket.games > 0),
    )
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      games: bucket.games,
      wins: bucket.wins,
      avgPrestige:
        bucket.prestigeWeight > 0 ? bucket.prestigeTotal / bucket.prestigeWeight : null,
      avgAssists:
        bucket.assistWeight > 0 ? bucket.assistTotal / bucket.assistWeight : null,
      avgFailures:
        bucket.failureWeight > 0 ? bucket.failureTotal / bucket.failureWeight : null,
    }));
}

export function normalizeStatsPlayerCountOverviewRows(value: unknown): StatsDisplayRow[] {
  return buildPlayerCountBuckets(value).map((bucket) => ({
    key: `${bucket.key}-overview`,
    label: bucket.label,
    value: `${Math.round((bucket.wins / bucket.games) * 100)}% win rate`,
    detail: joinParts([
      `${bucket.games} ${pluralize(bucket.games, "game")} tracked`,
      `${bucket.wins} ${pluralize(bucket.wins, "win")}`,
      bucket.avgPrestige !== null ? `${formatNumber(bucket.avgPrestige)} avg prestige` : null,
    ]),
  }));
}

export function normalizeStatsPlayerCountSummaryRows(value: unknown): StatsDisplayRow[] {
  return buildPlayerCountBuckets(value).map((bucket) => ({
    key: `${bucket.key}-summary`,
    label: bucket.label,
    value: `${bucket.wins}W | ${Math.max(bucket.games - bucket.wins, 0)}L | ${Math.round((bucket.wins / bucket.games) * 100)}% win rate`,
    detail: joinParts([
      `${bucket.games} ${pluralize(bucket.games, "game")}`,
      bucket.avgPrestige !== null ? `${formatNumber(bucket.avgPrestige)} avg prestige` : null,
      bucket.avgAssists !== null ? `${formatNumber(bucket.avgAssists)} avg assists` : null,
      bucket.avgFailures !== null ? `${formatNumber(bucket.avgFailures)} avg failures` : null,
    ]),
  }));
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```powershell
node --experimental-strip-types .\scripts\stats-screen-server-rows.test.ts
```

Expected: PASS with `stats-screen-server-rows.test.ts passed`.

- [ ] **Step 5: Commit the helper layer**

```bash
git add scripts/stats-screen-server-rows.test.ts lib/cloud/analytics/statsScreenDisplay.ts
git commit -m "feat: normalize stats player-count split rows"
```

### Task 2: Wire the Split Recommendations into the Stats Screen

**Files:**
- Modify: `app/stats.tsx:18-21`
- Modify: `app/stats.tsx:207-266`
- Modify: `app/stats.tsx:480-503`
- Modify: `app/stats.tsx:820-887`
- Create: `scripts/stats-player-count-split-layout.test.cjs`

- [ ] **Step 1: Write the failing static route test**

Create `scripts/stats-player-count-split-layout.test.cjs` with this content:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), "utf8");
}

const statsSource = read(path.join("app", "stats.tsx"));
const helperSource = read(path.join("lib", "cloud", "analytics", "statsScreenDisplay.ts"));

assert.match(
  helperSource,
  /label: "2-player"/,
  "expected the player-count split helper to preserve a dedicated 2-player bucket label",
);

assert.match(
  helperSource,
  /label: "3\\+ players"/,
  "expected the player-count split helper to aggregate multiplayer rows under a 3+ players label",
);

assert.match(
  statsSource,
  /normalizeStatsPlayerCountOverviewRows[\s\S]*normalizeStatsPlayerCountSummaryRows/,
  "expected app/stats.tsx to import the player-count split display helpers",
);

assert.match(
  statsSource,
  /groupMeta\.playerCountSplit/,
  "expected app/stats.tsx to source table-size split summaries from groupMeta.playerCountSplit",
);

assert.match(
  statsSource,
  /<Text style=\{styles\.compactSectionTitle\}>By Table Size<\/Text>/,
  "expected app/stats.tsx to render a By Table Size summary section",
);

assert.match(
  statsSource,
  /playerCountMetaItems\.map[\s\S]*playerCountSummaryItems\.map/,
  "expected app/stats.tsx to render both overview and games-tab table-size split cards",
);

console.log("stats-player-count-split-layout.test.cjs passed");
```

- [ ] **Step 2: Run the route test to verify it fails**

Run:

```powershell
node .\scripts\stats-player-count-split-layout.test.cjs
```

Expected: FAIL because `app/stats.tsx` does not yet import the new helpers or render the `By Table Size` grouped section.

- [ ] **Step 3: Write the minimal `Stats` route wiring**

Update `app/stats.tsx` in four places:

1. Expand the import block:

```ts
import {
  normalizeStatsCorrelationRows,
  normalizeStatsGameRows,
  normalizeStatsPlayerCountOverviewRows,
  normalizeStatsPlayerCountSummaryRows,
} from "@/lib/cloud/analytics/statsScreenDisplay";
```

2. Normalize the bucketed rows once near the other derived arrays:

```ts
const playerCountMetaItems = normalizeStatsPlayerCountOverviewRows(groupMeta.playerCountSplit);
const playerCountSummaryItems = normalizeStatsPlayerCountSummaryRows(groupMeta.playerCountSplit);

const hasLeagueData =
  overviewCards.length > 0 ||
  topSignals.length > 0 ||
  playstyleHighlights.length > 0 ||
  correlationItems.length > 0 ||
  playerCountSummaryItems.length > 0 ||
  gamesItems.length > 0 ||
  toNumberValue(hero.games) > 0;
```

3. Replace the old single `Best table size` pill inside `renderOverviewTab()` with grouped summary cards under `Group Meta`:

```tsx
{(toNumberValue(groupMeta.avgSpread) > 0 ||
  toNumberValue(groupMeta.chaosIndex) > 0 ||
  playerCountMetaItems.length > 0) ? (
  <View style={styles.metricSubsection}>
    <Text style={styles.metricSubsectionTitle}>Group Meta</Text>
    <View style={styles.compactGrid}>
      <StatPill
        label="Avg prestige spread"
        value={toDisplayValue(groupMeta.avgSpread)}
        accent={COLORS.cyan}
      />
      <StatPill
        label="Chaos index"
        value={toDisplayValue(groupMeta.chaosIndex)}
        accent={COLORS.blueGlow}
      />
    </View>
    {playerCountMetaItems.length > 0 ? (
      <View style={styles.signalSection}>
        <Text style={styles.compactSectionTitle}>By Table Size</Text>
        {playerCountMetaItems.map((entry, index) => (
          <View key={toStringValue(entry.key, `group-meta-${index}`)} style={styles.signalCard}>
            <View style={styles.signalBody}>
              <DefinitionTermText
                label={toStringValue(entry.label, `Bucket ${index + 1}`)}
                style={styles.signalLabel}
              />
              <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
              {toStringValue(entry.detail, "").trim() ? (
                <Text style={styles.signalDetail}>{toStringValue(entry.detail, "")}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    ) : null}
  </View>
) : null}
```

4. Add the grouped evidence section above the recent game rows in `renderGamesTab()`:

```tsx
{playerCountSummaryItems.length > 0 ? (
  <View style={styles.signalSection}>
    <Text style={styles.compactSectionTitle}>By Table Size</Text>
    {playerCountSummaryItems.map((entry, index) => (
      <View key={toStringValue(entry.key, `player-count-${index}`)} style={styles.signalCard}>
        <View style={styles.signalBody}>
          <DefinitionTermText
            label={toStringValue(entry.label, `Bucket ${index + 1}`)}
            style={styles.signalLabel}
          />
          <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
          {toStringValue(entry.detail, "").trim() ? (
            <Text style={styles.signalDetail}>{toStringValue(entry.detail, "")}</Text>
          ) : null}
        </View>
      </View>
    ))}
  </View>
) : null}

{gamesItems.length > 0 ? (
  <View style={styles.signalSection}>
    <Text style={styles.compactSectionTitle}>Recent Games</Text>
    {gamesItems.map((entry, index) => (
      <View key={toStringValue(entry.key, `game-${index}`)} style={styles.signalCard}>
        <Text style={styles.signalRank}>#{index + 1}</Text>
        <View style={styles.signalBody}>
          <DefinitionTermText
            label={toStringValue(entry.label, `Game ${index + 1}`)}
            style={styles.signalLabel}
          />
          <Text style={styles.signalValue}>{toDisplayValue(entry.value)}</Text>
          {toStringValue(entry.detail, "").trim() ? (
            <Text style={styles.signalDetail}>{toStringValue(entry.detail, "")}</Text>
          ) : null}
        </View>
      </View>
    ))}
  </View>
) : null}
```

- [ ] **Step 4: Run the route tests to verify they pass**

Run:

```powershell
node .\scripts\stats-player-count-split-layout.test.cjs
node .\scripts\stats-primary-tab-rail.test.cjs
node .\scripts\analytics-route-no-local-derivation.test.cjs
node --experimental-strip-types .\scripts\stats-screen-server-rows.test.ts
```

Expected:

- `stats-player-count-split-layout.test.cjs passed`
- `stats-primary-tab-rail.test.cjs passed`
- `analytics-route-no-local-derivation.test.cjs passed`
- `stats-screen-server-rows.test.ts passed`

- [ ] **Step 5: Commit the route wiring**

```bash
git add app/stats.tsx scripts/stats-player-count-split-layout.test.cjs
git commit -m "feat: split stats table-size summaries"
```

### Task 3: Run the Focused Verification Pass

**Files:**
- Modify only if verification exposes a real issue in:
  - `app/stats.tsx`
  - `lib/cloud/analytics/statsScreenDisplay.ts`
  - `scripts/stats-screen-server-rows.test.ts`
  - `scripts/stats-player-count-split-layout.test.cjs`

- [ ] **Step 1: Run focused lint on the touched route**

Run:

```powershell
node .\node_modules\eslint\bin\eslint.js app/stats.tsx lib/cloud/analytics/statsScreenDisplay.ts --ext .ts,.tsx --rule "@typescript-eslint/no-explicit-any: off" --rule "@typescript-eslint/no-require-imports: off"
```

Expected: PASS with no new lint failures for the touched files.

- [ ] **Step 2: Run the broader analytics test suite if the focused checks are clean**

Run:

```powershell
node .\scripts\stats-player-count-split-layout.test.cjs
node .\scripts\stats-primary-tab-rail.test.cjs
node .\scripts\analytics-route-no-local-derivation.test.cjs
node --experimental-strip-types .\scripts\stats-screen-server-rows.test.ts
```

Expected: all four focused checks pass again after the lint pass.

- [ ] **Step 3: Inspect the final diff before handoff**

Run:

```powershell
git diff -- app/stats.tsx lib/cloud/analytics/statsScreenDisplay.ts scripts/stats-screen-server-rows.test.ts scripts/stats-player-count-split-layout.test.cjs
```

Expected: the diff shows only the approved `2-player` versus `3+ players` split logic, grouped evidence, and related tests.

- [ ] **Step 4: Commit only if verification required a final fix**

```bash
git add app/stats.tsx lib/cloud/analytics/statsScreenDisplay.ts scripts/stats-screen-server-rows.test.ts scripts/stats-player-count-split-layout.test.cjs
git commit -m "fix: polish stats player-count split verification"
```

- [ ] **Step 5: Hand off with explicit verification notes**

Report:

```text
Implemented the live Stats split for 2-player versus 3+ players using the existing Supabase playerCountSplit payload. Verified with the helper normalization test, the new stats layout guard, the stats primary tab rail guard, and the analytics route provenance guard.
```
