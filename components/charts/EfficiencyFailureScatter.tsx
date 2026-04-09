import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";
import Text from "@/components/ui/Text";
import { getChartMetricValue } from "@/utils/chartMetricValue";

type Player = { id: string; name?: string; color?: string };
type SnapshotPoint = {
  round?: number;
  gameIndex?: number;
  label?: string;
  snapshot: Record<string, Record<string, number> | unknown>;
};
type Props = {
  data?: SnapshotPoint[];
  players?: Player[];
  scopedPlayerIds?: string[];
  xMetric?: string;
  yMetric?: string;
  title?: string;
  subtitle?: string;
};

const W = 340;
const H = 260;
const PAD = 30;

const COLORS = {
  card: "rgba(12,18,38,0.92)",
  cardAlt: "rgba(16,24,48,0.95)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  border: "rgba(255,255,255,0.08)",
};

function getColor(color?: string, index = 0) {
  if (typeof color === "string" && color.trim()) return color.trim();
  const fallback = ["#A855F7", "#3B82F6", "#22C55E", "#3B82F6", "#EF4444"];
  return fallback[index % fallback.length];
}

function compact(value: number) {
  if (Math.abs(value) >= 100) return `${Math.round(value)}`;
  return value.toFixed(1).replace(/\.0$/, "");
}

export default function EfficiencyFailureScatter({
  data = [],
  players = [],
  scopedPlayerIds,
  xMetric = "failures",
  yMetric = "efficiency",
  title = "Efficiency vs Failures",
  subtitle = "Average per-player positioning across unified snapshots.",
}: Props) {
  const visiblePlayers = useMemo(() => {
    if (!scopedPlayerIds?.length) return players;
    const allowed = new Set(scopedPlayerIds.map(String));
    return players.filter((p) => allowed.has(String(p.id)));
  }, [players, scopedPlayerIds]);

  const points = useMemo(
    () =>
      visiblePlayers.map((p, index) => {
        let x = 0;
        let y = 0;
        let count = 0;

        for (const snap of data) {
          const entry = snap?.snapshot?.[p.id];
          if (entry == null) continue;
          x += getChartMetricValue(entry, xMetric);
          y += getChartMetricValue(entry, yMetric);
          count += 1;
        }

        return {
          id: p.id,
          name: p.name || `Player ${index + 1}`,
          color: getColor(p.color, index),
          x: count ? x / count : 0,
          y: count ? y / count : 0,
        };
      }),
    [data, visiblePlayers, xMetric, yMetric]
  );

  const maxX = Math.max(1, ...points.map((p) => p.x));
  const maxY = Math.max(1, ...points.map((p) => p.y));
  const meanX = points.reduce((s, p) => s + p.x, 0) / Math.max(points.length, 1);
  const meanY = points.reduce((s, p) => s + p.y, 0) / Math.max(points.length, 1);
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const xPos = (v: number) => PAD + (v / maxX) * chartW;
  const yPos = (v: number) => PAD + chartH - (v / maxY) * chartH;

  if (!points.length) {
    return (
      <View style={styles.sectionCompact}>
        <Text style={styles.emptyTitle}>No scatter data yet</Text>
        <Text style={styles.emptyText}>
          Add games or scope more players to render the scatter chart.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionCompact}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>
            {xMetric} × {yMetric}
          </Text>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.sectionCompact}>
        <Svg width={W} height={H}>
          <Rect
            x={0}
            y={0}
            width={W}
            height={H}
            rx={16}
            fill={COLORS.cardAlt}
            stroke={COLORS.border}
          />

          <Line
            x1={PAD}
            y1={H - PAD}
            x2={W - PAD}
            y2={H - PAD}
            stroke="rgba(255,255,255,0.18)"
          />
          <Line
            x1={PAD}
            y1={PAD}
            x2={PAD}
            y2={H - PAD}
            stroke="rgba(255,255,255,0.18)"
          />

          <Line
            x1={xPos(meanX)}
            y1={PAD}
            x2={xPos(meanX)}
            y2={H - PAD}
            stroke="rgba(255,255,255,0.10)"
            strokeDasharray="4 4"
          />
          <Line
            x1={PAD}
            y1={yPos(meanY)}
            x2={W - PAD}
            y2={yPos(meanY)}
            stroke="rgba(255,255,255,0.10)"
            strokeDasharray="4 4"
          />

          <SvgText x={PAD} y={H - 8} fill={COLORS.sub} fontSize="10">
            0
          </SvgText>
          <SvgText x={W - PAD} y={H - 8} fill={COLORS.sub} fontSize="10" textAnchor="end">
            {compact(maxX)}
          </SvgText>
          <SvgText x={12} y={PAD + 4} fill={COLORS.sub} fontSize="10">
            {compact(maxY)}
          </SvgText>

          {points.map((point) => (
            <React.Fragment key={point.id}>
              <Circle cx={xPos(point.x)} cy={yPos(point.y)} r={5} fill={point.color} />
              <SvgText
                x={xPos(point.x)}
                y={yPos(point.y) - 10}
                fill={COLORS.text}
                fontSize="10"
                textAnchor="middle"
              >
                {point.name}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  sectionCompact: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
});

