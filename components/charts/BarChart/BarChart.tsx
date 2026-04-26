import React, { memo, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Text from "@/components/ui/Text";
import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import { getMetricOrFallback } from "@/utils/metricMap";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { getPlayerAccentColor } from "@/utils/turnTheme";

export type ChartDatum = {
  round?: number;
  gameIndex?: number;
  label?: string;
  snapshot?: Record<string, unknown>;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  [key: string]: unknown;
};

export type Player = {
  id?: string;
  name?: string;
  color?: string;
  [key: string]: unknown;
};

type ValueMode = "total" | "average" | "peak" | "latest" | "share";

type Props = {
  data?: ChartDatum[];
  players?: Player[];
  statKey: string;
  scopedPlayerIds?: string[];
  title?: string;
  subtitle?: string;
  mode?: ValueMode;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyBehavior?: "empty-chart" | "hide";
  maxPlayers?: number;
  onPressRow?: (playerId: string) => void;
  showHeader?: boolean;
};

type ResolvedPlayer = {
  id: string;
  name: string;
  color: string;
};

type AggregatedRow = {
  id: string;
  label: string;
  color: string;
  totals: Record<string, number>;
  pointCount: number;
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
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.16)",
  border: "rgba(255,255,255,0.08)",
  whiteSoft: "rgba(255,255,255,0.06)",
  gold: "#FBBF24",
};

function sanitizeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function normalizePlayerId(player: Player, index: number): string | null {
  if (typeof player?.id === "string" && player.id.trim()) {
    return player.id.trim();
  }
  return null;
}

function normalizePlayerName(player: Player, index: number): string {
  if (typeof player?.name === "string" && player.name.trim()) {
    return player.name.trim();
  }
  const id = normalizePlayerId(player, index);
  return id || `Player ${index + 1}`;
}

function normalizeColor(color?: string, index = 0): string {
  const raw = String(color ?? "").trim();
  if (raw.startsWith("#") || raw.startsWith("rgb") || raw.startsWith("hsl")) {
    return raw;
  }

  if (raw) {
    return getPlayerAccentColor(resolveStoredPlayerColor(raw, index));
  }

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

function uniquePlayers(players: Player[]) {
  const seen = new Set<string>();
  const result: Player[] = [];

  players.forEach((player, index) => {
    const id = normalizePlayerId(player, index);
    const key = id ? `id:${id}` : `idx:${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(player);
  });

  return result;
}

function withAlpha(hex: string, alphaHex: string) {
  if (hex.startsWith("#") && hex.length === 7) return `${hex}${alphaHex}`;
  return hex;
}

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMetricValue(metricKey: string, value: number, mode: ValueMode) {
  const metric = getMetricOrFallback(metricKey);

  if (mode === "share" || metric.format === "percent") {
    return `${value.toFixed(1)}%`;
  }

  if (metric.format === "elo") {
    return `${Math.round(value)}`;
  }

  if (metric.format === "signed") {
    const rounded = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
    return value > 0 ? `+${rounded}` : `${rounded}`;
  }

  const decimals = metric.decimals ?? 1;
  if (Math.abs(value) >= 100) return `${value.toFixed(0)}`;
  return `${value.toFixed(decimals)}`;
}

function sumPrestigeLikeRecord(record: Record<string, unknown>) {
  const totalPrestige = asNumber(record.totalPrestige);
  if (totalPrestige != null) return totalPrestige;

  const prestige = asNumber(record.prestige);
  if (prestige != null) return prestige;

  return (
    (asNumber(record.directPrestige) ?? 0) +
    (asNumber(record.assistPrestigeReceived) ?? 0) +
    (asNumber(record.objectivePrestige) ?? 0)
  );
}

function getGameWinnerId(point: ChartDatum): string | null {
  const possible =
    point?.winnerId ??
    point?.selectedWinnerId ??
    point?.manualWinnerId ??
    null;

  return typeof possible === "string" && possible.trim() ? possible : null;
}

function resolveBaseMetric(
  record: Record<string, unknown>,
  metricKey: string,
  point?: ChartDatum,
  playerId?: string
): number {
  const directPrestige =
    asNumber(record.directPrestige) ??
    asNumber(record.selfPrestige) ??
    asNumber(record.prestigeFromSelf) ??
    0;

  const assistPrestigeReceived =
    asNumber(record.assistPrestigeReceived) ??
    asNumber(record.assistsReceived) ??
    asNumber(record.assistIn) ??
    0;

  const assistPrestigeSent =
    asNumber(record.assistPrestigeSent) ??
    asNumber(record.assistsSent) ??
    0;

  const objectivePrestige =
    asNumber(record.objectivePrestige) ??
    asNumber(record.objectiveCount) ??
    0;

  const contracts =
    asNumber(record.contracts) ??
    asNumber(record.successes) ??
    asNumber(record.contractSuccesses) ??
    asNumber(record.successfulContracts) ??
    0;

  const failures =
    asNumber(record.failures) ??
    asNumber(record.contractFailures) ??
    asNumber(record.failedContracts) ??
    0;

  const assists =
    asNumber(record.assists) ??
    asNumber(record.assistGiven) ??
    asNumber(record.assistsGiven) ??
    0;

  const turns =
    asNumber(record.turns) ??
    asNumber(record.turnCount) ??
    1;

  const score =
    asNumber(record.score) ??
    sumPrestigeLikeRecord(record);

  const totalPrestige = sumPrestigeLikeRecord(record);
  const games = 1;
  const wins =
    asNumber(record.win) ??
    (point && playerId && getGameWinnerId(point) === playerId ? 1 : 0);

  const elo =
    asNumber(record.elo) ??
    asNumber(record.rating) ??
    1200;

  const eloDelta = asNumber(record.eloDelta) ?? 0;
  const closeGames = asNumber(record.closeGames) ?? 0;
  const prestigeMargin = asNumber(record.prestigeMargin) ?? 0;
  const avgStartSeat =
    asNumber(record.avgStartSeat) ??
    asNumber(record.startSeat) ??
    asNumber(record.seat) ??
    asNumber(record.turnOrder) ??
    0;
  const recentFormDelta = asNumber(record.recentFormDelta) ?? 0;
  const leadConversion = asNumber(record.leadConversion) ?? 0;
  const lateLeadConversion = asNumber(record.lateLeadConversion) ?? 0;

  switch (metricKey) {
    case "games":
      return games;
    case "wins":
      return wins;
    case "winRate":
      return wins * 100;
    case "score":
      return score;
    case "totalPrestige":
      return totalPrestige;
    case "prestige":
      return asNumber(record.prestige) ?? totalPrestige;
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
      return elo;
    case "eloDelta":
      return eloDelta;
    case "closeGames":
      return closeGames;
    case "prestigeMargin":
      return prestigeMargin;
    case "avgStartSeat":
      return avgStartSeat;
    case "recentFormDelta":
      return recentFormDelta;
    case "leadConversion":
      return leadConversion;
    case "lateLeadConversion":
      return lateLeadConversion;
    default:
      return asNumber(record[metricKey]) ?? 0;
  }
}

function buildResolvedPlayers(players: Player[]): ResolvedPlayer[] {
  return uniquePlayers(players).map((player, index) => ({
    id: normalizePlayerId(player, index) ?? `player-${index + 1}`,
    name: normalizePlayerName(player, index),
    color: normalizeColor(player.color, index),
  }));
}

function aggregateRows(
  data: ChartDatum[],
  players: ResolvedPlayer[],
  metricKeys: string[]
): AggregatedRow[] {
  const rows = new Map<string, AggregatedRow>();

  players.forEach((player) => {
    rows.set(player.id, {
      id: player.id,
      label: player.name,
      color: player.color,
      totals: {},
      pointCount: 0,
    });
  });

  data.forEach((point) => {
    const snapshot =
      point?.snapshot && typeof point.snapshot === "object"
        ? (point.snapshot as Record<string, unknown>)
        : null;

    if (!snapshot) return;

    players.forEach((player) => {
      const entry = snapshot[player.id];
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;

      const record = entry as Record<string, unknown>;
      const row = rows.get(player.id);
      if (!row) return;

      row.pointCount += 1;

      metricKeys.forEach((metricKey) => {
        const value = resolveBaseMetric(record, metricKey, point, player.id);
        row.totals[metricKey] = (row.totals[metricKey] ?? 0) + value;

        const peakKey = `${metricKey}__peak`;
        row.totals[peakKey] = Math.max(
          row.totals[peakKey] ?? Number.NEGATIVE_INFINITY,
          value
        );

        row.totals[`${metricKey}__latest`] = value;
      });
    });
  });

  return Array.from(rows.values());
}

function getResolvedValue(
  row: AggregatedRow,
  metricKey: string,
  mode: ValueMode,
  rows: AggregatedRow[]
): number {
  const total = row.totals[metricKey] ?? 0;
  const peak = row.totals[`${metricKey}__peak`] ?? 0;
  const latest = row.totals[`${metricKey}__latest`] ?? 0;

  switch (mode) {
    case "average":
      return safeDivide(total, row.pointCount);
    case "peak":
      return peak;
    case "latest":
      return latest;
    case "share": {
      const denominator = rows.reduce(
        (sum, item) => sum + Math.max(0, item.totals[metricKey] ?? 0),
        0
      );
      return safeDivide(Math.max(0, total), denominator) * 100;
    }
    case "total":
    default:
      return total;
  }
}

function buildSub(metricKey: string, mode: ValueMode) {
  const metric = getMetricOrFallback(metricKey);
  const higherIsBetter = metric.direction !== "lower";
  return `${mode.charAt(0).toUpperCase()}${mode.slice(1)} · ${metric.label} · ${
    higherIsBetter ? "Higher is better" : "Lower is better"
  }`;
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

function BarChart({
  data,
  players,
  statKey,
  scopedPlayerIds,
  title,
  subtitle,
  mode = "total",
  emptyTitle = "No chart data yet",
  emptySubtitle = "Add games or snapshots to render this bar chart.",
  emptyBehavior = "empty-chart",
  maxPlayers = 12,
  onPressRow,
  showHeader = true,
}: Props) {
  const safeData = useMemo(() => sanitizeArray(data), [data]);
  const safePlayers = useMemo(() => sanitizeArray(players), [players]);
  const resolvedPlayers = useMemo(() => buildResolvedPlayers(safePlayers), [safePlayers]);

  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return resolvedPlayers;
    const wanted = new Set(scopedPlayerIds.map(String));
    return resolvedPlayers.filter((player) => wanted.has(String(player.id)));
  }, [resolvedPlayers, scopedPlayerIds]);

  const metric = getMetricOrFallback(statKey);
  const metricKeys = useMemo(() => [statKey], [statKey]);

  const allRows = useMemo(
    () => aggregateRows(safeData, visiblePlayers, metricKeys),
    [safeData, visiblePlayers, metricKeys]
  );

  const decoratedRows = useMemo(() => {
    const rows = allRows.map((row) => ({
      ...row,
      value: getResolvedValue(row, statKey, mode, allRows),
    }));

    return [...rows]
      .sort((a, b) => {
        const primary = b.value - a.value;
        if (primary !== 0) return primary;
        return a.label.localeCompare(b.label);
      })
      .slice(0, Math.max(1, maxPlayers));
  }, [allRows, statKey, mode, maxPlayers]);

  const values = decoratedRows.map((row) => row.value);
  const minValue = values.length ? Math.min(...values, 0) : 0;
  const maxValue = values.length ? Math.max(...values, 0) : 0;
  const totalRange = Math.max(1, maxValue - minValue);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const zeroLeftPercent = Math.abs(minValue) / totalRange;
  const strongestRow = decoratedRows[0] ?? null;
  const strongestTotal = strongestRow?.value ?? 0;
  const grandTotal = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const leaderShare = grandTotal > 0 ? (strongestTotal / grandTotal) * 100 : 0;
  const runnerUp = decoratedRows[1] ?? null;

  const resolvedTitle = title ?? `${titleCase(statKey)} Comparison`;
  const resolvedSubtitle = subtitle ?? buildSub(statKey, mode);

  if (!safeData.length || !visiblePlayers.length) {
    if (emptyBehavior === "hide") return null;

    return (
      <View style={styles.sectionCompact}>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyText}>{emptySubtitle}</Text>
      </View>
    );
  }

  if (!decoratedRows.length) {
    if (emptyBehavior === "hide") return null;

    return (
      <View style={styles.sectionCompact}>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyText}>No visible player rows for this metric and scope.</Text>
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

      {strongestRow ? (
        <ChartFocusCard
          title={strongestRow.label}
          value={formatMetricValue(statKey, strongestTotal, mode)}
          helper={`${metric.label} leader · ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
          story={
            runnerUp
              ? `Share ${leaderShare.toFixed(0)}% of visible total | Ahead of ${runnerUp.label} by ${formatMetricValue(
                  statKey,
                  strongestTotal - runnerUp.value,
                  mode
                )}`
              : `Share ${leaderShare.toFixed(0)}% of visible total across ${decoratedRows.length} player${decoratedRows.length === 1 ? "" : "s"}`
          }
          tone="comparison"
          accentColor={strongestRow.color}
          compact
        />
      ) : null}

      <ChartStage
        tone="comparison"
        style={styles.chartStage}
        plotStyle={styles.chartStagePlot}
        header={<SectionHeader title="Bars" sub={resolvedSubtitle} />}
      >
        <View style={styles.leaderboardList}>
          {decoratedRows.map((row, index) => {
            const value = row.value;
            const isLeader = index === 0;

            const positiveShare = value >= 0 ? value / totalRange : 0;
            const negativeShare = value < 0 ? Math.abs(value) / totalRange : 0;

            return (
              <TouchableOpacity
                key={row.id}
                style={[
                  styles.leaderboardRow,
                  {
                    borderColor: isLeader ? withAlpha(row.color, "66") : COLORS.border,
                    backgroundColor: isLeader ? withAlpha(row.color, "1F") : COLORS.cardAlt,
                  },
                ]}
                disabled={!onPressRow}
                onPress={() => onPressRow?.(row.id)}
                activeOpacity={0.9}
              >
                <View style={styles.leaderboardLeft}>
                  <View style={[styles.rankBadge, isLeader && styles.rankBadgeSelected]}>
                    <Text style={[styles.rankText, isLeader && styles.rankTextSelected]}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <View style={[styles.legendColor, { backgroundColor: row.color }]} />
                      <Text style={styles.leaderboardName}>{row.label}</Text>
                    </View>

                    <Text style={styles.leaderboardMeta}>
                      {metric.label} · {metric.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.leaderboardRight}>
                  <Text style={styles.leaderboardValue}>
                    {formatMetricValue(statKey, value, mode)}
                  </Text>
                  <Text style={styles.leaderboardMeta}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </View>

                <View style={styles.trackWrap}>
                  <View style={styles.track}>
                    {minValue < 0 ? (
                      <View
                        style={[styles.zeroLine, { left: `${zeroLeftPercent * 100}%` }]}
                      />
                    ) : null}

                    <View
                      style={[
                        styles.averageLine,
                        { left: `${((average - minValue) / totalRange) * 100}%` },
                      ]}
                    />

                    {value < 0 ? (
                      <View
                        style={[
                          styles.negativeBar,
                          {
                            left: `${(zeroLeftPercent - negativeShare) * 100}%`,
                            width: `${negativeShare * 100}%`,
                            backgroundColor: withAlpha(row.color, "CC"),
                          },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.positiveBar,
                          {
                            left: `${zeroLeftPercent * 100}%`,
                            width: `${positiveShare * 100}%`,
                            backgroundColor: withAlpha(row.color, "DD"),
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ChartStage>
    </View>
  );
}

export default memo(BarChart);

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
  chartStage: {
    marginBottom: 6,
  },
  chartStagePlot: {
    gap: 8,
  },
  leaderboardList: {
    gap: 4,
  },
  leaderboardRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  leaderboardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leaderboardRight: {
    position: "absolute",
    right: 8,
    top: 8,
    alignItems: "flex-end",
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeSelected: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  rankText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "800",
  },
  rankTextSelected: {
    color: COLORS.accent,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 92,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  leaderboardName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  statusLeader: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "800",
  },
  leaderboardMeta: {
    color: COLORS.sub,
    fontSize: 10,
    marginTop: 2,
  },
  leaderboardValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  trackWrap: {
    marginTop: 8,
  },
  track: {
    position: "relative",
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.whiteSoft,
    overflow: "hidden",
  },
  zeroLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    zIndex: 2,
  },
  averageLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.55)",
    zIndex: 3,
  },
  positiveBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  negativeBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
});
