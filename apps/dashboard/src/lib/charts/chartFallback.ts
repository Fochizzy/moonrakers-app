import type {
  ChartDatasetPayload,
  ChartSetupPayload,
} from "@moonrakers/analytics-contract";

import {
  buildEloChartState,
  type EloChartGame,
  type EloChartPlayer,
} from "../../../../../components/charts/ELO/buildEloChartState";
import { buildLocalChartDetailState } from "../../../../../utils/chartDetailLocalData";

type ChartControls = ChartSetupPayload["defaults"];

const RADAR_AXES: Array<{ key: keyof NonNullable<ReturnType<typeof buildRadarAxisSeed>>; label: string }> = [
  { key: "finisher", label: "Finisher" },
  { key: "starter", label: "Starter" },
  { key: "supporter", label: "Supporter" },
  { key: "receiver", label: "Receiver" },
  { key: "stability", label: "Stability" },
  { key: "efficiency", label: "Efficiency" },
  { key: "risk", label: "Risk" },
  { key: "conversion", label: "Conversion" },
];
const NATIVE_GAME_HISTORY_CHART_KEYS = new Set([
  "bar",
  "bar_chart",
  "elo",
  "head_to_head",
  "rivalry_graph",
]);
const LINE_HISTORY_CHART_KEYS = new Set([
  "line_chart",
  "line",
  "multi_line_chart",
  "multi-line-chart",
  "multi-line",
  "prestige_over_time",
]);
const PLACEHOLDER_CHART_TITLE = "Analytics chart";
const PLACEHOLDER_CHART_SUBTITLE_PREFIX = "Server-authored placeholder dataset";

function buildRadarAxisSeed() {
  return {
    finisher: 0,
    starter: 0,
    supporter: 0,
    receiver: 0,
    stability: 0,
    efficiency: 0,
    risk: 0,
    conversion: 0,
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object",
      )
    : [];
}

function hasNonEmptyArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function sourcePlayersHaveUsableShape(value: unknown) {
  return asArray(value).some((entry) => Boolean(toOptionalString(entry.id)));
}

function sourceGamesHaveUsableShape(value: unknown) {
  return asArray(value).some((entry) => {
    const players = asArray(entry.players);
    const totals = asRecord(entry.totals);
    const rounds = asArray(entry.rounds);
    const timeline = asArray(entry.timeline);

    return (
      Boolean(toOptionalString(entry.id)) &&
      (
        players.length > 0 ||
        Object.keys(totals).length > 0 ||
        rounds.length > 0 ||
        timeline.length > 0
      )
    );
  });
}

function resolveLocalHistorySources(
  chartKey: string,
  data: Record<string, unknown>,
) {
  const sourceGames = asArray(data.sourceGames);
  const sourcePlayers = asArray(data.sourcePlayers);
  const nativeChartKey = String(chartKey ?? "").trim().toLowerCase();
  const nativeGames = NATIVE_GAME_HISTORY_CHART_KEYS.has(nativeChartKey)
    ? asArray(data.games)
    : [];
  const nativePlayers = NATIVE_GAME_HISTORY_CHART_KEYS.has(nativeChartKey)
    ? asArray(data.players)
    : [];

  return {
    games: sourceGamesHaveUsableShape(sourceGames)
      ? sourceGames
      : sourceGamesHaveUsableShape(nativeGames)
        ? nativeGames
        : sourceGames,
    players: sourcePlayersHaveUsableShape(sourcePlayers)
      ? sourcePlayers
      : sourcePlayersHaveUsableShape(nativePlayers)
        ? nativePlayers
        : sourcePlayers,
  };
}

function toOptionalString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => toOptionalString(entry))
    .filter((entry): entry is string => entry !== null)
    .filter((entry, index, values) => values.indexOf(entry) === index);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
}

function hasPlaceholderChartPresentation(dataset: ChartDatasetPayload) {
  const normalizedTitle = String(dataset.title ?? "").trim();
  const normalizedSubtitle = String(dataset.subtitle ?? "").trim();

  return (
    normalizedTitle === PLACEHOLDER_CHART_TITLE ||
    normalizedSubtitle.startsWith(PLACEHOLDER_CHART_SUBTITLE_PREFIX)
  );
}

function pointCountFromData(data: Record<string, unknown>) {
  if (hasNonEmptyArray(data.rows)) {
    return asArray(data.rows).length;
  }

  if (hasNonEmptyArray(data.data)) {
    return asArray(data.data).length;
  }

  if (hasNonEmptyArray(data.replay)) {
    return asArray(data.replay).length;
  }

  if (hasNonEmptyArray(data.relationships)) {
    return asArray(data.relationships).length;
  }

  if (hasNonEmptyArray(data.edges)) {
    return asArray(data.edges).length;
  }

  const primary = asRecord(data.primary);
  const comparison = asRecord(data.comparison);
  return Math.max(Object.keys(primary).length, Object.keys(comparison).length);
}

function getSnapshotMetricValue(
  snapshot: Record<string, unknown> | undefined,
  metricKey: string,
) {
  return toNumber(snapshot?.[metricKey]);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildComparisonRows(
  snapshots: Array<Record<string, unknown>>,
  focusPlayerId: string,
  comparePlayerId: string | null,
  metricKey: string,
) {
  return snapshots
    .map((point, index) => {
      const snapshot = asRecord(point.snapshot);
      const focusSnapshot = asRecord(snapshot[focusPlayerId]);
      const compareSnapshot = comparePlayerId
        ? asRecord(snapshot[comparePlayerId])
        : {};
      const focusValue = getSnapshotMetricValue(focusSnapshot, metricKey);
      const compareValue = getSnapshotMetricValue(compareSnapshot, metricKey);

      if (focusValue === null && compareValue === null) {
        return null;
      }

      return {
        label: toOptionalString(point.label) ?? `Game ${index + 1}`,
        focusValue,
        compareValue,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function buildTrendRows(
  snapshots: Array<Record<string, unknown>>,
  focusPlayerId: string,
  metricKey: string,
) {
  return snapshots
    .map((point, index) => {
      const snapshot = asRecord(point.snapshot);
      const focusSnapshot = asRecord(snapshot[focusPlayerId]);
      const metricValue = getSnapshotMetricValue(focusSnapshot, metricKey);

      if (metricValue === null) {
        return null;
      }

      return {
        label: toOptionalString(point.label) ?? `Game ${index + 1}`,
        [metricKey]: metricValue,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function buildReplayRows(
  snapshots: Array<Record<string, unknown>>,
  focusPlayerId: string,
  metricKey: string,
) {
  return snapshots
    .map((point, index) => {
      const snapshot = asRecord(point.snapshot);
      const focusSnapshot = asRecord(snapshot[focusPlayerId]);
      const metricValue = getSnapshotMetricValue(focusSnapshot, metricKey);

      if (metricValue === null) {
        return null;
      }

      return {
        label: toOptionalString(point.label) ?? `Step ${index + 1}`,
        value: metricValue,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function buildHeatmapCells(
  snapshots: Array<Record<string, unknown>>,
  chartPlayers: Array<Record<string, unknown>>,
  metricKey: string,
) {
  return snapshots.flatMap((point, pointIndex) => {
    const snapshot = asRecord(point.snapshot);
    const pointLabel = toOptionalString(point.label) ?? `Game ${pointIndex + 1}`;

    return chartPlayers
      .map((player) => {
        const playerId = toOptionalString(player.id);
        if (!playerId) {
          return null;
        }

        const playerSnapshot = asRecord(snapshot[playerId]);
        const metricValue = getSnapshotMetricValue(playerSnapshot, metricKey);
        if (metricValue === null) {
          return null;
        }

        const playerName =
          toOptionalString(player.name) ??
          toOptionalString(playerSnapshot.playerName) ??
          "Player";

        return {
          id: `${playerId}-${pointIndex + 1}`,
          playerId,
          playerName,
          label: `${playerName} / ${pointLabel}`,
          round: pointIndex + 1,
          xLabel: pointLabel,
          value: metricValue,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  });
}

function buildRelationshipEdges(
  relationships: Record<string, unknown>,
  chartPlayers: Array<Record<string, unknown>>,
) {
  const playerNames = new Map<string, string>();
  chartPlayers.forEach((player) => {
    const playerId = toOptionalString(player.id);
    if (!playerId) {
      return;
    }

    playerNames.set(playerId, toOptionalString(player.name) ?? "Player");
  });

  return Object.entries(relationships)
    .flatMap(([fromId, nested]) => {
      const edgeMap = asRecord(nested);
      return Object.entries(edgeMap).map(([toId, rawWeight]) => {
        const weight = toNumber(rawWeight);
        if (!weight || weight <= 0) {
          return null;
        }

        const fromName = playerNames.get(fromId) ?? fromId;
        const toName = playerNames.get(toId) ?? toId;

        return {
          id: `${fromId}-${toId}`,
          from: fromId,
          to: toId,
          label: `${fromName} -> ${toName}`,
          weight,
        };
      });
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => right.weight - left.weight);
}

function buildBarRows(
  snapshots: Array<Record<string, unknown>>,
  chartPlayers: Array<Record<string, unknown>>,
  metricKey: string,
) {
  const latestPoint = snapshots.at(-1);
  const latestSnapshot = asRecord(latestPoint?.snapshot);

  return chartPlayers
    .map((player) => {
      const playerId = toOptionalString(player.id);
      if (!playerId) {
        return null;
      }

      const metricValue = getSnapshotMetricValue(
        asRecord(latestSnapshot[playerId]),
        metricKey,
      );
      if (metricValue === null) {
        return null;
      }

      return {
        label: toOptionalString(player.name) ?? "Player",
        [metricKey]: metricValue,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function buildScatterRows(
  snapshots: Array<Record<string, unknown>>,
  chartPlayers: Array<Record<string, unknown>>,
) {
  return chartPlayers
    .map((player) => {
      const playerId = toOptionalString(player.id);
      if (!playerId) {
        return null;
      }

      const metrics = snapshots
        .map((point) => asRecord(asRecord(point.snapshot)[playerId]))
        .filter((entry) => Object.keys(entry).length > 0);

      if (metrics.length === 0) {
        return null;
      }

      const efficiencyValues = metrics
        .map((entry) => toNumber(entry.efficiency))
        .filter((value): value is number => value !== null);
      const failureValues = metrics
        .map((entry) => toNumber(entry.failures))
        .filter((value): value is number => value !== null);

      const efficiency = average(efficiencyValues);
      const failures = average(failureValues);
      if (efficiency === null || failures === null) {
        return null;
      }

      return {
        label: toOptionalString(player.name) ?? "Player",
        efficiency,
        failures,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function buildBumpRows(
  snapshots: Array<Record<string, unknown>>,
  focusPlayerId: string,
  metricKey: string,
) {
  return snapshots
    .map((point, index) => {
      const snapshot = asRecord(point.snapshot);
      const ranking = Object.values(snapshot)
        .map((entry) => {
          const row = asRecord(entry);
          return {
            playerId: toOptionalString(row.playerId),
            value: getSnapshotMetricValue(row, metricKey),
          };
        })
        .filter(
          (entry): entry is { playerId: string; value: number } =>
            Boolean(entry.playerId) && entry.value !== null,
        )
        .sort((left, right) => right.value - left.value);

      const rank = ranking.findIndex((entry) => entry.playerId === focusPlayerId);
      if (rank === -1) {
        return null;
      }

      return {
        label: toOptionalString(point.label) ?? `Game ${index + 1}`,
        rank: rank + 1,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function buildEloRows(
  scopedGames: Array<Record<string, unknown>>,
  chartPlayers: Array<Record<string, unknown>>,
  focusPlayerId: string,
  comparePlayerId: string | null,
) {
  const eloGames = scopedGames as unknown as EloChartGame[];
  const eloPlayers = chartPlayers.map((player) => ({
    id: toOptionalString(player.id) ?? "",
    name: toOptionalString(player.name) ?? "Player",
    color: toOptionalString(player.color),
  })) as EloChartPlayer[];

  const eloState = buildEloChartState({
    games: eloGames,
    players: eloPlayers,
    primaryPlayerId: focusPlayerId,
  });

  const focusSeries =
    eloState.eloSeriesPaths.find((series) => series.id === focusPlayerId) ??
    eloState.eloSeriesPaths.find((series) => series.isFocused) ??
    eloState.eloSeriesPaths[0] ??
    null;
  const compareSeries = comparePlayerId
    ? eloState.eloSeriesPaths.find((series) => series.id === comparePlayerId) ?? null
    : null;

  if (!focusSeries) {
    return [];
  }

  return eloState.games
    .map((game, index) => {
      const elo = focusSeries.values[index];
      const compareElo = compareSeries?.values[index] ?? null;

      if (!Number.isFinite(elo) && !Number.isFinite(compareElo ?? NaN)) {
        return null;
      }

      return {
        label: `Game ${index + 1}`,
        elo,
        ...(compareSeries ? { compareElo } : {}),
        gameId:
          toOptionalString(
            (game as { id?: unknown; gameId?: unknown }).id ??
              (game as { gameId?: unknown }).gameId,
          ) ?? `game-${index + 1}`,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function logChartRenderDiagnostics(payload: Record<string, unknown>) {
  console.warn(
    "[dashboard-chart-render]",
    JSON.stringify(payload),
  );
}

function summarizeSourceGame(value: Record<string, unknown> | undefined) {
  const players = Array.isArray(value?.players) ? value.players : [];
  const totals = asRecord(value?.totals);
  const rounds = Array.isArray(value?.rounds) ? value.rounds : [];
  const timeline = Array.isArray(value?.timeline) ? value.timeline : [];

  return {
    keys: Object.keys(value ?? {}),
    playerCount: players.length,
    totalKeys: Object.keys(totals),
    roundCount: rounds.length,
    timelineCount: timeline.length,
  };
}

function rowHasNumericMetric(
  row: Record<string, unknown>,
  ignoredKeys: string[] = ["label", "round"],
) {
  return Object.entries(row).some(
    ([key, value]) => !ignoredKeys.includes(key) && toNumber(value) !== null,
  );
}

function hasRenderableComparisonData(data: Record<string, unknown>) {
  const directRows = asArray(data.rows).some((entry) => {
    const row = asRecord(entry);
    return (
      toNumber(row.focusValue ?? row.focus ?? row.playerValue) !== null ||
      toNumber(row.compareValue ?? row.compare ?? row.rivalValue) !== null
    );
  });

  if (directRows) {
    return true;
  }

  return rowHasNumericMetric(asRecord(data.primary), []) ||
    rowHasNumericMetric(asRecord(data.comparison), []);
}

function hasRenderableSparklineData(data: Record<string, unknown>) {
  const metricKey = toOptionalString(data.metricKey);
  const rows = [
    ...asArray(data.data),
    ...asArray(data.comparisonData),
  ];

  return rows.some((entry) => {
    const row = asRecord(entry);
    if (metricKey && toNumber(row[metricKey]) !== null) {
      return true;
    }

    return (
      toNumber(row.value ?? row.metricValue ?? row.y) !== null ||
      rowHasNumericMetric(row)
    );
  });
}

function hasRenderableRelationshipData(data: Record<string, unknown>) {
  const edgeWeight = (entry: Record<string, unknown>) =>
    toNumber(
      entry.weight ??
        entry.value ??
        entry.assists ??
        entry.count ??
        entry.assistCount ??
        entry.assistPrestige,
    );

  if (asArray(data.relationships).some((entry) => edgeWeight(asRecord(entry)) !== null)) {
    return true;
  }

  if (asArray(data.edges).some((entry) => edgeWeight(asRecord(entry)) !== null)) {
    return true;
  }

  if (asArray(data.links).some((entry) => edgeWeight(asRecord(entry)) !== null)) {
    return true;
  }

  const relationships = asRecord(data.relationships);
  return Object.values(relationships).some((nested) =>
    Object.values(asRecord(nested)).some((value) => {
      const weight = toNumber(value);
      return weight !== null && weight > 0;
    }),
  );
}

function hasRenderableHeatmapData(data: Record<string, unknown>) {
  return asArray(data.data).some((entry) => {
    const cell = asRecord(entry);
    return toNumber(cell.value ?? cell.metricValue ?? cell.intensity) !== null;
  });
}

function hasRenderableReplayData(data: Record<string, unknown>) {
  return asArray(data.replay).some((entry) => {
    const row = asRecord(entry);
    return toNumber(row.value ?? row.metricValue ?? row.total ?? row.delta) !== null;
  });
}

function hasRenderableCartesianData(data: Record<string, unknown>) {
  return asArray(data.data).some((entry) => rowHasNumericMetric(asRecord(entry)));
}

function hasRenderableLineHistoryData(data: Record<string, unknown>) {
  const metricKey = toOptionalString(
    data.metricKey ?? data.statKey ?? data.activeMetricKey,
  );
  const visiblePlayerIds = toStringArray(
    hasNonEmptyArray(data.selectedPlayerIds)
      ? data.selectedPlayerIds
      : data.scopedPlayerIds,
  );

  return asArray(data.data).some((entry) => {
    const row = asRecord(entry);
    if (rowHasNumericMetric(row, ["label", "round", "gameIndex"])) {
      return true;
    }

    const snapshot = asRecord(row.snapshot);
    const candidatePlayerIds =
      visiblePlayerIds.length > 0 ? visiblePlayerIds : Object.keys(snapshot);

    return candidatePlayerIds.some((playerId) => {
      const playerSnapshot = asRecord(snapshot[playerId]);

      if (metricKey) {
        return getSnapshotMetricValue(playerSnapshot, metricKey) !== null;
      }

      return rowHasNumericMetric(
        playerSnapshot,
        ["playerId", "playerName", "label", "color"],
      );
    });
  });
}

function chartDatasetMatchesRenderer(chartKey: string, dataset: ChartDatasetPayload) {
  const data = asRecord(dataset.data);

  switch (chartKey) {
    case "radar":
    case "compare":
    case "head_to_head":
    case "rivalry_graph":
      return hasRenderableComparisonData(data);
    case "line_chart":
    case "line":
    case "multi_line_chart":
    case "multi-line-chart":
    case "multi-line":
    case "prestige_over_time":
      return hasRenderableLineHistoryData(data);
    case "sparkline":
      return hasRenderableSparklineData(data);
    case "relationship_graph":
      return hasRenderableRelationshipData(data);
    case "heatmap":
      return hasRenderableHeatmapData(data);
    case "replay_chart":
      return hasRenderableReplayData(data);
    default:
      return hasRenderableCartesianData(data);
  }
}

export function chartDatasetHasRenderableData(dataset: ChartDatasetPayload) {
  const data = dataset.data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  const record = data as Record<string, unknown>;
  const meta =
    record.meta && typeof record.meta === "object" && !Array.isArray(record.meta)
      ? (record.meta as Record<string, unknown>)
      : null;

  if (typeof meta?.hasData === "boolean") {
    return meta.hasData;
  }

  if (typeof meta?.pointCount === "number") {
    return meta.pointCount > 0;
  }

  if (
    hasNonEmptyArray(record.data) ||
    hasNonEmptyArray(record.rows) ||
    hasNonEmptyArray(record.comparisonData) ||
    hasNonEmptyArray(record.replay) ||
    hasNonEmptyArray(record.relationships) ||
    hasNonEmptyArray(record.edges) ||
    hasNonEmptyArray(record.links) ||
    hasNonEmptyArray(record.nodes) ||
    hasNonEmptyArray(record.games)
  ) {
    return true;
  }

  const primary =
    record.primary && typeof record.primary === "object" && !Array.isArray(record.primary)
      ? (record.primary as Record<string, unknown>)
      : null;
  const comparison =
    record.comparison &&
    typeof record.comparison === "object" &&
    !Array.isArray(record.comparison)
      ? (record.comparison as Record<string, unknown>)
      : null;

  return Boolean(
    (primary && Object.keys(primary).length > 0) ||
      (comparison && Object.keys(comparison).length > 0),
  );
}

export function chartDatasetHasSourceHistory(dataset: ChartDatasetPayload) {
  const data = asRecord(dataset.data);
  const history = resolveLocalHistorySources(dataset.chartKey, data);
  return (
    sourceGamesHaveUsableShape(history.games) &&
    sourcePlayersHaveUsableShape(history.players)
  );
}

export function mergeChartDatasetSourceHistory(
  dataset: ChartDatasetPayload,
  history: {
    games: Array<Record<string, unknown>>;
    players: Array<Record<string, unknown>>;
  },
) {
  const data = asRecord(dataset.data);
  const sourceGames = asArray(data.sourceGames);
  const sourcePlayers = asArray(data.sourcePlayers);
  const hasUsableSourceGames = sourceGamesHaveUsableShape(sourceGames);
  const hasUsableSourcePlayers = sourcePlayersHaveUsableShape(sourcePlayers);
  const hasUsableFallbackGames = sourceGamesHaveUsableShape(history.games);
  const hasUsableFallbackPlayers = sourcePlayersHaveUsableShape(history.players);

  if (
    (hasUsableSourceGames && hasUsableSourcePlayers) ||
    !hasUsableFallbackGames ||
    !hasUsableFallbackPlayers
  ) {
    return dataset;
  }

  return {
    ...dataset,
    data: {
      ...data,
      sourceGames: hasUsableSourceGames ? sourceGames : history.games,
      sourcePlayers: hasUsableSourcePlayers ? sourcePlayers : history.players,
    },
  };
}

export function buildChartControls({
  dataset,
  setup,
  controls,
}: {
  dataset: ChartDatasetPayload;
  setup: {
    defaults?: Partial<ChartSetupPayload["defaults"]>;
  };
  controls?: Partial<ChartControls>;
}): ChartControls {
  const data = asRecord(dataset.data);
  const meta = asRecord(data.meta);
  const defaults: ChartControls = {
    focusPlayerId: setup.defaults?.focusPlayerId ?? null,
    comparePlayerId: setup.defaults?.comparePlayerId ?? null,
    scopedPlayerIds: setup.defaults?.scopedPlayerIds ?? [],
    metricKey: setup.defaults?.metricKey ?? null,
    lineMode: setup.defaults?.lineMode ?? null,
    eloTab: setup.defaults?.eloTab ?? null,
    opponentId: setup.defaults?.opponentId ?? null,
  };

  return {
    ...defaults,
    focusPlayerId:
      toOptionalString(
        controls?.focusPlayerId ?? data.playerId ?? meta.focusPlayerId,
      ) ?? defaults.focusPlayerId,
    comparePlayerId:
      toOptionalString(
        controls?.comparePlayerId ?? data.compareId ?? meta.comparePlayerId,
      ) ?? defaults.comparePlayerId,
    scopedPlayerIds:
      toStringArray(
        controls?.scopedPlayerIds?.length
          ? controls.scopedPlayerIds
          : data.selectedPlayerIds ?? data.scopedPlayerIds,
      ).length > 0
        ? toStringArray(
            controls?.scopedPlayerIds?.length
              ? controls.scopedPlayerIds
              : data.selectedPlayerIds ?? data.scopedPlayerIds,
          )
        : defaults.scopedPlayerIds,
    metricKey:
      toOptionalString(
        controls?.metricKey ??
          data.activeMetricKey ??
          data.metricKey ??
          data.statKey ??
          meta.metricKey,
      ) ?? defaults.metricKey,
    lineMode:
      toOptionalString(controls?.lineMode ?? data.mode ?? meta.lineMode) ??
      defaults.lineMode,
    eloTab: defaults.eloTab,
    opponentId:
      toOptionalString(controls?.opponentId ?? data.opponentId ?? meta.opponentId) ??
      defaults.opponentId,
  };
}

export function buildRenderableChartDataset({
  chartKey,
  dataset,
  controls,
}: {
  chartKey: string;
  dataset: ChartDatasetPayload;
  controls: ChartControls;
}) {
  const data = asRecord(dataset.data);
  const history = resolveLocalHistorySources(chartKey, data);
  const hasLocalHistory =
    sourceGamesHaveUsableShape(history.games) &&
    sourcePlayersHaveUsableShape(history.players);

  if (
    chartDatasetHasRenderableData(dataset) &&
    chartDatasetMatchesRenderer(chartKey, dataset) &&
    !(hasLocalHistory && hasPlaceholderChartPresentation(dataset))
  ) {
    return dataset;
  }

  const sourceGames = history.games;
  const sourcePlayers = history.players;

  if (sourceGames.length === 0 || sourcePlayers.length === 0) {
    return dataset;
  }

  const localState = buildLocalChartDetailState({
    chartKey,
    games: sourceGames,
    players: sourcePlayers as Array<{
      id: string;
      name?: string;
      color?: string;
      initials?: string;
      assignedCardArtIndex?: number | null;
      artIndex?: number | null;
    }>,
    routePlayerId: controls.focusPlayerId,
    routeCompareId: controls.comparePlayerId ?? controls.opponentId,
    routeIds: controls.scopedPlayerIds,
    routeMetric: controls.metricKey,
  });

  if (!localState.hasData || !localState.selectedPlayer) {
    logChartRenderDiagnostics({
      stage: "local-state-empty",
      chartKey,
      focusPlayerId: controls.focusPlayerId ?? null,
      comparePlayerId: controls.comparePlayerId ?? null,
      sourceGameCount: sourceGames.length,
      sourcePlayerCount: sourcePlayers.length,
      scopedGameCount: localState.scopedGames.length,
      chartPlayerCount: localState.chartPlayers.length,
      snapshotCount: localState.snapshots.length,
      stackedRowCount: localState.stackedRows.length,
      selectedPlayerId: localState.selectedPlayer?.id ?? null,
      scopedPlayerIds: localState.scopedPlayerIds,
      chartPlayerIds: localState.chartPlayers.map((player) => player.id),
      scopedGameTotalKeys: localState.scopedGames.map((game) =>
        Object.keys(game?.totals ?? {}),
      ),
      firstSourceGame: summarizeSourceGame(sourceGames[0]),
      secondSourceGame: summarizeSourceGame(sourceGames[1]),
      firstSourcePlayerKeys: Object.keys(sourcePlayers[0] ?? {}),
    });
    return dataset;
  }

  const metricKey = localState.metricKey;
  const focusPlayerId = localState.selectedPlayer.id;
  const comparePlayerId = localState.comparePlayer?.id ?? controls.opponentId ?? null;
  const snapshots = localState.snapshots as unknown as Array<Record<string, unknown>>;
  const scopedGames = localState.scopedGames as unknown as Array<Record<string, unknown>>;
  const chartPlayers = localState.chartPlayers as unknown as Array<Record<string, unknown>>;

  let fallbackData: Record<string, unknown>;

  switch (chartKey) {
    case "radar": {
      const primary = localState.radarPrimary ?? buildRadarAxisSeed();
      const comparison = localState.radarComparison ?? null;
      const rows = RADAR_AXES.map((axis) => ({
        label: axis.label,
        focusValue: primary[axis.key],
        compareValue: comparison ? comparison[axis.key] : null,
      }));

      fallbackData = { rows, primary, comparison };
      break;
    }
    case "compare":
    case "head_to_head":
    case "rivalry_graph":
      fallbackData = {
        rows: buildComparisonRows(
          snapshots,
          focusPlayerId,
          comparePlayerId,
          metricKey,
        ),
      };
      break;
    case "sparkline":
      fallbackData = {
        data: buildTrendRows(snapshots, focusPlayerId, metricKey),
        comparisonData: comparePlayerId
          ? buildTrendRows(snapshots, comparePlayerId, metricKey)
          : [],
        metricKey,
        primaryLabel: localState.selectedPlayer?.name ?? "Player",
        comparisonLabel: localState.comparePlayer?.name ?? "Comparison",
      };
      break;
    case "line_chart":
    case "line":
    case "multi_line_chart":
    case "multi-line-chart":
    case "multi-line":
    case "prestige_over_time":
      fallbackData = {
        data: snapshots,
        players: chartPlayers,
        statKey: metricKey,
        metricKey,
        activeMetricKey: metricKey,
        selectedPlayerIds: localState.scopedPlayerIds,
        scopedPlayerIds: localState.scopedPlayerIds,
        mode: toOptionalString(controls.lineMode ?? data.mode) ?? "raw",
      };
      break;
    case "relationship_graph":
      fallbackData = {
        relationships: buildRelationshipEdges(
          localState.relationships as Record<string, unknown>,
          chartPlayers,
        ),
        edges: buildRelationshipEdges(
          localState.relationships as Record<string, unknown>,
          chartPlayers,
        ),
        players: chartPlayers,
      };
      break;
    case "heatmap":
      fallbackData = {
        data: buildHeatmapCells(snapshots, chartPlayers, metricKey),
      };
      break;
    case "replay_chart":
      fallbackData = {
        replay: buildReplayRows(snapshots, focusPlayerId, metricKey),
      };
      break;
    case "elo":
      fallbackData = {
        data: buildEloRows(
          scopedGames,
          chartPlayers,
          focusPlayerId,
          comparePlayerId,
        ),
      };
      break;
    case "bar_chart":
    case "bar":
      fallbackData = {
        data: buildBarRows(snapshots, chartPlayers, metricKey),
      };
      break;
    case "efficiency_failure_scatter":
      fallbackData = {
        data: buildScatterRows(snapshots, chartPlayers),
      };
      break;
    case "bump_chart":
      fallbackData = {
        data: buildBumpRows(snapshots, focusPlayerId, metricKey),
      };
      break;
    default:
      fallbackData = {
        data: buildTrendRows(snapshots, focusPlayerId, metricKey),
      };
      break;
  }

  const meta = asRecord(data.meta);
  const pointCount = pointCountFromData(fallbackData);
  const resolvedMetricKey = chartKey === "elo" ? "elo" : metricKey;

  return {
    ...dataset,
    data: {
      ...data,
      ...fallbackData,
      meta: {
        ...meta,
        hasData: pointCount > 0,
        pointCount,
        focusPlayerId: controls.focusPlayerId ?? meta.focusPlayerId ?? focusPlayerId,
        comparePlayerId:
          controls.comparePlayerId ?? meta.comparePlayerId ?? comparePlayerId,
        metricKey: controls.metricKey ?? meta.metricKey ?? resolvedMetricKey,
      },
      playerId: controls.focusPlayerId ?? data.playerId ?? focusPlayerId,
      compareId: controls.comparePlayerId ?? data.compareId ?? comparePlayerId,
      activeMetricKey:
        controls.metricKey ?? data.activeMetricKey ?? resolvedMetricKey,
      metricKey: controls.metricKey ?? data.metricKey ?? resolvedMetricKey,
      sourceGames,
      sourcePlayers,
    },
  };
}
