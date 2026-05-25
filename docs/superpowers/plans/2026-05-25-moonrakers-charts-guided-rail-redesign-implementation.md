# Moonrakers Charts Guided-Rail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `app/charts/index.tsx` into a lighter guided-rail setup flow with external chart selection, a minimal hero bar, and staged `Scope -> Metric -> Style` setup while preserving existing Supabase setup data and route-param syncing.

**Architecture:** Keep `app/charts/index.tsx` as the orchestration route for chart selection, live setup payloads, and route-param syncing, but move the new staged interaction into small chart-specific helpers. A pure rail-model helper will own stage order, summary text, auto-advance, and invalidation rules so the UI stays declarative and the server-authored setup payload remains the source of truth.

**Tech Stack:** Expo Router, React 19, React Native, TypeScript, source-based `node` regression tests, `npm.cmd run test:ui`, `npm.cmd run typecheck`

---

## File Structure

- Modify: `app/charts/index.tsx`
  - Keep route-param syncing, Supabase `getChartSetup(...)` hydration, player-directory wiring, and chart launching.
  - Replace the current stacked setup body with guided-rail orchestration and a lighter hero shell.
- Create: `components/charts/chartSetupRailModel.ts`
  - Pure chart-setup stage helpers: stage order, completion status, summary builders, next-stage resolution, invalidation.
- Create: `components/charts/ChartSetupHeroBar.tsx`
  - Lightweight sticky hero/heading bar for the charts route with title, takeaway, compact chips, and quiet route actions.
- Create: `components/charts/ChartSetupGuidedRail.tsx`
  - Reusable active/completed/locked stage shell and collapsed-summary treatment for `Scope`, `Metric`, and `Style`.
- Create: `scripts/chart-guided-rail-model.test.cjs`
  - Directly imports the new model helper and locks stage order, summaries, auto-advance, and invalidation.
- Create: `scripts/chart-guided-rail-structure.test.cjs`
  - Locks the new hero-bar and guided-rail component seams so future edits do not slide back to the old full-card stack.
- Create: `scripts/chart-guided-rail-route.test.cjs`
  - Locks `app/charts/index.tsx` integration: staged rail rendering, `Edit Setup` browse CTA, stage-local `Open Chart`, and collapsed step wiring.
- Modify: `scripts/chart-setup-primary-cta.test.cjs`
  - Update expectations so the hero no longer owns the primary `Open Chart` CTA.
- Modify: `scripts/chart-setup-back-pill.test.cjs`
  - Keep the browse/back regression focused on setup exit behavior, but stop assuming the old action layout.
- Modify: `scripts/run-focused-suite.cjs`
  - Add the new chart guided-rail checks to the `ui` suite so `npm.cmd run test:ui` covers this redesign.

### Task 1: Add a Pure Guided-Rail Model

**Files:**
- Create: `components/charts/chartSetupRailModel.ts`
- Create: `scripts/chart-guided-rail-model.test.cjs`

- [ ] **Step 1: Write the failing model test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    request = path.join(projectRoot, request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: filename,
    });

    mod._compile(outputText, filename);
  };
}

const {
  CHART_SETUP_STAGE_ORDER,
  buildScopeStageSummary,
  buildMetricStageSummary,
  buildStyleStageSummary,
  resolveChartSetupRailState,
  resolveNextChartSetupStage,
  invalidateStagesAfter,
} = require("../components/charts/chartSetupRailModel.ts");

assert.deepEqual(
  CHART_SETUP_STAGE_ORDER,
  ["scope", "metric", "style"],
  "expected the guided rail to keep the approved Scope -> Metric -> Style order"
);

assert.equal(
  buildScopeStageSummary({
    focusPlayerLabel: "Nova",
    comparePlayerLabel: "Duke",
    scopedCount: 4,
  }),
  "Nova vs Duke - 4 players",
  "expected scope summaries to read like a compact player story"
);

assert.equal(
  buildMetricStageSummary("Current ELO"),
  "Current ELO",
  "expected metric summaries to pass through the selected metric label"
);

assert.equal(
  buildStyleStageSummary({
    lineModeLabel: null,
    eloViewLabel: "Context",
    opponentLabel: "Duke",
  }),
  "Context - Duke",
  "expected style summaries to include the opponent only when the selected style needs it"
);

assert.deepEqual(
  resolveChartSetupRailState({
    activeStageKey: "metric",
    completedStages: {
      scope: true,
      metric: false,
      style: false,
    },
  }).map((stage) => [stage.key, stage.status]),
  [
    ["scope", "completed"],
    ["metric", "active"],
    ["style", "locked"],
  ],
  "expected the rail model to collapse finished stages and lock future stages behind the active one"
);

assert.equal(
  resolveNextChartSetupStage("scope", {
    scope: true,
    metric: false,
    style: false,
  }),
  "metric",
  "expected scope completion to auto-advance into Metric"
);

assert.deepEqual(
  invalidateStagesAfter("scope", {
    scope: true,
    metric: true,
    style: true,
  }),
  {
    scope: true,
    metric: false,
    style: false,
  },
  "expected changing Scope to invalidate Metric and Style"
);

console.log("chart-guided-rail-model.test.cjs passed");
```

- [ ] **Step 2: Run the new model test to verify it fails**

Run: `node .\scripts\chart-guided-rail-model.test.cjs`

Expected: FAIL with `Cannot find module '../components/charts/chartSetupRailModel.ts'` or missing export assertions.

- [ ] **Step 3: Write the pure rail-model helper**

```ts
export const CHART_SETUP_STAGE_ORDER = ["scope", "metric", "style"] as const;

export type ChartSetupStageKey = typeof CHART_SETUP_STAGE_ORDER[number];
export type ChartSetupStageStatus = "active" | "completed" | "locked";

export type ChartSetupCompletionMap = Record<ChartSetupStageKey, boolean>;

export function buildScopeStageSummary(input: {
  focusPlayerLabel: string | null;
  comparePlayerLabel: string | null;
  scopedCount: number;
}) {
  const focus = input.focusPlayerLabel?.trim() ?? "";
  const compare = input.comparePlayerLabel?.trim() ?? "";
  const scopedCount = Math.max(0, input.scopedCount);

  if (!focus) return null;
  if (compare) {
    return scopedCount > 0
      ? `${focus} vs ${compare} - ${scopedCount} players`
      : `${focus} vs ${compare}`;
  }

  return scopedCount > 0 ? `${focus} - ${scopedCount} players` : focus;
}

export function buildMetricStageSummary(metricLabel: string | null) {
  const normalized = metricLabel?.trim() ?? "";
  return normalized || null;
}

export function buildStyleStageSummary(input: {
  lineModeLabel: string | null;
  eloViewLabel: string | null;
  opponentLabel: string | null;
}) {
  const primary = input.eloViewLabel?.trim() || input.lineModeLabel?.trim() || "";
  const opponent = input.opponentLabel?.trim() ?? "";

  if (!primary) return opponent || null;
  return opponent ? `${primary} - ${opponent}` : primary;
}

export function resolveChartSetupRailState(input: {
  activeStageKey: ChartSetupStageKey;
  completedStages: ChartSetupCompletionMap;
}) {
  let foundActive = false;

  return CHART_SETUP_STAGE_ORDER.map((stageKey) => {
    if (stageKey === input.activeStageKey) {
      foundActive = true;
      return { key: stageKey, status: "active" as const };
    }

    if (input.completedStages[stageKey]) {
      return { key: stageKey, status: "completed" as const };
    }

    return { key: stageKey, status: foundActive ? "locked" as const : "completed" as const };
  });
}

export function resolveNextChartSetupStage(
  currentStageKey: ChartSetupStageKey,
  completedStages: ChartSetupCompletionMap,
) {
  const currentIndex = CHART_SETUP_STAGE_ORDER.indexOf(currentStageKey);
  for (let index = currentIndex + 1; index < CHART_SETUP_STAGE_ORDER.length; index += 1) {
    const stageKey = CHART_SETUP_STAGE_ORDER[index];
    if (!completedStages[stageKey]) {
      return stageKey;
    }
  }
  return currentStageKey;
}

export function invalidateStagesAfter(
  stageKey: ChartSetupStageKey,
  completedStages: ChartSetupCompletionMap,
): ChartSetupCompletionMap {
  const next = { ...completedStages };
  const startIndex = CHART_SETUP_STAGE_ORDER.indexOf(stageKey) + 1;

  for (let index = startIndex; index < CHART_SETUP_STAGE_ORDER.length; index += 1) {
    next[CHART_SETUP_STAGE_ORDER[index]] = false;
  }

  return next;
}
```

- [ ] **Step 4: Run the new model test to verify it passes**

Run: `node .\scripts\chart-guided-rail-model.test.cjs`

Expected: `chart-guided-rail-model.test.cjs passed`

- [ ] **Step 5: Commit the model helper**

```bash
git add components/charts/chartSetupRailModel.ts scripts/chart-guided-rail-model.test.cjs
git commit -m "feat: add chart setup rail model"
```

### Task 2: Build the Lightweight Hero and Guided-Rail Components

**Files:**
- Create: `components/charts/ChartSetupHeroBar.tsx`
- Create: `components/charts/ChartSetupGuidedRail.tsx`
- Create: `scripts/chart-guided-rail-structure.test.cjs`

- [ ] **Step 1: Write the failing component-structure test**

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const heroSource = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "ChartSetupHeroBar.tsx"),
  "utf8"
);
const railSource = fs.readFileSync(
  path.join(projectRoot, "components", "charts", "ChartSetupGuidedRail.tsx"),
  "utf8"
);

assert.match(
  heroSource,
  /ChartHubPreview/,
  "expected the lightweight hero bar to keep the selected chart preview glyph"
);

assert.match(
  heroSource,
  /title:\s*string;[\s\S]*takeaway:\s*string;[\s\S]*chips:\s*string\[];/,
  "expected the hero bar API to stay intentionally slim: title, takeaway, chips"
);

assert.match(
  heroSource,
  /Edit Setup|Close Setup/,
  "expected the hero bar to carry the setup-entry or setup-exit route action"
);

assert.match(
  railSource,
  /type ChartSetupStageShellProps = \{/,
  "expected the guided rail to define a dedicated stage-shell contract"
);

assert.match(
  railSource,
  /status:\s*"active"\s*\|\s*"completed"\s*\|\s*"locked"/,
  "expected guided rail stages to render the approved active/completed/locked states"
);

assert.match(
  railSource,
  /Edit/,
  "expected completed stages to expose an Edit affordance"
);

assert.match(
  railSource,
  /Unlocks after/,
  "expected locked stages to explain why they are muted"
);

console.log("chart-guided-rail-structure.test.cjs passed");
```

- [ ] **Step 2: Run the structure test to verify it fails**

Run: `node .\scripts\chart-guided-rail-structure.test.cjs`

Expected: FAIL with `ENOENT` for the missing chart setup component files.

- [ ] **Step 3: Create the hero bar and guided-rail shell components**

```tsx
// components/charts/ChartSetupHeroBar.tsx
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";
import ChartHubPreview from "./ChartHubPreview";
import { CHART_COLORS, withChartAlpha, type ChartTone } from "./chartVisualSystem";
import type { ChartPreviewKind } from "./chartCatalog";

type Props = {
  title: string;
  takeaway: string;
  chips: string[];
  preview: ChartPreviewKind;
  tone: ChartTone;
  setupOpen: boolean;
  onToggleSetup: () => void;
  onBackToCommand: () => void;
};

export default function ChartSetupHeroBar({
  title,
  takeaway,
  chips,
  preview,
  tone,
  setupOpen,
  onToggleSetup,
  onBackToCommand,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.previewWrap}>
          <ChartHubPreview kind={preview} tone={tone} width={58} height={36} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Charts</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.takeaway} numberOfLines={1}>
            {takeaway}
          </Text>
        </View>
      </View>

      {chips.length ? (
        <View style={styles.chipRow}>
          {chips.slice(0, 4).map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <ActionButton
          title={setupOpen ? "Close Setup" : "Edit Setup"}
          variant="secondary"
          onPress={onToggleSetup}
        />
        <ActionButton
          title="Back to Command"
          variant="ghost"
          onPress={onBackToCommand}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withChartAlpha(CHART_COLORS.sub, 0.28),
    backgroundColor: withChartAlpha(CHART_COLORS.cardAlt, 0.9),
    padding: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewWrap: {
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: CHART_COLORS.blue,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 20,
    fontWeight: "900",
  },
  takeaway: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 17,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withChartAlpha(CHART_COLORS.sub, 0.22),
    backgroundColor: withChartAlpha(CHART_COLORS.bg, 0.55),
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: CHART_COLORS.textStrong,
    fontSize: 11,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
```

```tsx
// components/charts/ChartSetupGuidedRail.tsx
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";
import ChartStage from "./ChartStage";
import { CHART_COLORS, withChartAlpha } from "./chartVisualSystem";
import type { ChartSetupStageStatus } from "./chartSetupRailModel";

export type ChartSetupStageShellProps = {
  index: number;
  title: string;
  helper?: string | null;
  summary?: string | null;
  status: ChartSetupStageStatus;
  onEdit?: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export function ChartSetupStageShell({
  index,
  title,
  helper,
  summary,
  status,
  onEdit,
  children,
  footer,
}: ChartSetupStageShellProps) {
  const locked = status === "locked";
  const completed = status === "completed";

  return (
    <ChartStage
      tone={status === "active" ? "standard" : "compact"}
      style={[styles.stage, locked && styles.stageLocked]}
      header={
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.stepEyebrow}>{`Step ${index}`}</Text>
            <Text style={styles.title}>{title}</Text>
            {locked ? (
              <Text style={styles.helper}>{helper || `Unlocks after ${title}`}</Text>
            ) : summary && completed ? (
              <Text style={styles.summary}>{summary}</Text>
            ) : helper ? (
              <Text style={styles.helper}>{helper}</Text>
            ) : null}
          </View>
          {completed && onEdit ? (
            <Pressable onPress={onEdit} style={styles.editChip}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
      }
      footer={footer ? <View style={styles.footer}>{footer}</View> : null}
    >
      {locked ? <View style={styles.lockedBody} /> : children}
    </ChartStage>
  );
}

export function ChartSetupStageAction({
  title,
  subtitle,
  onPress,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionButton
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      disabled={disabled}
      variant="primary"
    />
  );
}

const styles = StyleSheet.create({
  stage: {
    gap: 10,
  },
  stageLocked: {
    opacity: 0.82,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  stepEyebrow: {
    color: CHART_COLORS.blue,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 16,
    fontWeight: "900",
  },
  helper: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 17,
  },
  summary: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  editChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withChartAlpha(CHART_COLORS.blue, 0.35),
    backgroundColor: withChartAlpha(CHART_COLORS.blue, 0.12),
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editText: {
    color: CHART_COLORS.blue,
    fontSize: 11,
    fontWeight: "800",
  },
  lockedBody: {
    minHeight: 2,
  },
  footer: {
    marginTop: 4,
  },
});
```

- [ ] **Step 4: Run the structure test to verify it passes**

Run: `node .\scripts\chart-guided-rail-structure.test.cjs`

Expected: `chart-guided-rail-structure.test.cjs passed`

- [ ] **Step 5: Commit the new chart setup UI primitives**

```bash
git add components/charts/ChartSetupHeroBar.tsx components/charts/ChartSetupGuidedRail.tsx scripts/chart-guided-rail-structure.test.cjs
git commit -m "feat: add charts guided rail components"
```

### Task 3: Wire the Guided Rail into the Charts Route

**Files:**
- Modify: `app/charts/index.tsx`
- Create: `scripts/chart-guided-rail-route.test.cjs`
- Modify: `scripts/chart-setup-primary-cta.test.cjs`
- Modify: `scripts/chart-setup-back-pill.test.cjs`

- [ ] **Step 1: Write the failing route-integration and CTA tests**

```js
// scripts/chart-guided-rail-route.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(projectRoot, "app", "charts", "index.tsx"),
  "utf8"
);

assert.match(
  source,
  /import ChartSetupHeroBar from "@\/components\/charts\/ChartSetupHeroBar";/,
  "expected the charts route to swap the heavy inline hero for the dedicated chart setup hero bar"
);

assert.match(
  source,
  /import \{[\s\S]*ChartSetupStageShell[\s\S]*ChartSetupStageAction[\s\S]*\} from "@\/components\/charts\/ChartSetupGuidedRail";/s,
  "expected the charts route to render the setup flow through the dedicated guided rail shell"
);

assert.match(
  source,
  /const \[activeStageKey,\s*setActiveStageKey\] = useState<ChartSetupStageKey>\("scope"\);/,
  "expected the charts route to track the active guided-rail stage locally"
);

assert.match(
  source,
  /<ChartSetupStageShell[\s\S]*title="Scope"[\s\S]*<ChartSetupStageShell[\s\S]*title="Metric"[\s\S]*<ChartSetupStageShell[\s\S]*title="Style"/s,
  "expected the charts setup UI to render the approved Scope -> Metric -> Style rail"
);

assert.match(
  source,
  /title="Open Chart"[\s\S]*subtitle="Launch this chart with the current setup"/,
  "expected the primary Open Chart CTA to move into the final Style stage"
);

console.log("chart-guided-rail-route.test.cjs passed");
```

```js
// scripts/chart-setup-primary-cta.test.cjs
assert.match(
  source,
  /<ChartSetupHeroBar[\s\S]*setupOpen=\{setupOpen\}[\s\S]*onToggleSetup=\{/,
  "expected the charts route to hand setup entry and exit to the lightweight hero bar"
);

assert.doesNotMatch(
  source,
  /label="Open Chart"[\s\S]*heroActionRow/,
  "expected the hero to stop owning the primary Open Chart CTA"
);

assert.match(
  source,
  /<ChartSetupStageAction[\s\S]*title="Open Chart"/,
  "expected the final Style stage to own the primary Open Chart CTA"
);
```

```js
// scripts/chart-setup-back-pill.test.cjs
assert.match(
  source,
  /title=\{setupOpen \? "Close Setup" : "Edit Setup"\}/,
  "expected the setup toggle action to read Edit Setup on browse mode and Close Setup while the rail is open"
);

assert.doesNotMatch(
  source,
  /<View style=\{styles\.setupFooterActions\}>[\s\S]*(Open Chart|Close Setup)[\s\S]*<\/View>/,
  "expected the retired setup footer action strip to stay empty once the guided rail owns the CTA hierarchy"
);
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `node .\scripts\chart-guided-rail-route.test.cjs`

Expected: FAIL because `app/charts/index.tsx` still imports the old inline hero/setup stack.

- [ ] **Step 3: Integrate the route with staged state, stage summaries, and final-step CTA**

```tsx
import ChartSetupHeroBar from "@/components/charts/ChartSetupHeroBar";
import {
  ChartSetupStageAction,
  ChartSetupStageShell,
} from "@/components/charts/ChartSetupGuidedRail";
import {
  buildMetricStageSummary,
  buildScopeStageSummary,
  buildStyleStageSummary,
  invalidateStagesAfter,
  resolveChartSetupRailState,
  resolveNextChartSetupStage,
  type ChartSetupCompletionMap,
  type ChartSetupStageKey,
} from "@/components/charts/chartSetupRailModel";

const [activeStageKey, setActiveStageKey] = useState<ChartSetupStageKey>("scope");
const [completedStages, setCompletedStages] = useState<ChartSetupCompletionMap>({
  scope: false,
  metric: false,
  style: false,
});

const scopeSummary = useMemo(
  () =>
    buildScopeStageSummary({
      focusPlayerLabel: selectedPlayer?.label ?? null,
      comparePlayerLabel: comparePlayer?.label ?? null,
      scopedCount: selectedGroupIds.length,
    }),
  [selectedPlayer?.label, comparePlayer?.label, selectedGroupIds.length]
);

const metricSummary = useMemo(
  () => buildMetricStageSummary(activeMetricLabel),
  [activeMetricLabel]
);

const styleSummary = useMemo(
  () =>
    buildStyleStageSummary({
      lineModeLabel:
        lineModeOptions.length > 0 ? titleCase(selectedLineMode) : null,
      eloViewLabel: eloViewOptions.length > 0 ? selectedEloTab : null,
      opponentLabel: selectedOpponent?.label ?? null,
    }),
  [lineModeOptions.length, eloViewOptions.length, selectedLineMode, selectedEloTab, selectedOpponent?.label]
);

useEffect(() => {
  const nextCompleted = {
    scope: Boolean(scopeSummary),
    metric: metricOptions.length === 0 ? true : Boolean(metricSummary),
    style:
      (lineModeOptions.length === 0 || Boolean(selectedLineMode)) &&
      (eloViewOptions.length === 0 || Boolean(selectedEloTab)) &&
      (selectedChart.key !== "elo" ||
        selectedEloTab !== "Context" ||
        opponentOptions.length === 0 ||
        Boolean(selectedOpponentId)),
  };

  setCompletedStages((current) => {
    const merged = {
      scope: nextCompleted.scope,
      metric: nextCompleted.metric,
      style: nextCompleted.style,
    };

    if (
      current.scope === merged.scope &&
      current.metric === merged.metric &&
      current.style === merged.style
    ) {
      return current;
    }

    return merged;
  });
}, [
  scopeSummary,
  metricOptions.length,
  metricSummary,
  lineModeOptions.length,
  selectedLineMode,
  eloViewOptions.length,
  selectedEloTab,
  selectedChart.key,
  opponentOptions.length,
  selectedOpponentId,
]);

useEffect(() => {
  if (!setupOpen) {
    setActiveStageKey("scope");
    return;
  }

  if (completedStages[activeStageKey]) {
    setActiveStageKey(resolveNextChartSetupStage(activeStageKey, completedStages));
  }
}, [setupOpen, activeStageKey, completedStages]);

function reopenStage(stageKey: ChartSetupStageKey) {
  setCompletedStages((current) => invalidateStagesAfter(stageKey, current));
  setActiveStageKey(stageKey);
}
```

```tsx
<ChartSetupHeroBar
  title={selectedChart.title}
  takeaway={heroTakeaway}
  chips={heroContextChips}
  preview={selectedChart.preview}
  tone={selectedChart.tone}
  setupOpen={setupOpen}
  onToggleSetup={() => setChartSetupOpen(!setupOpen)}
  onBackToCommand={() => router.push(APP_ROUTES.home)}
/>

{setupOpen ? (
  <SectionCard title={`Adjust ${selectedChart.title}`} style={styles.sectionCardCompact}>
    {resolveChartSetupRailState({
      activeStageKey,
      completedStages,
    }).map((stage, index) => {
      if (stage.key === "scope") {
        return (
          <ChartSetupStageShell
            key={stage.key}
            index={index + 1}
            title="Scope"
            helper="Choose whose story this chart tells first."
            summary={scopeSummary}
            status={stage.status}
            onEdit={() => reopenStage("scope")}
          >
            {/* Focus player, compare player, and players-in-scope sections stay here */}
          </ChartSetupStageShell>
        );
      }

      if (stage.key === "metric") {
        return (
          <ChartSetupStageShell
            key={stage.key}
            index={index + 1}
            title="Metric"
            helper="Choose what the chart should measure."
            summary={metricSummary}
            status={stage.status}
            onEdit={() => reopenStage("metric")}
          >
            {/* Existing metric controls stay here, or render a fixed-metric note when no choices exist */}
          </ChartSetupStageShell>
        );
      }

      return (
        <ChartSetupStageShell
          key={stage.key}
          index={index + 1}
          title="Style"
          helper="Choose how to render the chart."
          summary={styleSummary}
          status={stage.status}
          onEdit={() => reopenStage("style")}
          footer={
            <ChartSetupStageAction
              title="Open Chart"
              subtitle="Launch this chart with the current setup"
              onPress={() => openChart(selectedChart)}
              disabled={!completedStages.style}
            />
          }
        >
          {/* Existing line-mode, ELO-view, and opponent controls stay here */}
        </ChartSetupStageShell>
      );
    })}
  </SectionCard>
) : (
  <>
    {/* existing browse rails stay intact */}
  </>
)}
```

- [ ] **Step 4: Run the route-focused tests to verify they pass**

Run:

```powershell
node .\scripts\chart-guided-rail-route.test.cjs
node .\scripts\chart-setup-primary-cta.test.cjs
node .\scripts\chart-setup-back-pill.test.cjs
node .\scripts\chart-setup-control-system.test.cjs
node .\scripts\chart-hub-route-update.test.cjs
```

Expected:

```text
chart-guided-rail-route.test.cjs passed
chart-setup-primary-cta.test.cjs passed
chart-setup-back-pill.test.cjs passed
chart-setup-control-system.test.cjs passed
chart-hub-route-update.test.cjs passed
```

- [ ] **Step 5: Commit the integrated charts route**

```bash
git add app/charts/index.tsx scripts/chart-guided-rail-route.test.cjs scripts/chart-setup-primary-cta.test.cjs scripts/chart-setup-back-pill.test.cjs
git commit -m "feat: add guided rail charts setup flow"
```

### Task 4: Run the Full Verification Pass

**Files:**
- Modify: `scripts/run-focused-suite.cjs`

- [ ] **Step 1: Wire the new chart tests into the focused UI suite**

```js
const suites = {
  analytics: [
    "scripts/analytics-shared-state-shell.test.cjs",
    "scripts/analytics-provenance-fallback.test.cjs",
    "scripts/playstyle-spotlight-definitions.test.cjs",
    "scripts/player-card-elo-helper.test.cjs",
  ],
  ui: [
    "scripts/game-trends-visual-system.test.cjs",
    "scripts/player-directory-visual-system.test.cjs",
    "scripts/game-flow-shell-upgrades.test.cjs",
    "scripts/legacy-cleanup-guards.test.cjs",
    "scripts/chart-guided-rail-model.test.cjs",
    "scripts/chart-guided-rail-structure.test.cjs",
    "scripts/chart-guided-rail-route.test.cjs",
    "scripts/chart-setup-primary-cta.test.cjs",
    "scripts/chart-setup-back-pill.test.cjs",
  ],
};
```

- [ ] **Step 2: Run the focused UI suite**

Run: `npm.cmd run test:ui`

Expected: `run-focused-suite.cjs passed (ui)`

- [ ] **Step 3: Run TypeScript verification**

Run: `npm.cmd run typecheck`

Expected: no output other than the command prompt returning with exit code `0`

- [ ] **Step 4: Run the Expo web bundle smoke check**

Run: `npx.cmd expo export --platform web --output-dir .\tmp-expo-web-smoke`

Expected: Expo export completes successfully and writes a fresh `tmp-expo-web-smoke` directory without compile errors.

- [ ] **Step 5: Commit the verification-suite wiring**

```bash
git add scripts/run-focused-suite.cjs
git commit -m "test: cover charts guided rail flow"
```

## Spec Coverage Check

- Chart selection stays outside the setup rail:
  - Task 3 preserves the browse rails and keeps `setupOpen` as the gated entry into the staged flow.
- The rail order is `Scope -> Metric -> Style`:
  - Task 1 locks the order in the model test.
  - Task 3 renders the stages in that order in the route.
- Auto-advance and collapse behavior:
  - Task 1 introduces pure helper coverage for next-stage resolution and invalidation.
  - Task 3 wires `activeStageKey`, `completedStages`, and `reopenStage(...)`.
- Lighter hero:
  - Task 2 creates `ChartSetupHeroBar.tsx`.
  - Task 3 replaces the current inline `HeroCard` setup block with the lighter component.
- Final CTA hierarchy:
  - Task 3 moves `Open Chart` into the `Style` stage footer.
  - Task 3 updates the hero tests so the primary CTA no longer lives in the hero.
- No analytics source-of-truth regressions:
  - Task 3 leaves `getChartSetup(...)`, route params, and `openChart(...)` plumbing in place.

## Self-Review Notes

- No placeholders remain; each task names exact files, code seams, test commands, and commit messages.
- The one design choice clarified here is setup exit labeling:
  - Browse mode uses `Edit Setup`.
  - Open rail mode uses `Close Setup`.
  - This preserves the existing browse/setup split while still honoring the lighter hero and final-step CTA hierarchy.
- The plan keeps scope focused on `app/charts/index.tsx` and small chart helper extractions only; it does not spill into `app/charts/[chartKey].tsx` or analytics computation code.
