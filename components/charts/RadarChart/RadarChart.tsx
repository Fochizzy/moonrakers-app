import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from "react-native-svg";

import Text from "@/components/ui/Text";
import {
  useRadarChartModel,
  type RadarStats,
  type RadarTraitKey,
} from "./useRadarChartModel";

type Props = {
  primary: RadarStats;
  comparison?: RadarStats;
  primaryLabel?: string;
  comparisonLabel?: string;
  title?: string;
};

const GRID_RATIOS = [0.25, 0.5, 0.75, 1] as const;

function withAlpha(hex: string, alpha: string) {
  if (!hex.startsWith("#")) return hex;
  return `${hex}${alpha}`;
}

function safeNum(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildGridPolygon(
  points: Array<{ outerX: number; outerY: number }>,
  ratio: number,
  center: number
) {
  const safePoints = points
    .map((point) => {
      const x = center + (safeNum(point.outerX, center) - center) * ratio;
      const y = center + (safeNum(point.outerY, center) - center) * ratio;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");

  return /NaN|Infinity|undefined|null/.test(safePoints) ? "" : safePoints;
}

export default function RadarChart({
  primary,
  comparison,
  primaryLabel = "Primary",
  comparisonLabel = "Comparison",
  title = "Player Radar",
}: Props) {
  const model = useRadarChartModel(primary, comparison, 280);
  const [focusedKey, setFocusedKey] = useState<RadarTraitKey | null>(null);

  const focused = useMemo(
    () => model.entries.find((entry) => entry.key === focusedKey) ?? model.summary.topTrait,
    [focusedKey, model.entries, model.summary.topTrait]
  );

  const validPrimaryPath = typeof model.primaryPath === "string" && model.primaryPath.length > 0;
  const validComparisonPath =
    typeof model.comparisonPath === "string" && model.comparisonPath.length > 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>

      <Svg width={model.metrics.size} height={model.metrics.size}>
        {GRID_RATIOS.map((ratio) => {
          const polygonPoints = buildGridPolygon(model.points, ratio, model.metrics.center);
          if (!polygonPoints) return null;
          return (
            <Polygon
              key={`grid-${ratio}`}
              points={polygonPoints}
              fill="none"
              stroke={withAlpha("#ffffff", ratio === 1 ? "22" : "14")}
              strokeWidth={1}
            />
          );
        })}

        {model.points.map((point) => {
          const active = point.key === focused?.key;
          const labelX = safeNum(point.outerX) + Math.cos(point.angle) * 16;
          const labelY = safeNum(point.outerY) + Math.sin(point.angle) * 16;

          return (
            <React.Fragment key={point.key}>
              <Line
                x1={model.metrics.center}
                y1={model.metrics.center}
                x2={safeNum(point.outerX, model.metrics.center)}
                y2={safeNum(point.outerY, model.metrics.center)}
                stroke={active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)"}
                strokeWidth={active ? 1.6 : 1}
              />
              <SvgText
                x={safeNum(labelX, model.metrics.center)}
                y={safeNum(labelY, model.metrics.center)}
                fill={active ? "#F8FAFC" : "#94A3B8"}
                fontSize="10"
                fontWeight={active ? "700" : "600"}
                textAnchor={
                  Math.abs(labelX - model.metrics.center) < 8
                    ? "middle"
                    : labelX < model.metrics.center
                    ? "end"
                    : "start"
                }
              >
                {point.shortLabel}
              </SvgText>
            </React.Fragment>
          );
        })}

        {comparison && validComparisonPath ? (
          <Path
            d={model.comparisonPath}
            fill="rgba(148,163,184,0.08)"
            stroke="rgba(148,163,184,0.88)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        ) : null}

        {validPrimaryPath ? (
          <Path
            d={model.primaryPath}
            fill="rgba(139,92,246,0.22)"
            stroke="#8B5CF6"
            strokeWidth={2.25}
          />
        ) : null}

        {comparison
          ? model.points.map((point) => (
              <Circle
                key={`${point.key}-cmp`}
                cx={safeNum(point.comparisonX, model.metrics.center)}
                cy={safeNum(point.comparisonY, model.metrics.center)}
                r={2.75}
                fill="#94A3B8"
              />
            ))
          : null}

        {model.points.map((point) => (
          <Circle
            key={`${point.key}-primary`}
            cx={safeNum(point.valueX, model.metrics.center)}
            cy={safeNum(point.valueY, model.metrics.center)}
            r={point.key === focused?.key ? 4.5 : 3}
            fill="#8B5CF6"
            onPress={() => setFocusedKey(point.key)}
          />
        ))}

        <SvgText
          x={model.metrics.center}
          y={model.metrics.size - 8}
          fill="#64748B"
          fontSize="10"
          textAnchor="middle"
        >
          Avg strength {Math.round(safeNum(model.summary.averageStrength) * 100)}%
        </SvgText>
      </Svg>

      {focused ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{focused.label}</Text>
          <Text style={styles.infoText}>
            {primaryLabel}: {Math.round(safeNum(focused.value) * 100)}%
          </Text>
          {comparison ? (
            <Text style={styles.infoText}>
              {comparisonLabel}: {Math.round(safeNum(focused.comparisonValue) * 100)}%
            </Text>
          ) : null}
          {comparison ? (
            <Text
              style={[
                styles.delta,
                focused.delta > 0 ? styles.deltaPos : null,
                focused.delta < 0 ? styles.deltaNeg : null,
              ]}
            >
              Delta: {focused.delta > 0 ? "+" : ""}
              {Math.round(safeNum(focused.delta) * 100)} pts
            </Text>
          ) : null}
          <Text style={styles.infoMeaning}>{focused.meaning}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 14,
    gap: 12,
    alignItems: "center",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    alignSelf: "stretch",
  },
  infoCard: {
    alignSelf: "stretch",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "rgba(15,23,42,0.92)",
    padding: 12,
    gap: 4,
  },
  infoTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "900",
  },
  infoText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  infoMeaning: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  delta: {
    fontSize: 11,
    fontWeight: "800",
    color: "#CBD5E1",
  },
  deltaPos: {
    color: "#22C55E",
  },
  deltaNeg: {
    color: "#EF4444",
  },
});

