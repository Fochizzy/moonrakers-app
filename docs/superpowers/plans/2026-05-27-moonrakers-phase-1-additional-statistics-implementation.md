# Moonrakers Phase 1 Additional Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the server-authored Moonrakers analytics surfaces with phase-1 additional statistics, turn-order summaries, and glossary-linked terminology across `Stats`, `Insights`, and supported chart setup flows.

**Architecture:** Keep Supabase RPC payloads as the source of truth for `Stats` and `Insights`, then normalize the new payload sections in shared display helpers before rendering them in focused UI sections. Add chart support only where the current aggregate chart components already make sense, and add a dedicated glossary category plus resolver aliases so every newly introduced turn-order term can deep-link to Definitions.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase SQL migrations / RPC payloads, Node/CJS/TS regression tests.

---

## File Structure

- Create: `supabase/migrations/20260527143000_moonrakers_phase1_additional_stats_turn_order.sql`
  Purpose: Patch `public.get_stats_screen` and `public.get_insights_screen` so phase-1 sections are published from Supabase instead of synthesized locally.

- Create: `components/stats/TurnOrderSummarySection.tsx`
  Purpose: Render the new `Turn Order Overview` and `By Table Size` sections with shared styling and definition links.

- Create: `scripts/stats-phase1-rollup-contract.test.cjs`
  Purpose: Guard the new migration so the server-authored stats/insights payload exposes the expected phase-1 keys.

- Create: `scripts/stats-phase1-sections.test.cjs`
  Purpose: Guard the `Stats` screen so the new overview, player-detail, and turn-order sections stay wired in.

- Create: `scripts/chart-phase1-metric-options.test.cjs`
  Purpose: Guard the chart setup allowlists so the new metrics appear only on supported chart types.

- Modify: `lib/cloud/analytics/types.ts`
  Purpose: Replace loose `Record<string, unknown>` sections with typed phase-1 payload shapes for overview clusters, player context, turn-order rows, and insights turn-order summaries.

- Modify: `lib/cloud/analytics/statsScreenDisplay.ts`
  Purpose: Add normalization helpers for turn-order overview rows and grouped table-size summaries.

- Modify: `app/stats.tsx`
  Purpose: Render `Form & Closing`, `Pressure & Context`, a playstyle support-context spotlight, and the games-tab turn-order sections using the server payload plus shared definition links.

- Modify: `app/insights.tsx`
  Purpose: Pass the new turn-order summary into the shared summary builder and expose a glossary link for the positional read.

- Modify: `utils/insightSummaries.ts`
  Purpose: Fold the published turn-order summary into the macro insights copy without adding a new tab.

- Modify: `utils/charts.ts`
  Purpose: Add a chart-specific phase-1 metric allowlist instead of globally widening every metric-driven chart.

- Modify: `components/charts/BarChart/BarChart.tsx`
  Purpose: Teach the aggregate bar chart how to read `turnOrderWinCorrelation`.

- Modify: `components/charts/Heatmap.tsx`
  Purpose: Teach the aggregate heatmap how to read `turnOrderWinCorrelation`.

- Modify: `utils/definitionCatalog.ts`
  Purpose: Add a `Turn Order` glossary group plus entries for the new table-level terms.

- Modify: `utils/definitionTargets.ts`
  Purpose: Resolve new glossary categories and aliases such as `Turn Order Overview`, `By Table Size`, and `Seat Win Rate`.

- Modify: `scripts/stats-screen-server-rows.test.ts`
  Purpose: Cover the new turn-order normalizers.

- Modify: `scripts/insights-summary-statements.test.cjs`
  Purpose: Cover the new macro summary wording when turn-order context is published.

- Modify: `scripts/definitions-glossary-coverage.test.cjs`
  Purpose: Guard the new glossary group and entries.

- Modify: `scripts/definition-term-surface-links.test.cjs`
  Purpose: Guard the new definition-link wiring on `Stats`.

- Modify: `scripts/metric-help-links-and-insights-actions.test.cjs`
  Purpose: Guard the new `Stats` and `Insights` help-link targets.

## Task 1: Publish The Phase-1 Server Payload

**Files:**
- Create: `supabase/migrations/20260527143000_moonrakers_phase1_additional_stats_turn_order.sql`
- Create: `scripts/stats-phase1-rollup-contract.test.cjs`
- Modify: `lib/cloud/analytics/types.ts`

- [ ] **Step 1: Write the failing contract test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260527143000_moonrakers_phase1_additional_stats_turn_order.sql",
);

assert.equal(
  fs.existsSync(migrationPath),
  true,
  "expected the phase-1 stats migration to exist",
);

const source = fs.readFileSync(migrationPath, "utf8");

for (const pattern of [
  /create or replace function public\.get_stats_screen/i,
  /'formClosing',\s*jsonb_build_object\(/i,
  /'pressureContext',\s*jsonb_build_array\(/i,
  /assistGapToLeader|assistsOverFiveBehindLeader|assistGapToTarget/i,
  /'turnOrderOverview',\s*coalesce\(/i,
  /'turnOrderByTableSize',\s*coalesce\(/i,
  /create or replace function public\.get_insights_screen/i,
  /'turnOrderSummary',\s*jsonb_build_object\(/i,
  /lateLeadConversion|tempoControl|turnOrderWinCorrelation|interactionIndex/i,
]) {
  assert.match(source, pattern);
}

console.log("stats-phase1-rollup-contract.test.cjs passed");
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run: `node scripts/stats-phase1-rollup-contract.test.cjs`

Expected: FAIL with `expected the phase-1 stats migration to exist`.

- [ ] **Step 3: Patch the RPC payloads and type them**

```sql
-- supabase/migrations/20260527143000_moonrakers_phase1_additional_stats_turn_order.sql
-- add these CTEs inside the existing WITH block of public.get_stats_screen(profile_id uuid)
form_closing as (
  select jsonb_build_object(
    'summary', 'Trend and closing reads published from Supabase.',
    'items', jsonb_build_array(
      jsonb_build_object('key', 'recentFormDelta', 'metricKey', 'recentFormDelta', 'label', 'Recent Form Delta', 'value', recent_form_delta),
      jsonb_build_object('key', 'leadConversion', 'metricKey', 'leadConversion', 'label', 'Lead Conversion', 'value', lead_conversion),
      jsonb_build_object('key', 'lateLeadConversion', 'metricKey', 'lateLeadConversion', 'label', 'Late Lead Conversion', 'value', late_lead_conversion)
    )
  ) as payload
),
pressure_context as (
  select jsonb_build_array(
    jsonb_build_object('key', 'pressureReliability', 'metricKey', 'pressureReliability', 'label', 'Pressure Reliability', 'value', pressure_reliability),
    jsonb_build_object('key', 'avgPrestigeMarginPerGame', 'metricKey', 'avgPrestigeMarginPerGame', 'label', 'Average Prestige Margin / Game', 'value', avg_prestige_margin_per_game),
    jsonb_build_object('key', 'turnOrderWinCorrelation', 'metricKey', 'turnOrderWinCorrelation', 'label', 'Seat to Win Correlation', 'value', seat_to_win_correlation)
  ) as items
),
playstyle_support_context as (
  select jsonb_build_object(
    'key', 'assistGapToLeader',
    'metricKey', 'assistGapToLeader',
    'label', 'Assist Gap to Leader',
    'value', assist_gap_to_leader
  ) as highlight
),
turn_order_overview as (
  select jsonb_agg(
    jsonb_build_object(
      'seat', seat,
      'label', seat_label,
      'games', games,
      'wins', wins,
      'winRate', win_rate,
      'avgPrestige', avg_prestige,
      'avgScore', avg_score
    )
    order by seat
  ) as rows
  from seat_summary
),
turn_order_by_table_size as (
  select jsonb_agg(
    jsonb_build_object(
      'playerCount', player_count,
      'rows', rows
    )
    order by player_count
  ) as groups
  from seat_summary_by_size
);

-- append this inside the existing overview object body
'formClosing', (select payload from form_closing)

-- replace the existing detail assignment inside the players object with this version
'detail', jsonb_set(player_detail, '{pressureContext}', (select items from pressure_context), true)

-- append these keys inside the existing games object body
'turnOrderOverview', coalesce((select rows from turn_order_overview), '[]'::jsonb),
'turnOrderByTableSize', coalesce((select groups from turn_order_by_table_size), '[]'::jsonb)

-- prepend the support-context highlight to the existing playstyle highlights array
'highlights', jsonb_build_array((select highlight from playstyle_support_context)) || coalesce(playstyle_highlights, '[]'::jsonb)

-- append these keys inside the existing correlations object body in public.get_insights_screen(profile_id uuid)
'macro', jsonb_build_array(
  jsonb_build_object('key', 'lateLeadConversion', 'label', 'Late Lead Conversion', 'value', late_lead_conversion_corr),
  jsonb_build_object('key', 'tempoControl', 'label', 'Tempo Control', 'value', tempo_control_corr),
  jsonb_build_object('key', 'turnOrderWinCorrelation', 'label', 'Seat to Win Correlation', 'value', seat_to_win_corr),
  jsonb_build_object('key', 'interactionIndex', 'label', 'Interaction Index', 'value', interaction_index_corr)
),
'turnOrderSummary', jsonb_build_object(
  'direction', seat_bias_direction,
  'summary', seat_bias_summary,
  'correlation', seat_bias_correlation,
  'sampleGames', seat_bias_games
)
```

```ts
// lib/cloud/analytics/types.ts
export type AnalyticsTurnOrderRow = {
  seat: number;
  label: string;
  games: number;
  wins: number;
  winRate: number;
  avgPrestige: number;
  avgScore: number;
};

export type AnalyticsTurnOrderGroup = {
  playerCount: number;
  rows: AnalyticsTurnOrderRow[];
};

export type AnalyticsMetricCluster = {
  summary?: string | null;
  items: AnalyticsMetricCard[];
};

export type AnalyticsTurnOrderSummary = {
  direction: "earlier" | "later" | "neutral" | "insufficient";
  summary: string;
  correlation: number | null;
  sampleGames: number;
};

export type StatsScreenPayload = {
  generatedAt: string;
  overview: {
    hero: { players: number; games: number; takeaway: string };
    cards: AnalyticsMetricCard[];
    topSignals: AnalyticsTopSignal[];
    formClosing?: AnalyticsMetricCluster | null;
    halftimeProfile?: Record<string, unknown>;
    playerCountSplit?: Record<string, unknown>[];
  };
  players: {
    options: AnalyticsPlayerOption[];
    selectedPlayerId: string | null;
    detail: (Record<string, unknown> & {
      pressureContext?: AnalyticsMetricCard[] | null;
    }) | null;
  };
  playstyle: Record<string, unknown>;
  correlations: Record<string, unknown>;
  games: {
    summary?: string | null;
    items?: Record<string, unknown>[];
    turnOrderOverview?: AnalyticsTurnOrderRow[];
    turnOrderByTableSize?: AnalyticsTurnOrderGroup[];
  };
  contractEfficiency?: Record<string, unknown>;
  groupMeta?: Record<string, unknown>;
  headToHead?: Record<string, unknown>[];
};

export type InsightsScreenPayload = {
  generatedAt: string;
  meta: { games: number };
  cards: AnalyticsMetricCard[];
  topSignals: AnalyticsTopSignal[];
  relationships: Record<string, unknown>;
  correlations: Record<string, unknown> & {
    turnOrderSummary?: AnalyticsTurnOrderSummary | null;
  };
};
```

- [ ] **Step 4: Re-run the contract test**

Run: `node scripts/stats-phase1-rollup-contract.test.cjs`

Expected: PASS with `stats-phase1-rollup-contract.test.cjs passed`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260527143000_moonrakers_phase1_additional_stats_turn_order.sql scripts/stats-phase1-rollup-contract.test.cjs lib/cloud/analytics/types.ts
git commit -m "feat: publish phase 1 additional stats payload"
```

### Task 2: Normalize Turn-Order Payload Rows

**Files:**
- Modify: `lib/cloud/analytics/statsScreenDisplay.ts`
- Modify: `scripts/stats-screen-server-rows.test.ts`

- [ ] **Step 1: Extend the failing row-normalizer test**

```ts
import {
  normalizeStatsCorrelationRows,
  normalizeStatsGameRows,
  normalizeStatsTurnOrderGroups,
  normalizeStatsTurnOrderRows,
} from "../lib/cloud/analytics/statsScreenDisplay.ts";

const turnOrderRows = normalizeStatsTurnOrderRows([
  {
    seat: 0,
    label: "Seat 1",
    games: 8,
    wins: 3,
    winRate: 0.375,
    avgPrestige: 27.4,
    avgScore: 31.1,
  },
]);

assert.deepEqual(turnOrderRows, [
  {
    key: "seat-0",
    label: "Seat 1",
    value: "37.5% win rate",
    detail: "8 games | 3 wins | 27.4 avg prestige | 31.1 avg score",
  },
]);

const turnOrderGroups = normalizeStatsTurnOrderGroups([
  {
    playerCount: 4,
    rows: [{ seat: 1, label: "Seat 2", games: 5, wins: 2, winRate: 0.4, avgPrestige: 24, avgScore: 28 }],
  },
]);

assert.deepEqual(turnOrderGroups, [
  {
    key: "table-size-4",
    label: "4 players",
    rows: [
      {
        key: "seat-1",
        label: "Seat 2",
        value: "40% win rate",
        detail: "5 games | 2 wins | 24 avg prestige | 28 avg score",
      },
    ],
  },
]);
```

- [ ] **Step 2: Run the row-normalizer test to verify it fails**

Run: `node --experimental-strip-types scripts/stats-screen-server-rows.test.ts`

Expected: FAIL with `normalizeStatsTurnOrderRows is not a function` or an equivalent missing-export error.

- [ ] **Step 3: Add the new turn-order normalizers**

```ts
// lib/cloud/analytics/statsScreenDisplay.ts
export type StatsDisplayGroup = {
  key: string;
  label: string;
  rows: StatsDisplayRow[];
};

function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function normalizeStatsTurnOrderRows(value: unknown): StatsDisplayRow[] {
  return toArray(value).map((entry, index) => {
    const seat = toNumberValue(entry.seat) ?? index;
    const games = toNumberValue(entry.games) ?? 0;
    const wins = toNumberValue(entry.wins) ?? 0;
    const winRate = toNumberValue(entry.winRate) ?? 0;
    const avgPrestige = toNumberValue(entry.avgPrestige);
    const avgScore = toNumberValue(entry.avgScore);

    return {
      key: `seat-${seat}`,
      label: toStringValue(entry.label) || `Seat ${seat + 1}`,
      value: `${formatPercent(winRate)} win rate`,
      detail: joinParts([
        `${formatNumber(games)} ${pluralize(games, "game")}`,
        `${formatNumber(wins)} ${pluralize(wins, "win")}`,
        avgPrestige !== null ? `${formatNumber(avgPrestige)} avg prestige` : null,
        avgScore !== null ? `${formatNumber(avgScore)} avg score` : null,
      ]),
    };
  });
}

export function normalizeStatsTurnOrderGroups(value: unknown): StatsDisplayGroup[] {
  return toArray(value).map((entry, index) => {
    const playerCount = toNumberValue(entry.playerCount) ?? 0;
    return {
      key: `table-size-${playerCount || index + 1}`,
      label: playerCount > 0 ? `${formatNumber(playerCount)} players` : `Group ${index + 1}`,
      rows: normalizeStatsTurnOrderRows(entry.rows),
    };
  });
}
```

- [ ] **Step 4: Re-run the row-normalizer test**

Run: `node --experimental-strip-types scripts/stats-screen-server-rows.test.ts`

Expected: PASS with `stats-screen-server-rows.test.ts passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/cloud/analytics/statsScreenDisplay.ts scripts/stats-screen-server-rows.test.ts
git commit -m "feat: normalize turn-order stats rows"
```

### Task 3: Render The New Stats Sections

**Files:**
- Create: `components/stats/TurnOrderSummarySection.tsx`
- Create: `scripts/stats-phase1-sections.test.cjs`
- Modify: `app/stats.tsx`

- [ ] **Step 1: Write the failing Stats screen structure test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const statsSource = fs.readFileSync(
  path.join(__dirname, "..", "app", "stats.tsx"),
  "utf8",
);

assert.match(statsSource, /Form & Closing/);
assert.match(statsSource, /Pressure & Context/);
assert.match(statsSource, /Support Context/);
assert.match(statsSource, /TurnOrderSummarySection/);
assert.match(statsSource, /turnOrderOverview/);
assert.match(statsSource, /turnOrderByTableSize/);

console.log("stats-phase1-sections.test.cjs passed");
```

- [ ] **Step 2: Run the Stats structure test to verify it fails**

Run: `node scripts/stats-phase1-sections.test.cjs`

Expected: FAIL on the first missing section title or component reference.

- [ ] **Step 3: Implement the new Stats sections**

```tsx
// components/stats/TurnOrderSummarySection.tsx
import React from "react";
import { StyleSheet, View } from "react-native";

import DefinitionTermText from "@/components/ui/DefinitionTermText";
import DefinitionsJumpLink from "@/components/ui/DefinitionsJumpLink";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import type { StatsDisplayGroup, StatsDisplayRow } from "@/lib/cloud/analytics/statsScreenDisplay";

type Props = {
  title: string;
  metric: string;
  rows: StatsDisplayRow[];
  groups?: StatsDisplayGroup[];
};

export default function TurnOrderSummarySection({
  title,
  metric,
  rows,
  groups = [],
}: Props) {
  return (
    <SectionCard>
      <View style={styles.header}>
        <DefinitionTermText label={title} metric={metric} style={styles.title} />
        <DefinitionsJumpLink category="turnorder" />
      </View>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <DefinitionTermText label={row.label} category="turnorder" style={styles.label} />
          <Text style={styles.value}>{row.value}</Text>
          {row.detail ? <Text style={styles.detail}>{row.detail}</Text> : null}
        </View>
      ))}
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <DefinitionTermText label={group.label} metric="turnOrderByTableSize" style={styles.groupTitle} />
          {group.rows.map((row) => (
            <View key={`${group.key}-${row.key}`} style={styles.row}>
              <DefinitionTermText label={row.label} category="turnorder" style={styles.label} />
              <Text style={styles.value}>{row.value}</Text>
              {row.detail ? <Text style={styles.detail}>{row.detail}</Text> : null}
            </View>
          ))}
        </View>
      ))}
    </SectionCard>
  );
}
```

```tsx
// app/stats.tsx
import TurnOrderSummarySection from "@/components/stats/TurnOrderSummarySection";
import {
  normalizeStatsCorrelationRows,
  normalizeStatsGameRows,
  normalizeStatsTurnOrderGroups,
  normalizeStatsTurnOrderRows,
} from "@/lib/cloud/analytics/statsScreenDisplay";

const formClosingSection = toRecord(overview.formClosing);
const formClosingCards = toArray(formClosingSection.items);
const pressureContextCards = toArray(selectedPlayerDetail.pressureContext);
const supportContextHighlight =
  playstyleHighlights.find((entry) =>
    ["assistGapToLeader", "assistGapToTarget", "assistsOverFiveBehindLeader"].includes(
      toStringValue(entry.metricKey, toStringValue(entry.key)),
    ),
  ) ?? null;
const turnOrderOverviewRows = normalizeStatsTurnOrderRows(gamesSection.turnOrderOverview);
const turnOrderByTableSizeGroups = normalizeStatsTurnOrderGroups(gamesSection.turnOrderByTableSize);

{formClosingCards.length > 0 ? (
  <View style={styles.metricSubsection}>
    <Text style={styles.metricSubsectionTitle}>Form & Closing</Text>
    <View style={styles.compactGrid}>
      {formClosingCards.map((entry, index) => (
        <StatPill
          key={toStringValue(entry.key, `form-closing-${index}`)}
          label={toStringValue(entry.label, "Signal")}
          metric={toStringValue(entry.metricKey, toStringValue(entry.key))}
          value={toDisplayValue(entry.value)}
          accent={toStringValue(entry.accent) || undefined}
        />
      ))}
    </View>
  </View>
) : null}

{pressureContextCards.length > 0 ? (
  <SectionCard>
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>Pressure & Context</Text>
      <DefinitionsJumpLink category="pressure" />
    </View>
    <View style={styles.compactGrid}>
      {pressureContextCards.map((entry, index) => (
        <StatPill
          key={toStringValue(entry.key, `pressure-context-${index}`)}
          label={toStringValue(entry.label, "Context")}
          metric={toStringValue(entry.metricKey, toStringValue(entry.key))}
          value={toDisplayValue(entry.value)}
          accent={toStringValue(entry.accent) || undefined}
        />
      ))}
    </View>
  </SectionCard>
) : null}

{supportContextHighlight ? (
  <SectionCard>
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>Support Context</Text>
      <DefinitionsJumpLink category="support" />
    </View>
    <StatPill
      label={toStringValue(supportContextHighlight.label, "Support Context")}
      metric={toStringValue(
        supportContextHighlight.metricKey,
        toStringValue(supportContextHighlight.key),
      )}
      value={toDisplayValue(supportContextHighlight.value)}
      accent={toStringValue(supportContextHighlight.accent) || undefined}
    />
  </SectionCard>
) : null}

{turnOrderOverviewRows.length > 0 ? (
  <TurnOrderSummarySection
    title="Turn Order Overview"
    metric="turnOrderOverview"
    rows={turnOrderOverviewRows}
    groups={turnOrderByTableSizeGroups}
  />
) : null}
```

- [ ] **Step 4: Re-run the Stats structure test**

Run: `node scripts/stats-phase1-sections.test.cjs`

Expected: PASS with `stats-phase1-sections.test.cjs passed`.

- [ ] **Step 5: Commit**

```bash
git add components/stats/TurnOrderSummarySection.tsx app/stats.tsx scripts/stats-phase1-sections.test.cjs
git commit -m "feat: add phase 1 stats sections"
```

### Task 4: Add Macro Turn-Order Interpretation To Insights

**Files:**
- Modify: `utils/insightSummaries.ts`
- Modify: `app/insights.tsx`
- Modify: `scripts/insights-summary-statements.test.cjs`

- [ ] **Step 1: Extend the failing insights summary test**

```js
const macroStatements = buildInsightSummaryStatements({
  tab: "macroCorrelations",
  selectedPlayerLabel: "Fochizzy",
  metaGames: 7,
  personalRows: [],
  pairingRows: [],
  macroRows: [
    { label: "Late Lead Conversion", value: 0.51 },
    { label: "Tempo Control", value: 0.33 },
    { label: "Interaction Index", value: -0.18 },
  ],
  synergyPairs: [],
  players: [],
  turnOrderSummary: {
    direction: "later",
    summary: "Later seats trend better.",
    correlation: 0.28,
    sampleGames: 7,
  },
});

assert.match(
  macroStatements.join("\n"),
  /Later seats trend better|7 seat-tracked games|0\.51/i,
  "expected macro summaries to include the published turn-order read and a featured macro factor"
);
```

- [ ] **Step 2: Run the insights summary test to verify it fails**

Run: `node scripts/insights-summary-statements.test.cjs`

Expected: FAIL because `turnOrderSummary` is ignored by the current summary builder.

- [ ] **Step 3: Implement the shared summary change and pass the new payload through**

```ts
// utils/insightSummaries.ts
type PublishedTurnOrderSummary = {
  direction?: "earlier" | "later" | "neutral" | "insufficient";
  summary?: string | null;
  correlation?: number | null;
  sampleGames?: number | null;
};

type BuildInsightSummaryStatementsInput = {
  tab: InsightSummaryTab;
  selectedPlayerLabel: string | null;
  metaGames: number;
  personalRows: InsightSummaryRow[];
  pairingRows: InsightSummaryRow[];
  macroRows: InsightSummaryRow[];
  synergyPairs: InsightSummaryPair[];
  players: InsightSummaryPlayer[];
  turnOrderSummary?: PublishedTurnOrderSummary | null;
};

function buildSeatRead(summary?: PublishedTurnOrderSummary | null) {
  if (!summary?.summary) {
    return null;
  }

  const trackedGames = Math.max(0, Number(summary.sampleGames ?? 0));
  const trackedLabel = trackedGames > 0 ? ` across ${trackedGames} seat-tracked games` : "";
  return `${summary.summary}${trackedLabel}.`;
}

if (tab === "macroCorrelations") {
  const strongestRow = findStrongestRow(macroRows);
  const seatRead = buildSeatRead(turnOrderSummary);

  return [
    "Reading tablewide win patterns.",
    publishedGamesLabel,
    `${toCountLabel(macroRows.length, "macro factor")} live.`,
    seatRead && strongestRow
      ? `Seat read: ${seatRead} Strongest factor: ${strongestRow.label || "Macro factor"} at ${formatSigned(toFiniteNumber(strongestRow.value))}.`
      : strongestRow
        ? `Top read: ${strongestRow.label || "Macro factor"} at ${formatSigned(toFiniteNumber(strongestRow.value))}.`
        : seatRead
          ? `Seat read: ${seatRead}`
          : "No macro correlation signals are published yet.",
  ];
}
```

```tsx
// app/insights.tsx
const turnOrderSummary = toRecord(correlationPayload.turnOrderSummary);
const FEATURED_MACRO_LABELS = new Set([
  "Late Lead Conversion",
  "Tempo Control",
  "Seat to Win Correlation",
  "Interaction Index",
]);
const orderedMacroRows = [...summaryMacroRows].sort((left, right) => {
  const leftFeatured = FEATURED_MACRO_LABELS.has(toStringValue(left.label));
  const rightFeatured = FEATURED_MACRO_LABELS.has(toStringValue(right.label));
  return Number(rightFeatured) - Number(leftFeatured);
});

const summaryStatements = useMemo(
  () =>
    buildInsightSummaryStatements({
      tab: activeSectionTab,
      selectedPlayerLabel: selectedPlayer?.label ?? null,
      metaGames: toFiniteNumber(metaPayload.games),
      personalRows: summaryPersonalRows,
      pairingRows: summaryPairingRows,
      macroRows: orderedMacroRows,
      synergyPairs: summarySynergyPairs,
      players: analyticsDirectory.players,
      turnOrderSummary: {
        direction: toStringValue(turnOrderSummary.direction) as any,
        summary: toStringValue(turnOrderSummary.summary) || null,
        correlation: toFiniteNumber(turnOrderSummary.correlation),
        sampleGames: toFiniteNumber(turnOrderSummary.sampleGames),
      },
    }),
  [activeSectionTab, selectedPlayer, metaPayload.games, summaryPersonalRows, summaryPairingRows, orderedMacroRows, summarySynergyPairs, analyticsDirectory.players, turnOrderSummary],
);

{activeSectionTab === "macroCorrelations" ? (
  <DefinitionsJumpLink metric="turnOrderWinCorrelation" />
) : null}
```

- [ ] **Step 4: Re-run the insights summary test**

Run: `node scripts/insights-summary-statements.test.cjs`

Expected: PASS with `insights-summary-statements.test.cjs passed`.

- [ ] **Step 5: Commit**

```bash
git add utils/insightSummaries.ts app/insights.tsx scripts/insights-summary-statements.test.cjs
git commit -m "feat: add turn-order insight summaries"
```

### Task 5: Expose Phase-1 Metrics In Supported Charts Only

**Files:**
- Create: `scripts/chart-phase1-metric-options.test.cjs`
- Modify: `utils/charts.ts`
- Modify: `components/charts/BarChart/BarChart.tsx`
- Modify: `components/charts/Heatmap.tsx`

- [ ] **Step 1: Write the failing chart metric test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    mod._compile(outputText, filename);
  };
}

const { getSupportedMetricKeysForChart } = require("../utils/charts.ts");

assert.ok(getSupportedMetricKeysForChart("bar").includes("recentFormDelta"));
assert.ok(getSupportedMetricKeysForChart("bar").includes("turnOrderWinCorrelation"));
assert.ok(getSupportedMetricKeysForChart("heatmap").includes("lateLeadConversion"));
assert.ok(!getSupportedMetricKeysForChart("line_chart").includes("turnOrderWinCorrelation"));

const barSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "BarChart", "BarChart.tsx"),
  "utf8",
);
const heatmapSource = fs.readFileSync(
  path.join(__dirname, "..", "components", "charts", "Heatmap.tsx"),
  "utf8",
);

assert.match(barSource, /case "turnOrderWinCorrelation":/);
assert.match(heatmapSource, /case "turnOrderWinCorrelation":/);

console.log("chart-phase1-metric-options.test.cjs passed");
```

- [ ] **Step 2: Run the chart metric test to verify it fails**

Run: `node scripts/chart-phase1-metric-options.test.cjs`

Expected: FAIL because `turnOrderWinCorrelation` is not yet allowed or rendered on the supported aggregate charts.

- [ ] **Step 3: Add a scoped chart allowlist and render the new seat-correlation metric**

```ts
// utils/charts.ts
export type SimpleMetricKey =
  | "score"
  | "totalPrestige"
  | "prestige"
  | "directPrestige"
  | "assistPrestigeReceived"
  | "objectivePrestige"
  | "assists"
  | "contracts"
  | "failures"
  | "turns"
  | "efficiency"
  | "assistEfficiency"
  | "directEfficiency"
  | "contractSuccessRate"
  | "netPrestige"
  | "supportBalance"
  | "avgStartSeat"
  | "turnOrderWinCorrelation"
  | "recentFormDelta"
  | "leadConversion"
  | "lateLeadConversion";

const CORE_METRIC_OPTIONS: SimpleMetricKey[] = [
  "score",
  "totalPrestige",
  "prestige",
  "directPrestige",
  "assistPrestigeReceived",
  "objectivePrestige",
  "assists",
  "contracts",
  "failures",
  "turns",
  "efficiency",
  "assistEfficiency",
  "directEfficiency",
  "contractSuccessRate",
  "netPrestige",
  "supportBalance",
];

const PHASE_ONE_AGGREGATE_METRICS: SimpleMetricKey[] = [
  "avgStartSeat",
  "turnOrderWinCorrelation",
  "recentFormDelta",
  "leadConversion",
  "lateLeadConversion",
];

export function getSupportedMetricKeysForChart(chartKey?: string | null): SimpleMetricKey[] {
  const normalized = normalizeChartKey(chartKey);

  if (REPLAY_CHART_KEYS.has(normalized)) {
    return ["totalPrestige", "directPrestige", "assistPrestigeReceived", "assists", "contracts", "failures"];
  }

  if (STACKED_METRIC_CHART_KEYS.has(normalized)) {
    return ["totalPrestige", "score", "contracts", "assists", "failures"];
  }

  if (normalized === "bar" || normalized === "bar_chart" || normalized === "heatmap") {
    return [...CORE_METRIC_OPTIONS, ...PHASE_ONE_AGGREGATE_METRICS];
  }

  if (FULL_METRIC_CHART_KEYS.has(normalized)) {
    return [...CORE_METRIC_OPTIONS];
  }

  return [];
}

export const METRIC_OPTIONS: SimpleMetricKey[] = [...CORE_METRIC_OPTIONS];
```

```tsx
// components/charts/BarChart/BarChart.tsx
const turnOrderWinCorrelation =
  asNumber(record.turnOrderWinCorrelation) ??
  asNumber(record.headToHeadEdge) ??
  0;

switch (metricKey) {
  case "turnOrderWinCorrelation":
    return turnOrderWinCorrelation;
  case "lateLeadConversion":
    return lateLeadConversion;
}
```

```tsx
// components/charts/Heatmap.tsx
case "turnOrderWinCorrelation":
  return n(record?.turnOrderWinCorrelation) || n(record?.headToHeadEdge);
```

- [ ] **Step 4: Re-run the chart metric test**

Run: `node scripts/chart-phase1-metric-options.test.cjs`

Expected: PASS with `chart-phase1-metric-options.test.cjs passed`.

- [ ] **Step 5: Commit**

```bash
git add utils/charts.ts components/charts/BarChart/BarChart.tsx components/charts/Heatmap.tsx scripts/chart-phase1-metric-options.test.cjs
git commit -m "feat: expose phase 1 chart metrics"
```

### Task 6: Add Glossary Entries And Definition Links For New Terms

**Files:**
- Modify: `utils/definitionCatalog.ts`
- Modify: `utils/definitionTargets.ts`
- Modify: `components/stats/TurnOrderSummarySection.tsx`
- Modify: `app/stats.tsx`
- Modify: `app/insights.tsx`
- Modify: `scripts/definitions-glossary-coverage.test.cjs`
- Modify: `scripts/definition-term-surface-links.test.cjs`
- Modify: `scripts/metric-help-links-and-insights-actions.test.cjs`

- [ ] **Step 1: Extend the failing glossary and link tests**

```js
// scripts/definitions-glossary-coverage.test.cjs
for (const snippet of [
  'key: "turnorder"',
  'title: "Turn Order"',
  'key: "turnOrderOverview"',
  'title: "Turn Order Overview"',
  'key: "turnOrderByTableSize"',
  'title: "By Table Size"',
  'key: "seatWinRate"',
  'title: "Seat Win Rate"',
  'key: "seatAvgPrestige"',
  'title: "Seat Average Prestige"',
  'key: "seatAvgScore"',
  'title: "Seat Average Score"',
]) {
  assert.ok(catalogSource.includes(snippet));
}
```

```js
// scripts/definition-term-surface-links.test.cjs
assert.match(
  resolverSource,
  /"turn order overview": "turnOrderOverview"/,
  "expected definition target aliases to normalize turn-order overview labels",
);

assert.match(
  chartsSource,
  /DefinitionsJumpLink/,
  "expected chart setup to keep using shared definition target plumbing",
);
```

```js
// scripts/metric-help-links-and-insights-actions.test.cjs
assert.match(
  statsSource,
  /<DefinitionsJumpLink[\s\S]*category="turnorder"/s,
  "expected Stats turn-order sections to expose a Turn Order glossary jump-out",
);

assert.match(
  insightsSource,
  /<DefinitionsJumpLink[\s\S]*metric="turnOrderWinCorrelation"/s,
  "expected Insights macro correlations to expose the seat-to-win definition target",
);
```

- [ ] **Step 2: Run the glossary/link tests to verify they fail**

Run: `node scripts/definitions-glossary-coverage.test.cjs`

Expected: FAIL with `expected definitionCatalog.ts to contain key: "turnorder"`.

Run: `node scripts/definition-term-surface-links.test.cjs`

Expected: FAIL on the missing turn-order alias assertion.

Run: `node scripts/metric-help-links-and-insights-actions.test.cjs`

Expected: FAIL on the missing `turnorder` or `turnOrderWinCorrelation` link target.

- [ ] **Step 3: Add the new glossary group, aliases, and surface links**

```ts
// utils/definitionCatalog.ts
{
  key: "turnorder",
  title: "Turn Order",
  subtitle: "How seat position and table size shape the sample.",
  items: [
    {
      key: "turnOrderOverview",
      title: "Turn Order Overview",
      body: "A seat-by-seat summary of games, wins, win rate, and average output across the current tracked sample.",
    },
    {
      key: "turnOrderByTableSize",
      title: "By Table Size",
      body: "The same seat summary split by player count so three-, four-, and five-player tables can be compared cleanly.",
    },
    {
      key: "seatWinRate",
      title: "Seat Win Rate",
      body: "How often a specific starting seat converts appearances into wins.",
    },
    {
      key: "seatAvgPrestige",
      title: "Seat Average Prestige",
      body: "Average prestige generated by players starting from the same seat.",
    },
    {
      key: "seatAvgScore",
      title: "Seat Average Score",
      body: "Average total score generated by players starting from the same seat.",
    },
  ],
},
```

```ts
// utils/definitionTargets.ts
const DEFINITION_CATEGORY_KEYS = new Set([
  "scoring",
  "efficiency",
  "support",
  "pressure",
  "momentum",
  "turnorder",
  "projection",
  "elo",
  "correlations",
  "intel",
]);

const DEFINITION_CATEGORY_LABEL_ALIASES: Record<string, string> = {
  "turn order": "turnorder",
};

const DEFINITION_METRIC_KEYS = new Set([
  "turnOrderOverview",
  "turnOrderByTableSize",
  "seatWinRate",
  "seatAvgPrestige",
  "seatAvgScore",
]);

const DEFINITION_LABEL_ALIASES: Record<string, string> = {
  "turn order overview": "turnOrderOverview",
  "by table size": "turnOrderByTableSize",
  "seat win rate": "seatWinRate",
  "seat average prestige": "seatAvgPrestige",
  "seat average score": "seatAvgScore",
};
```

```tsx
// components/stats/TurnOrderSummarySection.tsx
<DefinitionTermText label="Turn Order Overview" metric="turnOrderOverview" style={styles.title} />
<DefinitionTermText label="By Table Size" metric="turnOrderByTableSize" style={styles.groupTitle} />
<DefinitionsJumpLink category="turnorder" />
```

```tsx
// app/stats.tsx
<DefinitionsJumpLink category="turnorder" />
```

```tsx
// app/insights.tsx
{activeSectionTab === "macroCorrelations" ? (
  <DefinitionsJumpLink metric="turnOrderWinCorrelation" />
) : null}
```

- [ ] **Step 4: Re-run the glossary and link tests**

Run: `node scripts/definitions-glossary-coverage.test.cjs`

Expected: PASS with `definitions-glossary-coverage.test.cjs passed`.

Run: `node scripts/definition-term-surface-links.test.cjs`

Expected: PASS with `definition-term-surface-links.test.cjs passed`.

Run: `node scripts/metric-help-links-and-insights-actions.test.cjs`

Expected: PASS with `metric-help-links-and-insights-actions.test.cjs passed`.

- [ ] **Step 5: Commit**

```bash
git add utils/definitionCatalog.ts utils/definitionTargets.ts components/stats/TurnOrderSummarySection.tsx app/stats.tsx app/insights.tsx scripts/definitions-glossary-coverage.test.cjs scripts/definition-term-surface-links.test.cjs scripts/metric-help-links-and-insights-actions.test.cjs
git commit -m "feat: add glossary coverage for turn-order stats"
```

### Task 7: Run The Final Verification Pass

**Files:**
- Test: `scripts/stats-phase1-rollup-contract.test.cjs`
- Test: `scripts/stats-screen-server-rows.test.ts`
- Test: `scripts/stats-phase1-sections.test.cjs`
- Test: `scripts/insights-summary-statements.test.cjs`
- Test: `scripts/chart-phase1-metric-options.test.cjs`
- Test: `scripts/definitions-glossary-coverage.test.cjs`
- Test: `scripts/definition-term-surface-links.test.cjs`
- Test: `scripts/metric-help-links-and-insights-actions.test.cjs`

- [ ] **Step 1: Run the focused regression tests**

Run:

```bash
node scripts/stats-phase1-rollup-contract.test.cjs
node --experimental-strip-types scripts/stats-screen-server-rows.test.ts
node scripts/stats-phase1-sections.test.cjs
node scripts/insights-summary-statements.test.cjs
node scripts/chart-phase1-metric-options.test.cjs
node scripts/definitions-glossary-coverage.test.cjs
node scripts/definition-term-surface-links.test.cjs
node scripts/metric-help-links-and-insights-actions.test.cjs
```

Expected: every script prints `passed`.

- [ ] **Step 2: Run the typecheck**

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Create the finishing commit**

```bash
git add app/stats.tsx app/insights.tsx components/stats/TurnOrderSummarySection.tsx components/charts/BarChart/BarChart.tsx components/charts/Heatmap.tsx lib/cloud/analytics/types.ts lib/cloud/analytics/statsScreenDisplay.ts utils/insightSummaries.ts utils/charts.ts utils/definitionCatalog.ts utils/definitionTargets.ts supabase/migrations/20260527143000_moonrakers_phase1_additional_stats_turn_order.sql scripts/stats-phase1-rollup-contract.test.cjs scripts/stats-screen-server-rows.test.ts scripts/stats-phase1-sections.test.cjs scripts/insights-summary-statements.test.cjs scripts/chart-phase1-metric-options.test.cjs scripts/definitions-glossary-coverage.test.cjs scripts/definition-term-surface-links.test.cjs scripts/metric-help-links-and-insights-actions.test.cjs
git commit -m "feat: ship phase 1 additional statistics"
```
