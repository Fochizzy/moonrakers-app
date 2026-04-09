import React, { memo, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import Text from "@/components/ui/Text";
import { getMetricOrFallback } from "@/utils/metricMap";
import { getChartMetricValue } from "@/utils/chartMetricValue";

type ChartDatum = {
  round?: number;
  gameIndex?: number;
  label?: string;
  snapshot?: Record<string, any>;
};

type Player = {
  id: string;
  name: string;
  color?: string;
};

type LineMode = "raw" | "cumulative" | "average";

type Props = {
  data?: ChartDatum[];
  players?: Player[];
  statKey: string;
  scopedPlayerIds?: string[];
  selectedPlayerIds?: string[];
  compare?: string;
  title?: string;
  subtitle?: string;
};

type Series = {
  id: string;
  name: string;
  color: string;
  values: number[];
};

const COLORS = {
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  accent: "#A855F7",
  border: "rgba(255,255,255,0.08)",
  grid: "rgba(255,255,255,0.06)",
};

function n(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getColor(color?: string, index = 0) {
  if (typeof color === "string" && color.trim()) return color.trim();
  const fallback = ["#A855F7", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444"];
  return fallback[index % fallback.length];
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
}

function buildAvailablePlayers(
  data: ChartDatum[],
  players: Player[]
): Player[] {
  const byId = new Map<string, Player>();

  for (const player of players ?? []) {
    const id = String(player?.id ?? "").trim();
    if (!id) continue;
    byId.set(id, player);
  }

  for (const point of data ?? []) {
    const snapshot = point?.snapshot && typeof point.snapshot === "object" ? point.snapshot : {};
    for (const [playerId, entry] of Object.entries(snapshot)) {
      const id = String(playerId ?? "").trim();
      if (!id || byId.has(id)) continue;

      const obj = entry && typeof entry === "object" ? entry as Record<string, any> : {};
      byId.set(id, {
        id,
        name: String(obj.playerName ?? obj.label ?? obj.name ?? "Unknown"),
        color: typeof obj.color === "string" ? obj.color : undefined,
      });
    }
  }

  return [...byId.values()];
}

function filterPlayers(
  availablePlayers: Player[],
  scopedPlayerIds?: string[],
  selectedPlayerIds?: string[]
) {
  const ids = selectedPlayerIds?.length ? selectedPlayerIds : scopedPlayerIds;
  if (!ids?.length) return availablePlayers;

  const allowed = new Set(ids.map(String));
  const filtered = availablePlayers.filter((player) => allowed.has(String(player.id)));
  return filtered.length ? filtered : availablePlayers;
}

function buildSeries(
  data: ChartDatum[],
  players: Player[],
  statKey: string
): Series[] {
  return players.map((player, index) => ({
    id: String(player.id),
    name: player.name || "Unknown",
    color: getColor(player.color, index),
    values: data.map((point) =>
      n(getChartMetricValue(point?.snapshot?.[player.id], statKey))
    ),
  }));
}

function applyMode(values: number[], mode: LineMode) {
  if (mode === "raw") return values.map((value) => n(value));

  let running = 0;
  return values.map((value, index) => {
    running += n(value);
    return mode === "cumulative" ? running : running / (index + 1);
  });
}

function buildPoints(
  values: number[],
  width: number,
  height: number,
  min: number,
  max: number
) {
  const range = Math.max(1, max - min);
  const stepX = values.length <= 1 ? 0 : width / (values.length - 1);

  return values.map((value, index) => ({
    x: n(index * stepX),
    y: n(height - ((n(value) - min) / range) * height),
    value: n(value),
    index,
  }));
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return "";
  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  return /NaN|Infinity|undefined|null/.test(d) ? "" : d;
}

function axisTicks(min: number, max: number, count = 4) {
  const range = Math.max(1, max - min);
  return Array.from({ length: count + 1 }, (_, i) => min + (range * i) / count);
}

function LineChart({
  data = [],
  players = [],
  statKey,
  scopedPlayerIds,
  selectedPlayerIds,
  title,
  subtitle,
}: Props) {
  const [mode, setMode] = useState<LineMode>("raw");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const metric = getMetricOrFallback(statKey);

  const availablePlayers = useMemo(
    () => buildAvailablePlayers(data, players),
    [data, players]
  );

  const visiblePlayers = useMemo(
    () => filterPlayers(availablePlayers, scopedPlayerIds, selectedPlayerIds),
    [availablePlayers, scopedPlayerIds, selectedPlayerIds]
  );

  const baseSeries = useMemo(
    () => buildSeries(data, visiblePlayers, statKey),
    [data, visiblePlayers, statKey]
  );

  const series = useMemo(
    () =>
      baseSeries.map((row) => ({
        ...row,
        values: applyMode(row.values, mode),
      })),
    [baseSeries, mode]
  );

  const allValues = series.flatMap((row) => row.values).filter((value) => Number.isFinite(value));
  const min = allValues.length ? Math.min(...allValues, 0) : 0;
  const max = allValues.length ? Math.max(...allValues, 1) : 1;

  const hasRenderableData =
    data.length > 0 &&
    visiblePlayers.length > 0 &&
    series.some((row) => row.values.some((value) => Number.isFinite(value)));

  const chartWidth = Math.max(560, Math.max(1, data.length - 1) * 78);
  const innerWidth = chartWidth - 60;
  const innerHeight = 180;
  const ticks = axisTicks(min, max, 4);

  const renderedSeries = useMemo(
    () =>
      series.map((row) => {
        const points = buildPoints(row.values, innerWidth, innerHeight, min, max);
        return {
          ...row,
          points,
          path: buildPath(points),
        };
      }),
    [series, innerWidth, innerHeight, min, max]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || metric.label}</Text>
      <Text style={styles.subtitle}>{subtitle || "Trend over time"}</Text>

      <View style={styles.modeRow}>
        {(["raw", "cumulative", "average"] as LineMode[]).map((entry) => (
          <TouchableOpacity
            key={entry}
            onPress={() => setMode(entry)}
            activeOpacity={0.9}
          >
            <Text style={[styles.modeText, mode === entry && styles.modeTextActive]}>
              {entry}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!hasRenderableData ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No line data yet</Text>
          <Text style={styles.emptySubtitle}>
            Snapshot series is empty for the current metric or player scope.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Svg width={chartWidth} height={240}>
              <Rect
                x={0}
                y={0}
                width={chartWidth}
                height={240}
                fill={COLORS.cardAlt}
                rx={16}
                stroke={COLORS.border}
              />

              {ticks.map((tick, index) => {
                const y =
                  20 + innerHeight - ((tick - min) / Math.max(1, max - min)) * innerHeight;
                return (
                  <React.Fragment key={`tick-${index}`}>
                    <Line
                      x1={48}
                      y1={n(y)}
                      x2={chartWidth - 12}
                      y2={n(y)}
                      stroke={COLORS.grid}
                      strokeWidth={1}
                    />
                    <SvgText
                      x={42}
                      y={n(y) + 4}
                      fontSize="10"
                      fill={COLORS.sub}
                      textAnchor="end"
                    >
                      {tick.toFixed(0)}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {data.map((point, index) => {
                const x =
                  48 + (data.length <= 1 ? 0 : (index * innerWidth) / (data.length - 1));
                return (
                  <SvgText
                    key={`label-${index}`}
                    x={n(x)}
                    y={222}
                    fontSize="10"
                    fill={COLORS.sub}
                    textAnchor="middle"
                  >
                    {point?.label || `G${index + 1}`}
                  </SvgText>
                );
              })}

              {renderedSeries.map((row) => {
                const isSelected = !selectedId || selectedId === row.id;
                if (!row.path) {
                  return row.points.length === 1 ? (
                    <Circle
                      key={`${row.id}-single`}
                      cx={48 + row.points[0].x}
                      cy={20 + row.points[0].y}
                      r={isSelected ? 4 : 3}
                      fill={row.color}
                      opacity={isSelected ? 1 : 0.35}
                    />
                  ) : null;
                }

                return (
                  <Path
                    key={row.id}
                    d={row.path}
                    stroke={row.color}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={isSelected ? 1 : 0.35}
                    fill="none"
                    transform="translate(48,20)"
                  />
                );
              })}

              {renderedSeries.map((row) => {
                const isSelected = !selectedId || selectedId === row.id;
                return row.points.map((point) => (
                  <Circle
                    key={`${row.id}-${point.index}`}
                    cx={48 + point.x}
                    cy={20 + point.y}
                    r={isSelected ? 3 : 2}
                    fill={row.color}
                    opacity={isSelected ? 1 : 0.45}
                  />
                ));
              })}
            </Svg>
          </ScrollView>

          <View style={styles.legendWrap}>
            {renderedSeries.map((row) => {
              const active = selectedId === row.id || (!selectedId && true);
              return (
                <TouchableOpacity
                  key={row.id}
                  style={styles.legendChip}
                  onPress={() => setSelectedId((current) => (current === row.id ? null : row.id))}
                  activeOpacity={0.9}
                >
                  <View style={[styles.legendDot, { backgroundColor: row.color, opacity: active ? 1 : 0.5 }]} />
                  <Text style={[styles.legendText, !active && styles.legendTextMuted]}>
                    {row.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

export default memo(LineChart);

const styles = StyleSheet.create({
  container: { gap: 10 },
  title: { color: COLORS.text, fontWeight: "800", fontSize: 18 },
  subtitle: { color: COLORS.sub, fontSize: 12 },
  modeRow: { flexDirection: "row", gap: 14 },
  modeText: { color: COLORS.sub, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  modeTextActive: { color: COLORS.accent },
  emptyCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  emptyTitle: { color: COLORS.text, fontWeight: "800" },
  emptySubtitle: { color: COLORS.sub, fontSize: 12 },
  legendWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendDot: { width: 8, height: 8, borderRadius: 999 },
  legendText: { color: COLORS.text, fontSize: 12, fontWeight: "700" },
  legendTextMuted: { color: COLORS.sub },
});
