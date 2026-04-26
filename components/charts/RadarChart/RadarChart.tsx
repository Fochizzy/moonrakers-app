import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from "react-native-svg";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import Text from "@/components/ui/Text";
import { CHART_COLORS } from "../chartVisualSystem";
import RadarChartInspector from "./RadarChartInspector";
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
  showHeader?: boolean;
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

function formatPct(value: number) {
  return `${Math.round(safeNum(value) * 100)}%`;
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

export default function RadarChart({
  primary,
  comparison,
  primaryLabel = "Primary",
  comparisonLabel = "Comparison",
  title = "Player Radar",
  showHeader = true,
}: Props) {
  const model = useRadarChartModel(primary, comparison, 280);
  const [focusedKey, setFocusedKey] = useState<RadarTraitKey | null>(null);

  const focused = useMemo(
    () => model.entries.find((entry) => entry.key === focusedKey) ?? model.summary.topTrait,
    [focusedKey, model.entries, model.summary.topTrait]
  );

  const heroEntry = comparison
    ? model.summary.largestEdge ?? focused ?? model.summary.topTrait
    : model.summary.topTrait ?? focused;
  const heroAccent =
    comparison && safeNum(heroEntry?.delta) < 0 ? "#94A3B8" : CHART_COLORS.accent;

  const validPrimaryPath = typeof model.primaryPath === "string" && model.primaryPath.length > 0;
  const validComparisonPath =
    typeof model.comparisonPath === "string" && model.comparisonPath.length > 0;

  return (
    <View style={styles.wrap}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {comparison
              ? `${primaryLabel} vs ${comparisonLabel} across the full trait profile.`
              : `${primaryLabel}'s current trait profile.`}
          </Text>
        </View>
      ) : null}

      {heroEntry ? (
        <ChartFocusCard
          title={heroEntry.label}
          value={
            comparison
              ? `${safeNum(heroEntry.delta) > 0 ? "+" : ""}${Math.round(
                  safeNum(heroEntry.delta) * 100
                )} pts`
              : formatPct(heroEntry.value)
          }
          helper={comparison ? "Largest edge" : "Strongest trait"}
          story={heroEntry.meaning}
          tone="comparison"
          accentColor={heroAccent}
          compact
        />
      ) : null}

      <ChartStage
        tone="comparison"
        style={styles.chartStage}
        plotStyle={styles.chartStagePlot}
        header={
          <SectionHeader
            title="Traits"
            sub={comparison ? `${primaryLabel} vs ${comparisonLabel}` : primaryLabel}
          />
        }
        footer={
          <Text style={styles.stageFooter}>
            Avg {formatPct(safeNum(model.summary.averageStrength))}
          </Text>
        }
      >
        <View style={styles.chartShell}>
          <Svg width={model.metrics.size} height={model.metrics.size}>
            {GRID_RATIOS.map((ratio) => {
              const polygonPoints = buildGridPolygon(model.points, ratio, model.metrics.center);
              if (!polygonPoints) return null;
              return (
                <Polygon
                  key={`grid-${ratio}`}
                  points={polygonPoints}
                  fill="none"
                  stroke={withAlpha("#ffffff", ratio === 1 ? "20" : "10")}
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
                    stroke={active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)"}
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
              <>
                <Path
                  d={model.primaryPath}
                  fill="rgba(139,92,246,0.16)"
                  stroke="rgba(139,92,246,0.24)"
                  strokeWidth={7}
                />
                <Path
                  d={model.primaryPath}
                  fill="rgba(139,92,246,0.22)"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                />
              </>
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

            {model.points.map((point) => {
              const active = point.key === focused?.key;
              return (
                <React.Fragment key={`${point.key}-primary`}>
                  {active ? (
                    <Circle
                      cx={safeNum(point.valueX, model.metrics.center)}
                      cy={safeNum(point.valueY, model.metrics.center)}
                      r={10}
                      fill="rgba(168,85,247,0.14)"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth={1}
                    />
                  ) : null}
                  <Circle
                    cx={safeNum(point.valueX, model.metrics.center)}
                    cy={safeNum(point.valueY, model.metrics.center)}
                    r={active ? 5 : 3.5}
                    fill="#8B5CF6"
                    stroke="#F8FAFC"
                    strokeWidth={active ? 1.4 : 0.9}
                    onPress={() => setFocusedKey(point.key)}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      </ChartStage>

      <RadarChartInspector
        title={focused?.label ?? "Radar Focus"}
        body={focused?.meaning ?? "Tap a radar point to inspect a trait."}
        primaryLabel={primaryLabel}
        primaryValue={formatPct(safeNum(focused?.value))}
        comparisonLabel={comparison ? comparisonLabel : undefined}
        comparisonValue={
          comparison ? formatPct(safeNum(focused?.comparisonValue)) : undefined
        }
        deltaValue={comparison ? safeNum(focused?.delta) : undefined}
        accentColor={heroAccent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  header: {
    gap: 2,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  chartStage: {
    marginBottom: 6,
  },
  chartStagePlot: {
    paddingVertical: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  sectionTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  chartShell: {
    alignItems: "center",
  },
  stageFooter: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
});
