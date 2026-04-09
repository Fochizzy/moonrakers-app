import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import Text from "@/components/ui/Text";
import HeatmapGrid from "./HeatmapGrid";
import { HeatmapMode, MatrixRow, SelectedCell } from "./heatmapUtils";
import { getMetricOrFallback } from "@/utils/metricMap";

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
  snapshot: Record<string, any>;
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
};

const COLORS = {
  bg: "#081120",
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  muted: "#64748B",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.16)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  red: "#EF4444",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
};

const MODE_OPTIONS: readonly { key: HeatmapMode; label: string }[] = [
  { key: "raw", label: "Raw" },
  { key: "relativeToLobby", label: "Relative To Lobby" },
  { key: "relativeToPlayerAverage", label: "Relative To Player Avg" },
  { key: "rank", label: "Rank" },
  { key: "swing", label: "Swing" },
] as const;

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
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

function withAlpha(hex: string, alpha: string) {
  if (!hex?.startsWith("#") || hex.length !== 7) return hex;
  return `${hex}${alpha}`;
}

function getPlayerColor(color?: string, index = 0): string {
  if (typeof color === "string" && color.trim()) return color.trim();

  const fallback = [
    "#A855F7",
    "#3B82F6",
    "#22C55E",
    "#3B82F6",
    "#EF4444",
    "#14B8A6",
    "#E879F9",
    "#F97316",
  ];

  return fallback[index % fallback.length];
}

function formatDisplayValue(value: number, mode: HeatmapMode, metricKey: string): string {
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
    n(record?.assistPrestigeSent) ||
    n(record?.assistsSent);

  const objectivePrestige =
    n(record?.objectivePrestige) ||
    n(record?.objectiveCount);

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

function sortRows(rows: MatrixRow[], sortMode: SortMode) {
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
): MatrixRow {
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

    const previousRaw = index > 0 ? rawValues[index - 1] : rawValue;
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

  const latest = rawValues.length ? rawValues[rawValues.length - 1] : 0;
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
    const valid = (Array.isArray(allowedModes) ? allowedModes : []).filter(Boolean);
    return valid.length ? valid : (["raw"] as HeatmapMode[]);
  }, [allowedModes]);

  const [selectedMode, setSelectedMode] = useState<HeatmapMode>(
    resolvedAllowedModes.includes(initialMode) ? initialMode : resolvedAllowedModes[0]
  );
  const [sortMode] = useState<SortMode>("default");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  useEffect(() => {
    if (!resolvedAllowedModes.includes(selectedMode)) {
      setSelectedMode(resolvedAllowedModes[0]);
    }
  }, [resolvedAllowedModes, selectedMode]);

  useEffect(() => {
    setSelectedCell(null);
  }, [statKey, selectedMode, scopedPlayerIds?.join("|")]);

  const matrix = useMemo(() => {
    const baseRows = visiblePlayers.map((player, index) =>
      buildMatrixRow(player, safeData, statKey, selectedMode, index)
    );
    return sortRows(baseRows, sortMode);
  }, [visiblePlayers, safeData, statKey, selectedMode, sortMode]);

  const resolvedTitle = title ?? `${metric.label} Heatmap`;
  const resolvedSubtitle = subtitle ?? buildSub(statKey, selectedMode);

  const insight = useMemo(() => {
    if (!matrix.length) return null;

    const topAverage = [...matrix].sort((a, b) => b.summary.average - a.summary.average)[0];
    const topPeak = [...matrix].sort((a, b) => b.summary.peak - a.summary.peak)[0];
    const mostStable = [...matrix].sort(
      (a, b) => a.summary.consistency - b.summary.consistency
    )[0];

    return { topAverage, topPeak, mostStable };
  }, [matrix]);

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
      <View style={styles.sectionCompact}>
        <SectionHeader title={resolvedTitle} sub={resolvedSubtitle} />

        <View style={styles.metricGridDense}>
          <View style={[styles.metricCardDense, { backgroundColor: COLORS.accentSoft }]}>
            <Text style={styles.metricLabelCompact}>Metric</Text>
            <Text style={[styles.metricValueCompact, { color: COLORS.accent }]}>
              {metric.label}
            </Text>
          </View>

          <View style={styles.metricCardDense}>
            <Text style={styles.metricLabelCompact}>Players</Text>
            <Text style={styles.metricValueCompact}>{String(matrix.length)}</Text>
          </View>

          <View style={styles.metricCardDense}>
            <Text style={styles.metricLabelCompact}>Rounds</Text>
            <Text style={styles.metricValueCompact}>{String(safeData.length)}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {metric.description || resolvedSubtitle}
        </Text>

        <View style={styles.modeRow}>
          {resolvedAllowedModes.map((mode) => {
            const active = selectedMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.modeChip, active && styles.modeChipActive]}
                onPress={() => setSelectedMode(mode)}
                activeOpacity={0.9}
              >
                <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                  {titleCase(mode)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCompact}>
        <HeatmapGrid
          dataLength={safeData.length}
          matrix={matrix}
          selectedCell={selectedCell}
          selectedMode={selectedMode}
          onSelectCell={setSelectedCell}
        />
      </View>

      {selectedCell ? (
        <View style={styles.sectionCompact}>
          <Text style={styles.detailTitle}>
            {selectedCell.playerName} · Round {selectedCell.round}
          </Text>
          <Text style={styles.detailValue}>{selectedCell.text}</Text>
          <Text style={styles.detailSub}>
            Raw: {formatDisplayValue(selectedCell.rawValue, "raw", statKey)}
          </Text>
        </View>
      ) : null}

      {insight ? (
        <View style={styles.sectionCompact}>
          <Text style={styles.detailTitle}>Heatmap Readout</Text>
          <Text style={styles.detailSub}>
            Best average: {insight.topAverage?.label ?? "—"} ·{" "}
            {formatDisplayValue(insight.topAverage?.summary.average ?? 0, "raw", statKey)}
          </Text>
          <Text style={styles.detailSub}>
            Highest peak: {insight.topPeak?.label ?? "—"} ·{" "}
            {formatDisplayValue(insight.topPeak?.summary.peak ?? 0, "raw", statKey)}
          </Text>
          <Text style={styles.detailSub}>
            Most stable: {insight.mostStable?.label ?? "—"} · σ{" "}
            {(insight.mostStable?.summary.consistency ?? 0).toFixed(2)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
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
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
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
    width: "32%",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 52,
    justifyContent: "center",
    backgroundColor: COLORS.whiteSoft,
  },
  metricLabelCompact: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 4,
  },
  metricValueCompact: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  modeChip: {
    backgroundColor: COLORS.whiteSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeChipActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  modeChipText: {
    color: COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
  },
  modeChipTextActive: {
    color: COLORS.accent,
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
});
