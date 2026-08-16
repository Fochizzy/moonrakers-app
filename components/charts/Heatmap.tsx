import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { getMetricOrFallback } from "@/utils/metricMap";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { getPlayerAccentColor } from "@/utils/turnTheme";
import { CHART_COLORS } from "./chartVisualSystem";
import ChartFocusCard from "./ChartFocusCard";
import ChartStage from "./ChartStage";
import ChartUnderlineTabs from "./ChartUnderlineTabs";
import HeatmapGrid from "./HeatmapGrid";
import type { HeatmapMode, MatrixRow, MatrixSummary, SelectedCell } from "./heatmapUtils";

// Rows built by this screen always carry a summary; the optionality on
// MatrixRow exists for server-resolved grid rows.
type SummarizedMatrixRow = MatrixRow & { summary: MatrixSummary };

type SortMode =
  | "default"
  | "highestAvg"
  | "lowestAvg"
  | "highestPeak"
  | "consistency"
  | "latest";

type Player = { id: string; name: string; color?: string };
type SnapshotPoint = {
  round: number;
  gameIndex?: number;
  label?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  snapshot: Record<string, unknown>;
};

type Props = {
  data?: SnapshotPoint[];
  players?: Player[];
  statKey: string;
  scopedPlayerIds?: string[];
  title?: string;
  subtitle?: string;
  initialMode?: HeatmapMode;
  allowedModes?: HeatmapMode[];
  emptyBehavior?: "empty-chart" | "hide";
  showHeader?: boolean;
};

const COLORS = CHART_COLORS;

const MODE_OPTIONS: readonly { key: HeatmapMode; label: string }[] = [
  { key: "raw", label: "Raw" },
  { key: "relativeToLobby", label: "Relative To Lobby" },
  { key: "relativeToPlayerAverage", label: "Relative To Player Avg" },
  { key: "rank", label: "Rank" },
  { key: "swing", label: "Swing" },
] as const;

const SORT_OPTIONS: readonly { key: SortMode; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "highestAvg", label: "Hottest" },
  { key: "lowestAvg", label: "Coldest" },
  { key: "highestPeak", label: "Peak" },
  { key: "consistency", label: "Stable" },
  { key: "latest", label: "Latest" },
] as const;

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  return clean.length
    ? clean.reduce((sum, value) => sum + value, 0) / clean.length
    : 0;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function getPlayerColor(color?: string, index = 0): string {
  return getPlayerAccentColor(resolveStoredPlayerColor(color, index));
}

function formatDisplayValue(
  value: number,
  mode: HeatmapMode,
  metricKey: string
): string {
  if (mode === "rank") return `#${Math.round(value)}`;

  const metric = getMetricOrFallback(metricKey);

  if (metric.format === "percent") {
    const rounded = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
    return `${value > 0 && mode !== "raw" ? "+" : ""}${rounded}%`;
  }

  if (metric.format === "elo") {
    return `${Math.round(value)}`;
  }

  if (metric.format === "signed") {
    const rounded =
      Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(metric.decimals ?? 1);
    return `${value > 0 && mode !== "raw" ? "+" : ""}${rounded}`;
  }

  const rounded =
    Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(metric.decimals ?? 1);
  return `${value > 0 && mode !== "raw" ? "+" : ""}${rounded}`;
}

function buildFill(mode: HeatmapMode, value: number) {
  if (mode === "rank") {
    const opacity = Math.max(0.18, Math.min(0.82, 0.9 - value * 0.12));
    return { fill: `rgba(59,130,246,${opacity})`, intensity: opacity };
  }

  if (Math.abs(value) < 0.0001) {
    return { fill: "rgba(255,255,255,0.08)", intensity: 0.12 };
  }

  const opacity = Math.max(0.14, Math.min(0.85, Math.abs(value) / 10));
  return {
    fill: value >= 0 ? `rgba(34,197,94,${opacity})` : `rgba(239,68,68,${opacity})`,
    intensity: opacity,
  };
}

function getWinnerId(point: SnapshotPoint): string | null {
  const winner =
    point?.winnerId ?? point?.selectedWinnerId ?? point?.manualWinnerId ?? null;

  return typeof winner === "string" && winner.trim() ? winner : null;
}

function sumPrestigeLikeRecord(record: Record<string, unknown>) {
  const totalPrestige =
    typeof record.totalPrestige === "number" ? record.totalPrestige : null;
  if (totalPrestige != null) return totalPrestige;

  const prestige = typeof record.prestige === "number" ? record.prestige : null;
  if (prestige != null) return prestige;

  return (
    n(record.directPrestige) +
    n(record.assistPrestigeReceived) +
    n(record.objectivePrestige)
  );
}

function resolveMetricValue(
  playerEntry: unknown,
  metricKey: string,
  point?: SnapshotPoint,
  playerId?: string
): number {
  if (typeof playerEntry === "number") {
    if (
      metricKey === "score" ||
      metricKey === "value" ||
      metricKey === "totalPrestige" ||
      metricKey === "prestige"
    ) {
      return playerEntry;
    }
    return 0;
  }

  const record =
    playerEntry && typeof playerEntry === "object"
      ? (playerEntry as Record<string, unknown>)
      : null;

  const directPrestige =
    n(record?.directPrestige) ||
    n(record?.selfPrestige) ||
    n(record?.prestigeFromSelf);

  const assistPrestigeReceived =
    n(record?.assistPrestigeReceived) ||
    n(record?.assistsReceived) ||
    n(record?.assistIn);

  const assistPrestigeSent =
    n(record?.assistPrestigeSent) || n(record?.assistsSent);

  const objectivePrestige =
    n(record?.objectivePrestige) || n(record?.objectiveCount);

  const contracts =
    n(record?.contracts) ||
    n(record?.successes) ||
    n(record?.contractSuccesses) ||
    n(record?.successfulContracts);

  const failures =
    n(record?.failures) ||
    n(record?.contractFailures) ||
    n(record?.failedContracts);

  const assists =
    n(record?.assists) ||
    n(record?.assistsGiven) ||
    n(record?.assistGiven);

  const turns = n(record?.turns) || n(record?.turnCount) || 1;

  const totalPrestige = record ? sumPrestigeLikeRecord(record) : 0;
  const score = n(record?.score) || totalPrestige;
  const wins =
    n(record?.win) ||
    (point && playerId && getWinnerId(point) === playerId ? 1 : 0);

  switch (metricKey) {
    case "score":
      return score;
    case "totalPrestige":
      return totalPrestige;
    case "prestige":
      return n(record?.prestige) || totalPrestige;
    case "directPrestige":
      return directPrestige;
    case "assistPrestigeReceived":
      return assistPrestigeReceived;
    case "assistPrestigeSent":
      return assistPrestigeSent;
    case "objectivePrestige":
      return objectivePrestige;
    case "assists":
      return assists;
    case "contracts":
      return contracts;
    case "failures":
      return failures;
    case "turns":
      return turns;
    case "wins":
      return wins;
    case "efficiency":
      return turns > 0 ? score / turns : 0;
    case "assistEfficiency":
      return turns > 0 ? assistPrestigeReceived / turns : 0;
    case "directEfficiency":
      return turns > 0 ? directPrestige / turns : 0;
    case "contractSuccessRate":
      return safeDivide(contracts, contracts + failures) * 100;
    case "netPrestige":
      return totalPrestige - assistPrestigeSent;
    case "supportBalance":
      return assistPrestigeReceived - assistPrestigeSent;
    case "elo":
      return n(record?.elo) || n(record?.rating) || 1200;
    case "eloDelta":
      return n(record?.eloDelta);
    case "closeGames":
      return n(record?.closeGames);
    case "prestigeMargin":
      return n(record?.prestigeMargin);
    case "avgStartSeat":
      return (
        n(record?.avgStartSeat) ||
        n(record?.startSeat) ||
        n(record?.seat) ||
        n(record?.turnOrder)
      );
    case "recentFormDelta":
      return n(record?.recentFormDelta);
    case "leadConversion":
      return n(record?.leadConversion);
    case "lateLeadConversion":
      return n(record?.lateLeadConversion);
    default:
      return n(record?.[metricKey]);
  }
}

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSub(metricKey: string, mode: HeatmapMode) {
  const metric = getMetricOrFallback(metricKey);
  return `${metric.label} · ${mode === "raw" ? "Raw values" : titleCase(mode)}`;
}

function sortRows(rows: SummarizedMatrixRow[], sortMode: SortMode) {
  const cloned = [...rows];

  switch (sortMode) {
    case "highestAvg":
      return cloned.sort((a, b) => b.summary.average - a.summary.average);
    case "lowestAvg":
      return cloned.sort((a, b) => a.summary.average - b.summary.average);
    case "highestPeak":
      return cloned.sort((a, b) => b.summary.peak - a.summary.peak);
    case "consistency":
      return cloned.sort((a, b) => a.summary.consistency - b.summary.consistency);
    case "latest":
      return cloned.sort((a, b) => b.summary.latest - a.summary.latest);
    case "default":
    default:
      return cloned;
  }
}

function buildMatrixRow(
  player: Player,
  points: SnapshotPoint[],
  metricKey: string,
  mode: HeatmapMode,
  playerIndex: number
): SummarizedMatrixRow {
  const rawValues = points.map((point) =>
    resolveMetricValue(point.snapshot?.[player.id], metricKey, point, player.id)
  );

  const playerAverage = average(rawValues);

  const cells = rawValues.map((rawValue, index) => {
    const lobbyValues = points.map((point) =>
      average(
        Object.entries(point.snapshot ?? {}).map(([id, entry]) =>
          resolveMetricValue(entry, metricKey, point, id)
        )
      )
    );

    const previousRaw = rawValues[index - 1] ?? rawValue;
    const rank =
      1 +
      Object.entries(points[index]?.snapshot ?? {})
        .map(([id, entry]) => resolveMetricValue(entry, metricKey, points[index], id))
        .filter((value) => value > rawValue).length;

    let displayValue = rawValue;

    switch (mode) {
      case "relativeToLobby":
        displayValue = rawValue - (lobbyValues[index] ?? 0);
        break;
      case "relativeToPlayerAverage":
        displayValue = rawValue - playerAverage;
        break;
      case "rank":
        displayValue = rank;
        break;
      case "swing":
        displayValue = rawValue - previousRaw;
        break;
      case "raw":
      default:
        displayValue = rawValue;
        break;
    }

    const fill = buildFill(mode, displayValue);

    return {
      round: index + 1,
      rawValue,
      displayValue,
      fill: fill.fill,
      intensity: fill.intensity,
      text: formatDisplayValue(displayValue, mode, metricKey),
      textColor:
        mode === "rank"
          ? "#E2E8F0"
          : Math.abs(displayValue) > 6
            ? "#F8FAFC"
            : "#E2E8F0",
    };
  });

  const latest = rawValues[rawValues.length - 1] ?? 0;
  const peak = rawValues.length ? Math.max(...rawValues) : 0;
  const avg = average(rawValues);
  const consistency = stdDev(rawValues);

  return {
    id: player.id,
    label: player.name,
    shortLabel: player.name,
    color: getPlayerColor(player.color, playerIndex),
    cells,
    summary: {
      average: avg,
      peak,
      latest,
      consistency,
    },
  };
}

function SectionHeader({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
    </View>
  );
}

export default function Heatmap({
  data = [],
  players = [],
  statKey,
  scopedPlayerIds,
  title,
  subtitle,
  initialMode = "raw",
  allowedModes = ["raw", "relativeToLobby", "relativeToPlayerAverage", "rank", "swing"],
  emptyBehavior = "empty-chart",
  showHeader = true,
}: Props) {
  const safeData = Array.isArray(data) ? data : [];
  const safePlayers = Array.isArray(players) ? players : [];
  const metric = getMetricOrFallback(statKey);

  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return safePlayers;
    const wanted = new Set(scopedPlayerIds.map(String));
    return safePlayers.filter((player) => wanted.has(String(player.id)));
  }, [safePlayers, scopedPlayerIds]);

  const resolvedAllowedModes = useMemo(() => {
    const valid = (Array.isArray(allowedModes) ? allowedModes : [])
      .filter(Boolean)
      .map((mode) => mode);
    return valid.length ? valid : (["raw"] as HeatmapMode[]);
  }, [allowedModes]);

  const [selectedMode, setSelectedMode] = useState<HeatmapMode>(
    resolvedAllowedModes.includes(initialMode) ? initialMode : resolvedAllowedModes[0] ?? "raw"
  );
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  useEffect(() => {
    if (!resolvedAllowedModes.includes(selectedMode)) {
      setSelectedMode(resolvedAllowedModes[0] ?? "raw");
    }
  }, [resolvedAllowedModes, selectedMode]);

  useEffect(() => {
    setSelectedCell(null);
  }, [statKey, selectedMode, sortMode, scopedPlayerIds?.join("|")]);

  const matrix = useMemo(() => {
    const baseRows = visiblePlayers.map((player, index) =>
      buildMatrixRow(player, safeData, statKey, selectedMode, index)
    );
    return sortRows(baseRows, sortMode);
  }, [visiblePlayers, safeData, statKey, selectedMode, sortMode]);

  const resolvedTitle = title ?? `${metric.label} Heatmap`;
  const resolvedSubtitle = subtitle ?? buildSub(statKey, selectedMode);
  const selectedModeLabel =
    MODE_OPTIONS.find((option) => option.key === selectedMode)?.label ?? "Raw";

  const insight = useMemo(() => {
    if (!matrix.length) return null;

    const topAverage = [...matrix].sort((a, b) => b.summary.average - a.summary.average)[0];
    const topPeak = [...matrix].sort((a, b) => b.summary.peak - a.summary.peak)[0];
    const mostStable = [...matrix].sort(
      (a, b) => a.summary.consistency - b.summary.consistency
    )[0];

    return { topAverage, topPeak, mostStable };
  }, [matrix]);

  const selectedRow = selectedCell
    ? matrix.find((row) => row.id === selectedCell.playerId) ?? null
    : null;

  const focusTitle = selectedCell
    ? selectedCell.playerName
    : insight?.topAverage?.label ?? "Heatmap Lead";
  const focusValue = selectedCell
    ? selectedCell.text ??
      formatDisplayValue(selectedCell.displayValue, selectedMode, statKey)
    : insight
      ? formatDisplayValue(insight.topAverage?.summary.average ?? 0, "raw", statKey)
      : undefined;
  const focusHelper = selectedCell
    ? `Round ${selectedCell.round} · Raw ${formatDisplayValue(
        selectedCell.rawValue,
        "raw",
        statKey
      )}`
    : insight
      ? `${focusTitle} is running ${formatDisplayValue(
          insight.topAverage?.summary.average ?? 0,
          "raw",
          statKey
        )} on average.`
      : undefined;
  const focusStory = selectedCell
    ? selectedRow
      ? `Peak ${formatDisplayValue(
          selectedRow.summary.peak,
          "raw",
          statKey
        )} | Latest ${formatDisplayValue(
          selectedRow.summary.latest,
          "raw",
          statKey
        )} | ${selectedModeLabel}`
      : `Viewing ${selectedModeLabel.toLowerCase()} heat at this exact round.`
    : insight
      ? `Peak ${formatDisplayValue(
          insight.topPeak?.summary.peak ?? 0,
          "raw",
          statKey
        )} | Steadiest ${insight.mostStable?.label ?? "-"}`
      : undefined;
  const focusAccentColor =
    selectedCell?.color ??
    selectedRow?.color ??
    insight?.topAverage?.color ??
    COLORS.accent;

  if (!safeData.length || !visiblePlayers.length) {
    if (emptyBehavior === "hide") return null;

    return (
      <View style={styles.sectionCompact}>
        <Text style={styles.emptyTitle}>No heatmap data yet</Text>
        <Text style={styles.emptyText}>
          Add games or snapshots to render this heatmap.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{resolvedTitle}</Text>
          <Text style={styles.subtitle}>{metric.description || resolvedSubtitle}</Text>
        </View>
      ) : null}

      {insight ? (
        <ChartFocusCard
          title={focusTitle}
          value={focusValue}
          helper={focusHelper}
          story={focusStory}
          tone="comparison"
          accentColor={focusAccentColor}
          compact
        />
      ) : null}

      <ChartStage
        tone="comparison"
        style={styles.gridStage}
        plotStyle={styles.gridStagePlot}
        header={<SectionHeader title="Grid" sub={resolvedSubtitle} />}
      >
        <HeatmapGrid
          dataLength={safeData.length}
          matrix={matrix}
          selectedCell={selectedCell}
          selectedMode={selectedMode}
          onSelectCell={setSelectedCell}
        />
      </ChartStage>

      <View style={styles.sectionCompact}>
        <Text style={styles.detailTitle}>Cell</Text>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Sort</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.underlineScroll}
          >
            <ChartUnderlineTabs
              items={SORT_OPTIONS.map((option) => ({
                key: option.key,
                label: option.label,
              }))}
              activeKey={sortMode}
              onChange={(nextKey) => setSortMode(nextKey as SortMode)}
            />
          </ScrollView>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Color Mode</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.underlineScroll}
          >
            <ChartUnderlineTabs
              items={MODE_OPTIONS.filter((option) =>
                resolvedAllowedModes.includes(option.key)
              ).map((option) => ({
                key: option.key,
                label: option.label,
              }))}
              activeKey={selectedMode}
              onChange={(nextKey) => setSelectedMode(nextKey as HeatmapMode)}
            />
          </ScrollView>
        </View>

        {selectedCell ? (
          <View style={styles.selectedCellCard}>
            <Text style={styles.detailTitle}>
              {selectedCell.playerName} · Round {selectedCell.round}
            </Text>
            <Text style={styles.detailValue}>{selectedCell.text}</Text>
            <Text style={styles.detailSub}>
              Raw: {formatDisplayValue(selectedCell.rawValue, "raw", statKey)}
            </Text>
          </View>
        ) : (
          <Text style={styles.detailSub}>
            Tap a cell for the exact raw value and the current {selectedModeLabel.toLowerCase()} view.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  header: {
    gap: 2,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  gridStage: {
    marginBottom: 6,
  },
  gridStagePlot: {
    padding: 0,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  subtitle: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  readoutTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  metricGridDense: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  metricCardDense: {
    minWidth: "31%",
    flexGrow: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    minHeight: 52,
    justifyContent: "center",
    backgroundColor: COLORS.whiteSoft,
  },
  metricCardHot: {
    backgroundColor: COLORS.accentSoft,
  },
  legendCardDense: {
    minWidth: "48%",
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  metricValueCompact: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  metricHelperCompact: {
    color: COLORS.sub,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 2,
  },
  controlGroup: {
    gap: 6,
    marginTop: 8,
  },
  underlineScroll: {
    paddingRight: 8,
  },
  controlLabel: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  detailSub: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 15,
  },
  selectedCellCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    padding: 10,
    gap: 4,
  },
});
