# Moonrakers Assist Network Frequency Impact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the profile Assist Network into an exact-table, frequency-first chart with source-colored directional arrows, per-game edge labels, and a lower impact section that compares `Total Prestige`, `Winning`, and `Efficiency` against each scoped player's overall baseline.

**Architecture:** Keep the existing `relationship_graph` chart slot and shared charts hub, but remove assist-metric-specific setup and make explicit scope ids the single source of truth for exact table matching. Build the result in three layers: first preserve exact route scope through the hub/detail loop, then enrich the assist-network dataset with frequency and impact calculations, and finally simplify the overview/graph UI so it renders one network story with one lower impact section instead of multiple competing controls.

**Tech Stack:** Expo Router, React Native, TypeScript, shared chart components under `components/charts/`, unified game normalization in `utils/charts.ts`, Node CommonJS regression scripts in `scripts/`.

---

## File Structure

- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\assist-network-data.test.cjs`
  - Add red/green coverage for exact composition filtering, frequency-per-game output, and baseline delta math.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\assist-network-style.test.cjs`
  - Replace the assist-control expectations with frequency-label, no-controls, and impact-section expectations.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\assist-network-routing.test.cjs`
  - Verify the detail route prefers exact scope ids and no longer passes assist-mode plumbing into the Assist Network.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-setup-control-system.test.cjs`
  - Verify the charts setup removes the Assist metric section and preserves an exact `2+` player selection for `relationship_graph`.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\chartHubRouteState.ts`
  - Add a helper that preserves explicit `relationship_graph` scope ids instead of letting generic defaults refill the selection.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
  - Remove assist-mode setup state/plumbing for the Assist Network and keep explicit `2+` player scope ids stable in the setup sheet.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
  - Remove assist-mode route params for the Assist Network and prefer explicit route ids when returning to Adjust/opening detail.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\buildAssistNetworkDataset.ts`
  - Change the dataset from count/prestige-only output to exact-scope-aware frequency output.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\buildAssistNetworkImpact.ts`
  - Compute exact-table versus overall-baseline deltas for `Total Prestige`, `Winning`, and `Efficiency`.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\buildAssistNetworkLayout.ts`
  - Convert the layout builder to frequency-first node and edge values.
- Delete: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkControls.tsx`
  - This file becomes dead once assist-mode switching is removed from the Assist Network.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkOverview.tsx`
  - Remove the control strip, render the exact-scope network, and add the lower impact section.
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkImpactSection.tsx`
  - Render the three exact-table impact cards below the graph.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkDetailsCard.tsx`
  - Update wording from metric-switching language to frequency-first exact-sample language.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\RelationshipGraph.tsx`
  - Remove assist-mode tabs for the Assist Network path, color edges from the source player, size arrows from frequency, render `0.8/game` style labels, and allow the external overview to hide duplicate top readouts.
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\chartCatalog.ts`
  - Update the featured takeaway copy so the hub describes exact-table assist behavior instead of a generic current sample.

Do not modify these unrelated dirty files in this checkout:

- `C:\Users\izzyh\Desktop\moonrakers-app\app\game-setup.tsx`
- `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\PageShell.tsx`
- `C:\Users\izzyh\Desktop\moonrakers-app\components\ui\ScreenBackground.tsx`
- `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-setup-single-surface.test.cjs`
- `C:\Users\izzyh\Desktop\moonrakers-app\scripts\game-setup-turn-order.test.cjs`
- `C:\Users\izzyh\Desktop\moonrakers-app\utils\gameSetupTurnOrder.ts`

### Task 1: Lock The Exact-Scope And Frequency Contracts With Failing Regressions

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\assist-network-data.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\assist-network-style.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\assist-network-routing.test.cjs`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\scripts\chart-setup-control-system.test.cjs`

- [ ] **Step 1: Add failing data tests for exact sample frequency and impact math**

Append a new data case to `scripts/assist-network-data.test.cjs` that expects per-game frequency fields and baseline deltas:

```js
const { buildAssistNetworkImpact } = require(path.join(
  __dirname,
  "..",
  "components",
  "charts",
  "AssistNetworkOverview",
  "buildAssistNetworkImpact.ts"
));

run("buildAssistNetworkDataset derives frequency-per-game from the exact-match sample", () => {
  const dataset = buildAssistNetworkDataset({
    games: [
      {
        id: "james-greg-a",
        players: [{ id: "james" }, { id: "greg" }],
        rounds: [{ playerId: "james", assistRecipients: { greg: 1 }, assistPrestigeRecipients: { greg: 2 } }],
        totals: {},
        timeline: [],
      },
      {
        id: "james-greg-b",
        players: [{ id: "james" }, { id: "greg" }],
        rounds: [],
        totals: {},
        timeline: [],
      },
      {
        id: "james-greg-izzy",
        players: [{ id: "james" }, { id: "greg" }, { id: "izzy" }],
        rounds: [{ playerId: "james", assistRecipients: { greg: 1 }, assistPrestigeRecipients: { greg: 5 } }],
        totals: {},
        timeline: [],
      },
    ],
    scopedPlayerIds: ["james", "greg"],
  });

  assert.equal(dataset.gameCount, 2);
  assert.equal(dataset.edges[0].assistCount, 1);
  assert.equal(dataset.edges[0].assistFrequencyPerGame, 0.5);
  assert.equal(dataset.nodes.find((node) => node.id === "james").involvementFrequencyPerGame, 0.5);
});

run("buildAssistNetworkImpact compares exact-table results against overall baseline", () => {
  const impact = buildAssistNetworkImpact({
    games: exactAndOverallFixtureGames,
    exactScopePlayerIds: ["james", "greg"],
  });

  assert.equal(impact.sampleGameCount, 2);
  assert.equal(impact.cards.totalPrestige.delta > 0, true);
  assert.equal(impact.cards.winning.delta < 0, false);
  assert.equal(Number.isFinite(impact.cards.efficiency.delta), true);
});
```

- [ ] **Step 2: Add failing setup, routing, and UI expectations**

Update the source-level scripts so they fail until the setup and rendering contracts are changed:

```js
assert.doesNotMatch(
  chartSetupSource,
  /title="Assist metric"/,
  "expected the Assist Network setup to drop the Assist metric section"
);

assert.match(
  chartSetupSource,
  /relationship_graph[\s\S]*routeIds\.length \? routeIds : selectedGroupIds/,
  "expected Assist Network setup to prefer explicit route ids when reopening the sheet"
);

assert.match(
  detailSource,
  /<AssistNetworkOverview[\s\S]*exactScopePlayerIds=\{routeIds.length >= 2 \? routeIds : undefined\}/,
  "expected the detail route to preserve explicit exact-scope ids"
);

assert.doesNotMatch(
  detailSource,
  /assistMode=\{routeAssistMode\}/,
  "expected the Assist Network route to stop passing assistMode"
);

assert.doesNotMatch(
  overviewSource,
  /AssistNetworkControls/,
  "expected AssistNetworkOverview to stop rendering the retired assist control strip"
);

assert.match(
  relationshipGraphSource,
  /0\.8\/game|labelText|assistFrequencyPerGame/,
  "expected the graph renderer to move from xN badges to per-game frequency labels"
);

assert.match(
  overviewSource,
  /Total Prestige|Winning|Efficiency/,
  "expected the Assist Network overview to render the three lower impact cards"
);
```

- [ ] **Step 3: Run the focused scripts and verify they fail for the expected reasons**

Run:

```bash
node .\scripts\assist-network-data.test.cjs
node .\scripts\assist-network-style.test.cjs
node .\scripts\assist-network-routing.test.cjs
node .\scripts\chart-setup-control-system.test.cjs
```

Expected:
- `assist-network-data.test.cjs` fails because `assistFrequencyPerGame`, `involvementFrequencyPerGame`, and `buildAssistNetworkImpact` do not exist yet.
- `assist-network-style.test.cjs` fails because the control strip still exists and labels still render as `xN`.
- `assist-network-routing.test.cjs` fails because the detail route still passes `assistMode` and does not preserve `routeIds` directly.
- `chart-setup-control-system.test.cjs` fails because the setup still serializes `assistMode` and still renders the Assist metric section.

- [ ] **Step 4: Commit the red scripts**

```bash
git add scripts/assist-network-data.test.cjs scripts/assist-network-style.test.cjs scripts/assist-network-routing.test.cjs scripts/chart-setup-control-system.test.cjs
git commit -m "test: lock assist network exact-scope frequency contracts"
```

### Task 2: Preserve Exact `2+` Scope Through The Charts Hub And Detail Route

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\utils\chartHubRouteState.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`

- [ ] **Step 1: Add a chart-aware scope helper**

Extend `utils/chartHubRouteState.ts` with a helper that validates route ids but preserves explicit Assist Network scope:

```ts
export function getPreferredScopeIdsForChart({
  chartKey,
  routeIds,
  currentIds,
  players,
}: {
  chartKey: string;
  routeIds: readonly string[];
  currentIds: readonly string[];
  players: readonly PlayerWithId[];
}): string[] | null {
  const validPlayerIds = new Set(players.map((player) => String(player.id)));
  const validRouteIds = routeIds.filter((id) => validPlayerIds.has(String(id)));

  if (chartKey === "relationship_graph" && validRouteIds.length >= 2) {
    return haveSameIds(validRouteIds, currentIds) ? null : validRouteIds;
  }

  if (!validRouteIds.length) return null;
  return haveSameIds(validRouteIds, currentIds) ? null : validRouteIds;
}
```

- [ ] **Step 2: Remove Assist metric state from the charts setup and preserve exact scope ids**

In `app/charts/index.tsx`, remove `selectedAssistMode`, `normalizeAssistMode`, and the `Assist metric` setup block. Replace the route sync with the new helper and keep explicit Assist Network scope ids stable:

```ts
const nextRouteGroupIds = getPreferredScopeIdsForChart({
  chartKey: selectedChartKey,
  routeIds,
  currentIds: selectedGroupIds,
  players: sortedPlayers,
});

if (nextRouteGroupIds) {
  setSelectedGroupIds(nextRouteGroupIds);
}

if (chart.supportsIds && selectedGroupIds.length) {
  params.ids = selectedGroupIds.join(",");
}
```

Also remove:

```ts
if (chart.key === "relationship_graph") {
  params.assistMode = selectedAssistMode;
}
```

- [ ] **Step 3: Update the detail route to prefer explicit ids and drop assist-mode plumbing**

In `app/charts/[chartKey].tsx`, remove `normalizeAssistMode`, the `assistMode` branch in `buildRouteParams`, and the `assistMode` prop passed to `AssistNetworkOverview`. Prefer explicit route ids when reopening setup and when applying exact scope:

```ts
const exactScopePlayerIds = routeIds.length >= 2 ? routeIds : undefined;

router.replace({
  pathname: APP_ROUTES.charts,
  params: {
    ...buildRouteParams({
      chartKey: setupChartKey,
      playerId: selectedPlayer?.id ?? routePlayerId ?? null,
      compareId: comparePlayer?.id ?? routeCompareId ?? null,
      selectedGameId: routeSelectedGameId ?? null,
      ids: routeIds.length ? routeIds : scopedPlayerIds,
      metric: setupMetric,
      mode: routeMode,
      lineMode: isLineModeDriven(chartKey) ? lineMode : null,
    }),
    setup: "true",
  },
} as any);

<AssistNetworkOverview
  games={unifiedGames as any}
  players={resolvedPlayers as any}
  scopedPlayerIds={routeIds.length ? routeIds : scopedPlayerIds}
  exactScopePlayerIds={exactScopePlayerIds}
  mode={routeMode}
  title="Assist Network"
  subtitle="Directed assist flow across the filtered sample."
/>
```

- [ ] **Step 4: Run the setup and routing regressions**

Run:

```bash
node .\scripts\assist-network-routing.test.cjs
node .\scripts\chart-setup-control-system.test.cjs
```

Expected:
- Both scripts pass.
- `assist-network-style.test.cjs` and `assist-network-data.test.cjs` still fail because the frequency/impact code is not implemented yet.

- [ ] **Step 5: Commit the route-contract changes**

```bash
git add utils/chartHubRouteState.ts app/charts/index.tsx app/charts/[chartKey].tsx
git commit -m "feat: preserve exact assist network scope ids"
```

### Task 3: Enrich The Assist Network Dataset With Frequency And Baseline Impact Math

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\buildAssistNetworkDataset.ts`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\buildAssistNetworkImpact.ts`

- [ ] **Step 1: Expand the dataset builder to return frequency-aware edge and node fields**

Update `buildAssistNetworkDataset.ts` so the types include per-game frequency and node involvement frequency:

```ts
export type AssistNetworkDatasetEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  assistCount: number;
  assistPrestige: number;
  assistEfficiency: number;
  assistFrequencyPerGame: number;
};

export type AssistNetworkDatasetNode = {
  id: string;
  incomingCount: number;
  outgoingCount: number;
  incomingPrestige: number;
  outgoingPrestige: number;
  supportBalance: number;
  involvementFrequencyPerGame: number;
};
```

After `includedGames` is finalized, compute:

```ts
const sampleGames = Math.max(includedGames.length, 1);

const nodes = Array.from(nodeMap.values()).map((node) => ({
  ...node,
  supportBalance: node.incomingPrestige - node.outgoingPrestige,
  involvementFrequencyPerGame:
    (node.incomingCount + node.outgoingCount) / sampleGames,
}));

const edges = Array.from(edgeMap.values()).map((edge) => ({
  ...edge,
  assistFrequencyPerGame: edge.assistCount / sampleGames,
}));
```

- [ ] **Step 2: Create the exact-table versus baseline impact helper**

Create `buildAssistNetworkImpact.ts` with one local metric extractor and one exported builder:

```ts
import type { NormalizedGame, PlayerTotals } from "@/utils/charts";

export type AssistNetworkImpactCard = {
  label: "Total Prestige" | "Winning" | "Efficiency";
  sampleValue: number;
  baselineValue: number;
  delta: number;
};

function getTotalsMetrics(totals?: PlayerTotals | null) {
  const totalPrestige =
    Number(totals?.totalPrestige ?? totals?.prestige) ||
    Number(totals?.directPrestige ?? 0) +
      Number(totals?.assistPrestigeReceived ?? 0) +
      Number(totals?.objectivePrestige ?? totals?.objectiveCount ?? 0);

  const turns = Number(totals?.turns ?? totals?.turnCount ?? 0);
  const efficiency =
    Number(totals?.efficiency) || (turns > 0 ? totalPrestige / turns : totalPrestige);

  return { totalPrestige, efficiency };
}

export function buildAssistNetworkImpact({
  games,
  exactScopePlayerIds,
}: {
  games: NormalizedGame[];
  exactScopePlayerIds?: string[];
}) {
  const exactIds = new Set((exactScopePlayerIds ?? []).map(String));
  const exactGames =
    exactIds.size >= 2
      ? games.filter((game) => {
          const participants = new Set(
            (game.players ?? []).map((player) => String(player.id))
          );
          return (
            participants.size === exactIds.size &&
            [...exactIds].every((id) => participants.has(id))
          );
        })
      : games;

  const playerIds = exactIds.size
    ? [...exactIds]
    : Array.from(
        new Set(
          exactGames.flatMap((game) =>
            (game.players ?? []).map((player) => String(player.id))
          )
        )
      );

  const sampleRows = playerIds.map((playerId) =>
    collectPlayerSampleRow(exactGames, playerId)
  );
  const overallRows = playerIds.map((playerId) =>
    collectPlayerSampleRow(games, playerId)
  );

  return buildImpactCards(sampleRows, overallRows, exactGames.length);
}
```

Inside `buildAssistNetworkImpact`, calculate:
- sample win rate from `winnerId ?? selectedWinnerId ?? manualWinnerId`
- sample averages for scoped players in exact-match games
- overall baseline averages for the same players across all unified games
- deltas as `sample - baseline`

Return:

```ts
return {
  sampleGameCount: exactGames.length,
  cards: {
    totalPrestige: { label: "Total Prestige", sampleValue, baselineValue, delta },
    winning: { label: "Winning", sampleValue, baselineValue, delta },
    efficiency: { label: "Efficiency", sampleValue, baselineValue, delta },
  },
};
```

- [ ] **Step 3: Run the data regression and verify it goes green**

Run:

```bash
node .\scripts\assist-network-data.test.cjs
```

Expected:
- PASS for exact two-player and three-player filtering.
- PASS for `assistFrequencyPerGame` and `involvementFrequencyPerGame`.
- PASS for exact-table versus overall-baseline impact deltas.

- [ ] **Step 4: Commit the dataset and impact helper**

```bash
git add components/charts/AssistNetworkOverview/buildAssistNetworkDataset.ts components/charts/AssistNetworkOverview/buildAssistNetworkImpact.ts
git commit -m "feat: add assist network frequency and impact builders"
```

### Task 4: Render One Frequency-First Network Surface With The Lower Impact Section

**Files:**
- Delete: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkControls.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\buildAssistNetworkLayout.ts`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\RelationshipGraph.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkOverview.tsx`
- Create: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkImpactSection.tsx`
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkDetailsCard.tsx`

- [ ] **Step 1: Convert the layout builder from assist-mode switching to frequency-first values**

In `buildAssistNetworkLayout.ts`, remove `AssistNetworkMode` and use the new dataset frequency fields directly:

```ts
export type AssistNetworkNode = {
  id: string;
  label: string;
  value: number;
  involvementFrequencyPerGame: number;
  supportBalance: number;
};

export type AssistNetworkLink = {
  id: string;
  source: string;
  target: string;
  value: number;
  assistCount: number;
  assistFrequencyPerGame: number;
  assistPrestige: number;
  assistEfficiency: number;
  labelText: string;
};

const value = raw.assistFrequencyPerGame;
const labelText = `${raw.assistFrequencyPerGame.toFixed(1)}/game`;
```

- [ ] **Step 2: Remove Assist metric tabs and render source-colored frequency edges**

In `RelationshipGraph.tsx`, delete `ASSIST_MODE_OPTIONS`, `showAssistMetricControl`, and the assist-metric tab section. Add a prop for hiding the duplicate top readout and render frequency labels/intensity from the source player's color:

```ts
type Props = {
  // ...
  showReadoutCards?: boolean;
};

const edgeMax = Math.max(1, ...filteredLinks.map((link) => safeNum(link.assistFrequencyPerGame)));

return {
  // ...
  color: fromNode.colorValue,
  strokeWidth: 2 + (safeNum(link.assistFrequencyPerGame) / edgeMax) * 6,
  opacity: 0.24 + (safeNum(link.assistFrequencyPerGame) / edgeMax) * 0.7,
  arrowSize: 7 + (safeNum(link.assistFrequencyPerGame) / edgeMax) * 5,
  labelText: link.labelText,
};
```

Replace the edge badge:

```tsx
<Rect
  x={safeNum(edgeLabelX - 18)}
  y={safeNum(edgeLabelY - 8)}
  width={36}
  height={16}
  rx={8}
  fill={withChartAlpha("#F8FAFC", active ? 0.9 : 0.74)}
  stroke={withChartAlpha(edge.color, active ? 0.5 : 0.24)}
  strokeWidth={0.9}
/>
<SvgText x={edgeLabelX} y={edgeLabelY + 3} fontSize="8" fill="#0F172A" fontWeight="800" textAnchor="middle">
  {edge.labelText}
</SvgText>
```

- [ ] **Step 3: Replace the overview control strip with the impact section**

Delete `AssistNetworkControls.tsx`, create `AssistNetworkImpactSection.tsx`, and update `AssistNetworkOverview.tsx` to use the new builders:

```tsx
import AssistNetworkImpactSection from "./AssistNetworkImpactSection";
import buildAssistNetworkImpact from "./buildAssistNetworkImpact";

const impact = useMemo(
  () =>
    buildAssistNetworkImpact({
      games: safeGames,
      exactScopePlayerIds,
    }),
  [exactScopePlayerIds, safeGames]
);

return (
  <View style={styles.wrap}>
    <AssistNetworkDetailsCard
      hubName={hubName}
      netGiverName={netGiverName}
      netReceiverName={netReceiverName}
      topLinkLabel={topLinkLabel}
      topLinkValue={topLinkValue}
      story={story}
    />

    <RelationshipGraph
      players={visiblePlayers as any}
      relationships={dataset.edges as any}
      scopedPlayerIds={scopedPlayerIds}
      variant="assist_network"
      mode={mode}
      title={title}
      subtitle={subtitle}
      showReadoutCards={false}
    />

    <AssistNetworkImpactSection cards={impact.cards} sampleGameCount={impact.sampleGameCount} />
  </View>
);
```

Create the impact section as three compact cards:

```tsx
export default function AssistNetworkImpactSection({ cards, sampleGameCount }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{`Table Impact - ${sampleGameCount} exact-match game${sampleGameCount === 1 ? "" : "s"}`}</Text>
      {Object.values(cards).map((card) => (
        <View key={card.label} style={styles.card}>
          <Text style={styles.label}>{card.label}</Text>
          <Text style={styles.value}>{card.sampleValue.toFixed(2)}</Text>
          <Text style={styles.helper}>{`Baseline ${card.baselineValue.toFixed(2)} - Delta ${card.delta >= 0 ? "+" : ""}${card.delta.toFixed(2)}`}</Text>
        </View>
      ))}
    </View>
  );
}
```

Update `AssistNetworkDetailsCard.tsx` helper copy to stay frequency-first:

```tsx
<Text style={styles.helper}>
  {`${topLinkValue} across the exact filtered table`}
</Text>
```

- [ ] **Step 4: Run the Assist Network rendering scripts**

Run:

```bash
node .\scripts\assist-network-style.test.cjs
node .\scripts\assist-network-routing.test.cjs
```

Expected:
- PASS for no AssistNetworkControls import/render.
- PASS for `0.8/game` style labels or equivalent `labelText` source.
- PASS for lower `Total Prestige`, `Winning`, and `Efficiency` section.
- PASS for detail-route exact-scope ids and no `assistMode`.

- [ ] **Step 5: Commit the rendering work**

```bash
git add components/charts/AssistNetworkOverview/buildAssistNetworkLayout.ts components/charts/RelationshipGraph.tsx components/charts/AssistNetworkOverview/AssistNetworkOverview.tsx components/charts/AssistNetworkOverview/AssistNetworkImpactSection.tsx components/charts/AssistNetworkOverview/AssistNetworkDetailsCard.tsx
git rm components/charts/AssistNetworkOverview/AssistNetworkControls.tsx
git commit -m "feat: render assist network as exact-scope frequency view"
```

### Task 5: Finish Copy, Run Verification, And Record Any Typecheck Noise

**Files:**
- Modify: `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\chartCatalog.ts`
- Verify only:
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\index.tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\app\charts\[chartKey].tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\buildAssistNetworkDataset.ts`
  - `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\buildAssistNetworkImpact.ts`
  - `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\AssistNetworkOverview\AssistNetworkOverview.tsx`
  - `C:\Users\izzyh\Desktop\moonrakers-app\components\charts\RelationshipGraph.tsx`

- [ ] **Step 1: Align the chart-catalog summary copy with exact-table behavior**

Update the featured takeaway in `components/charts/chartCatalog.ts`:

```ts
case "relationship_graph":
  return scopedCount >= 2
    ? `See who assists whom when this exact ${scopeText} plays together.`
    : "See who assists whom across the full sample, or narrow to an exact table.";
```

- [ ] **Step 2: Run the full focused verification set**

Run:

```bash
node .\scripts\assist-network-data.test.cjs
node .\scripts\assist-network-style.test.cjs
node .\scripts\assist-network-routing.test.cjs
node .\scripts\chart-setup-control-system.test.cjs
node .\scripts\chart-hub-catalog.test.cjs
```

Expected:
- All five scripts PASS.

- [ ] **Step 3: Run TypeScript once and record only residual unrelated noise**

Run:

```bash
node .\node_modules\typescript\bin\tsc --noEmit --pretty false
```

Expected:
- Either PASS, or only pre-existing unrelated failures outside the Assist Network files.
- If unrelated failures remain, note them explicitly in the execution summary rather than claiming a clean repo-wide typecheck.

- [ ] **Step 4: Commit the final copy and verification-safe adjustments**

```bash
git add components/charts/chartCatalog.ts
git commit -m "chore: finish assist network frequency impact rollout"
```

## Self-Review

- Spec coverage: This plan covers exact-table scope preservation, removal of Assist metric switching, frequency-first node/edge weighting, source-player-colored arrows, per-game edge labels, and the lower `Total Prestige` / `Winning` / `Efficiency` impact section.
- Placeholder scan: No `TODO`, `TBD`, or "handle this later" language remains. Every task lists exact files, concrete assertions or code, concrete commands, and a commit boundary.
- Type consistency: The route contract always uses `routeIds` for exact Assist Network scope, the dataset exposes `assistFrequencyPerGame` and `involvementFrequencyPerGame`, the impact helper consumes `exactScopePlayerIds`, and the renderer uses `labelText` / frequency-based values instead of `assistMode`.

## Execution Handoff

Plan complete and saved to `C:\Users\izzyh\Desktop\moonrakers-app\docs\superpowers\plans\2026-04-26-moonrakers-assist-network-frequency-impact-implementation.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

