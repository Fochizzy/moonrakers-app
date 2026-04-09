import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import Text from "@/components/ui/Text";
import { getMetricOrFallback } from "@/utils/metricMap";
import { getChartMetricValue } from "@/utils/chartMetricValue";

type ChartDatum = {
  round?: number;
  gameIndex?: number;
  snapshot?: Record<string, any>;
};

type Player = {
  id: string;
  name: string;
  color?: string;
};

type Props = {
  data?: ChartDatum[];
  players?: Player[];
  statKey: string;
  scopedPlayerIds?: string[];
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
  text: "#E2E8F0",
  sub: "#94A3B8",
  card: "rgba(12,18,38,0.92)",
  border: "rgba(255,255,255,0.08)",
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

function buildSeries(
  data: ChartDatum[],
  players: Player[],
  statKey: string
): Series[] {
  return players.map((p, i) => ({
    id: String(p.id),
    name: p.name || "Unknown",
    color: getColor(p.color, i),
    values: data.map((d) => n(getChartMetricValue(d.snapshot?.[p.id], statKey))),
  }));
}

function buildPoints(values: number[], w: number, h: number, min: number, max: number) {
  const range = Math.max(1, max - min);
  const stepX = values.length <= 1 ? 0 : w / (values.length - 1);

  return values.map((value, index) => ({
    x: n(index * stepX),
    y: n(h - ((n(value) - min) / range) * h),
    index,
    value: n(value),
  }));
}

function buildPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return "";
  const d = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  return /NaN|Infinity|undefined|null/.test(d) ? "" : d;
}

function MultiLineChart({
  data = [],
  players = [],
  statKey,
  scopedPlayerIds,
  title,
  subtitle,
}: Props) {
  const metric = getMetricOrFallback(statKey);

  const availablePlayers = useMemo(
    () => buildAvailablePlayers(data, players),
    [data, players]
  );

  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return availablePlayers;
    const set = new Set(scopedPlayerIds.map(String));
    const filtered = availablePlayers.filter((p) => set.has(String(p.id)));
    return filtered.length ? filtered : availablePlayers;
  }, [availablePlayers, scopedPlayerIds]);

  const series = useMemo(
    () => buildSeries(data, visiblePlayers, statKey),
    [data, visiblePlayers, statKey]
  );

  const allValues = series.flatMap((s) => s.values).filter((value) => Number.isFinite(value));
  const min = allValues.length ? Math.min(...allValues, 0) : 0;
  const max = allValues.length ? Math.max(...allValues, 1) : 1;

  const width = 320;
  const height = 200;
  const innerWidth = width - 20;
  const innerHeight = height - 20;

  const renderedSeries = useMemo(
    () =>
      series.map((s) => {
        const points = buildPoints(s.values, innerWidth, innerHeight, min, max);
        return {
          ...s,
          points,
          path: buildPath(points),
        };
      }),
    [series, innerWidth, innerHeight, min, max]
  );

  const hasRenderableData =
    data.length > 0 &&
    visiblePlayers.length >= 2 &&
    renderedSeries.some((s) => s.points.length > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || metric.label}</Text>
      <Text style={styles.subtitle}>{subtitle || "Multi-player trend"}</Text>

      {!hasRenderableData ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No multi-line data yet</Text>
          <Text style={styles.emptySubtitle}>
            Snapshot series is empty for the current metric or player scope.
          </Text>
        </View>
      ) : (
        <>
          <Svg width={width} height={height}>
            <Rect
              width={width}
              height={height}
              fill={COLORS.card}
              rx={12}
              stroke={COLORS.border}
            />

            {renderedSeries.map((s) =>
              s.path ? (
                <Path
                  key={s.id}
                  d={s.path}
                  stroke={s.color}
                  strokeWidth={2}
                  fill="none"
                  transform="translate(10,10)"
                />
              ) : s.points.length === 1 ? (
                <Circle
                  key={`${s.id}-single`}
                  cx={10 + s.points[0].x}
                  cy={10 + s.points[0].y}
                  r={3}
                  fill={s.color}
                />
              ) : null
            )}

            {renderedSeries.map((s) =>
              s.points.map((point) => (
                <Circle
                  key={`${s.id}-${point.index}`}
                  cx={10 + point.x}
                  cy={10 + point.y}
                  r={2}
                  fill={s.color}
                />
              ))
            )}
          </Svg>

          <View style={styles.legend}>
            {renderedSeries.map((s) => (
              <Text key={s.id} style={[styles.legendText, { color: s.color }]}>
                {s.name}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default memo(MultiLineChart);

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { color: COLORS.text, fontWeight: "800" },
  subtitle: { color: COLORS.sub },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendText: { fontWeight: "700" },
  emptyCard: {
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 4,
  },
  emptyTitle: { color: COLORS.text, fontWeight: "800" },
  emptySubtitle: { color: COLORS.sub, fontSize: 12 },
});
