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

  if (!focus) return scopedCount > 0 ? `${scopedCount} players` : null;
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
  const activeIndex = CHART_SETUP_STAGE_ORDER.indexOf(input.activeStageKey);

  return CHART_SETUP_STAGE_ORDER.map((stageKey, index) => {
    let status: ChartSetupStageStatus;

    if (stageKey === input.activeStageKey) {
      status = "active";
    } else if (input.completedStages[stageKey]) {
      status = "completed";
    } else if (index > activeIndex) {
      status = "locked";
    } else {
      status = "completed";
    }

    return {
      key: stageKey,
      status,
    };
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
