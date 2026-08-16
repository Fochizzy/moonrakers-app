import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import ChartFocusCard from "./ChartFocusCard";
import SeriesIdentityBadge from "./SeriesIdentityBadge";
import SeriesIdentitySvgBadge from "./SeriesIdentitySvgBadge";
import ChartStage from "./ChartStage";
import Text from "@/components/ui/Text";
import { buildLineSeriesIdentities } from "./lineSeriesIdentity";
import {
  CHART_COLORS,
  getChartStagePreset,
  withChartAlpha,
} from "./chartVisualSystem";
import { getMetricOrFallback } from "@/utils/metricMap";
import { buildBumpChartModel } from "./bumpChartModel";

type Player = {
  id: string;
  name?: string;
  color?: string;
};

type SnapshotPoint = {
  label?: string;
  snapshot?: Record<string, Record<string, number | string>>;
};

type Props = {
  data?: SnapshotPoint[];
  players?: Player[];
  statKey?: string;
  selectedPlayerIds?: string[];
  scopedPlayerIds?: string[];
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
};

function buildPath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function sanitizeId(input: string) {
  return input.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
}

function formatRankChange(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function filterPlayers(players: Player[], selectedPlayerIds?: string[], scopedPlayerIds?: string[]) {
  const ids = selectedPlayerIds?.length ? selectedPlayerIds : scopedPlayerIds;
  if (!ids?.length) return players;
  const allowed = new Set(ids.map(String));
  const filtered = players.filter((player) => allowed.has(String(player.id)));
  return filtered.length ? filtered : players;
}

export default function BumpChart({
  data = [],
  players = [],
  statKey = "totalPrestige",
  selectedPlayerIds,
  scopedPlayerIds,
  title,
  subtitle,
  showHeader = true,
}: Props) {
  const metric = getMetricOrFallback(statKey);

  const visiblePlayers = useMemo(
    () => filterPlayers(players, selectedPlayerIds, scopedPlayerIds),
    [players, scopedPlayerIds, selectedPlayerIds]
  );

  const model = useMemo(
    () =>
      buildBumpChartModel({
        players: visiblePlayers as any,
        data: data as any,
        metricKey: statKey,
      }),
    [data, statKey, visiblePlayers]
  );
  const series = useMemo(
    () =>
      buildLineSeriesIdentities(
        model.series.map((row) => ({
          ...row,
          id: row.playerId,
          name: row.name,
        }))
      ),
    [model.series]
  );

  const hasData = series.length >= 2 && model.labels.length > 0;
  const chartWidth = Math.max(520, Math.max(1, model.labels.length - 1) * 92 + 120);
  const innerWidth = chartWidth - 88;
  const innerHeight = Math.max(160, model.maxRank * 32);
  const rankRange = Math.max(1, model.maxRank - 1);
  const leader =
    series.find((entry) => entry.playerId === model.leader?.playerId) ??
    series[0] ??
    null;
  const biggestClimber =
    series.find((entry) => entry.playerId === model.biggestClimber?.playerId) ??
    null;
  const [focusedPlayerIdState, setFocusedPlayerIdState] = useState<string | null>(null);
  const focusedSeries =
    series.find((entry) => entry.playerId === focusedPlayerIdState) ??
    leader ??
    series[0] ??
    null;
  const stagePreset = getChartStagePreset("comparison");
  const beamColor = focusedSeries?.color ?? CHART_COLORS.blue;
  const latestLabel = model.labels[model.labels.length - 1] ?? "Latest";
  const defsKey = sanitizeId(`${metric.key}-${model.labels.length}-${series.length}`);
  const backgroundId = `bump-bg-${defsKey}`;
  const beamId = `bump-beam-${defsKey}`;
  const latestX =
    56 +
    (model.labels.length <= 1 ? 0 : ((model.labels.length - 1) * innerWidth) / (model.labels.length - 1));

  if (!hasData) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No bump-chart data yet</Text>
        <Text style={styles.emptyText}>
          Add at least two scoped players with saved games to track rank movement.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title || "Bump Chart"}</Text>
          <Text style={styles.subtitle}>
            {subtitle || `Rank movement by game using ${metric.label.toLowerCase()}.`}
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ChartStage tone="comparison" style={styles.chartStage} plotStyle={styles.chartStagePlot}>
          <Svg width={chartWidth} height={innerHeight + 64}>
            <Defs>
              <LinearGradient id={backgroundId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={withChartAlpha(beamColor, 0.14)} />
                <Stop offset="68%" stopColor={withChartAlpha("#FFFFFF", 0.015)} />
                <Stop offset="100%" stopColor={withChartAlpha("#FFFFFF", 0)} />
              </LinearGradient>

              <LinearGradient id={beamId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={withChartAlpha(beamColor, 0.18)} />
                <Stop offset="100%" stopColor={withChartAlpha(beamColor, 0.02)} />
              </LinearGradient>
            </Defs>

            <Rect
              x={18}
              y={16}
              width={chartWidth - 36}
              height={innerHeight + 22}
              rx={16}
              fill={stagePreset.plotFill}
            />

            <Rect
              x={18}
              y={16}
              width={chartWidth - 36}
              height={innerHeight + 22}
              rx={16}
              fill={`url(#${backgroundId})`}
              stroke={stagePreset.plotBorder}
            />

            <Rect
              x={latestX - 14}
              y={24}
              width={28}
              height={innerHeight}
              fill={`url(#${beamId})`}
              rx={12}
            />
            <Line
              x1={latestX}
              y1={24}
              x2={latestX}
              y2={24 + innerHeight}
              stroke={withChartAlpha(beamColor, 0.28)}
              strokeWidth={1.5}
            />

            {Array.from({ length: model.maxRank }, (_, index) => {
              const rank = index + 1;
              const y = 24 + (index / rankRange) * innerHeight;
              return (
                <G key={`rank-${rank}`}>
                  <Line
                    x1={56}
                    y1={y}
                    x2={chartWidth - 18}
                    y2={y}
                    stroke={withChartAlpha(
                      "#FFFFFF",
                      rank === model.maxRank ? 0.1 : 0.06
                    )}
                    strokeWidth={1}
                    strokeDasharray="4 7"
                  />
                  <SvgText
                    x={44}
                    y={y + 4}
                    fill={withChartAlpha("#FFFFFF", 0.46)}
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="end"
                  >
                    {rank}
                  </SvgText>
                </G>
              );
            })}

            {model.labels.map((label, index) => {
              const x =
                56 + (model.labels.length <= 1 ? 0 : (index * innerWidth) / (model.labels.length - 1));
              return (
                <SvgText
                  key={`label-${label}-${index}`}
                  x={x}
                  y={innerHeight + 46}
                  fill={withChartAlpha(
                    "#FFFFFF",
                    index === model.labels.length - 1 ? 0.82 : 0.42
                  )}
                  fontSize="10"
                  fontWeight={index === model.labels.length - 1 ? "800" : "600"}
                  textAnchor="middle"
                >
                  {label.replace("Game ", "G")}
                </SvgText>
              );
            })}

            {series.map((series, seriesIndex) => {
              const points = series.ranks.map((rank, index) => ({
                x:
                  56 +
                  (series.ranks.length <= 1
                    ? 0
                    : (index * innerWidth) / (series.ranks.length - 1)),
                y: 24 + ((rank - 1) / rankRange) * innerHeight,
              }));
              const path = buildPath(points);
              const isFocused = series.playerId === focusedSeries?.playerId;
              const latestPoint = points[points.length - 1] ?? null;

              return (
                <G key={series.playerId}>
                  <Path
                    d={path}
                    stroke={series.color}
                    strokeWidth={isFocused ? 8.2 : 6}
                    opacity={isFocused ? 0.24 : 0.1}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={series.strokeDasharray ?? undefined}
                  />
                  <Path
                    d={path}
                    stroke={series.color}
                    strokeWidth={isFocused ? 3.8 : 2.4}
                    opacity={
                      focusedSeries
                        ? isFocused
                          ? 1
                          : Math.max(0.28, stagePreset.inactiveOpacity - seriesIndex * 0.02)
                        : 0.72 - seriesIndex * 0.08
                    }
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={series.strokeDasharray ?? undefined}
                  />
                  {points.map((point, index) => {
                    const isLatest = index === points.length - 1;
                    return (
                      <G key={`${series.playerId}-point-${index}`}>
                        {isLatest ? (
                          <Circle
                            cx={point.x}
                            cy={point.y}
                            r={isFocused ? 8.5 : 7}
                            fill={withChartAlpha(series.color, isFocused ? 0.2 : 0.12)}
                          />
                        ) : null}
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={isLatest ? (isFocused ? 5.1 : 4.1) : isFocused ? 4 : 2.8}
                          fill={series.color}
                          stroke={withChartAlpha("#FFFFFF", isLatest ? 0.94 : 0.46)}
                          strokeWidth={isLatest ? 1.4 : 0.8}
                          opacity={isLatest ? 1 : isFocused ? 0.94 : 0.76}
                        />
                      </G>
                    );
                  })}
                  {latestPoint && series.collisionBadgeText ? (
                    <SeriesIdentitySvgBadge
                      x={latestPoint.x}
                      y={latestPoint.y}
                      color={series.color}
                      label={series.collisionBadgeText}
                      minX={22}
                      maxX={chartWidth - 22}
                      minY={24}
                      maxY={24 + innerHeight}
                    />
                  ) : null}
                </G>
              );
            })}
          </Svg>
        </ChartStage>
      </ScrollView>

      {focusedSeries ? (
        <ChartFocusCard
          title={focusedSeries.name}
          value={`#${focusedSeries.latestRank}`}
          helper={latestLabel}
          story={
            biggestClimber && biggestClimber.playerId !== focusedSeries.playerId
              ? `Start #${focusedSeries.startRank} | Change ${formatRankChange(
                  focusedSeries.rankChange
                )} | Biggest climb ${biggestClimber.name} ${formatRankChange(biggestClimber.rankChange)}`
              : `Start #${focusedSeries.startRank} | Change ${formatRankChange(
                  focusedSeries.rankChange
                )} spot${Math.abs(focusedSeries.rankChange) === 1 ? "" : "s"}`
          }
          tone="comparison"
          accentColor={focusedSeries.color}
          leading={
            <View style={styles.identityLead}>
              <Svg style={styles.identitySwatch} width={22} height={10}>
                <Line
                  x1={2}
                  y1={5}
                  x2={20}
                  y2={5}
                  stroke={focusedSeries.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={focusedSeries.strokeDasharray ?? undefined}
                />
              </Svg>
              <SeriesIdentityBadge
                label={focusedSeries.collisionBadgeText}
                color={focusedSeries.color}
              />
            </View>
          }
          compact
        />
      ) : null}

      <View style={styles.legendGrid}>
        {series
          .slice()
          .sort((left, right) => left.latestRank - right.latestRank)
          .map((series) => (
            <Pressable
              key={`legend-${series.playerId}`}
              accessibilityRole="button"
              accessibilityLabel={`Focus ${series.name ?? series.playerId}`}
              onPress={() =>
                setFocusedPlayerIdState((current) =>
                  current === series.playerId ? null : series.playerId
                )
              }
              style={[
                styles.legendCard,
                series.playerId === focusedSeries?.playerId && styles.legendCardActive,
                {
                  borderColor: withChartAlpha(
                    series.color,
                    series.playerId === focusedSeries?.playerId ? 0.44 : 0.2
                  ),
                  backgroundColor: withChartAlpha(
                    series.color,
                    series.playerId === focusedSeries?.playerId ? 0.12 : 0.06
                  ),
                },
              ]}
            >
              <View style={styles.legendHeader}>
                <Svg style={styles.legendSwatch} width={22} height={10}>
                  <Line
                    x1={2}
                    y1={5}
                    x2={20}
                    y2={5}
                    stroke={series.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={series.strokeDasharray ?? undefined}
                  />
                </Svg>
                <View style={styles.legendLabelGroup}>
                  <Text style={styles.legendName}>{series.name}</Text>
                  <SeriesIdentityBadge
                    label={series.collisionBadgeText}
                    color={series.color}
                  />
                </View>
              </View>
              <Text style={[styles.legendMetric, { color: series.color }]}>
                #{series.latestRank}
              </Text>
              <Text style={styles.legendHelper}>
                {series.rankChange > 0
                  ? `Up ${series.rankChange} spot${series.rankChange === 1 ? "" : "s"}`
                  : series.rankChange < 0
                    ? `Down ${Math.abs(series.rankChange)}`
                    : "No rank change"}
              </Text>
            </Pressable>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chartStage: {
    alignSelf: "center",
  },
  chartStagePlot: {
    padding: 0,
  },
  legendCard: {
    minWidth: "31%",
    maxWidth: "48%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  legendCardActive: {
  },
  legendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  identityLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  identitySwatch: {
    width: 22,
    height: 10,
  },
  legendSwatch: {
    width: 22,
    height: 10,
  },
  legendLabelGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendName: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
  },
  legendMetric: {
    color: CHART_COLORS.textStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  legendHelper: {
    color: CHART_COLORS.sub,
    fontSize: 9,
    lineHeight: 12,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.cardAlt,
    padding: 14,
    gap: 6,
  },
  emptyTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    color: CHART_COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
  },
});
