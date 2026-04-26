import React, { memo, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
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

import Text from "@/components/ui/Text";
import { createSmoothPath } from "@/components/charts/ELO/eloChartUtils";
import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import {
  CHART_COLORS,
  getChartStagePreset,
  withChartAlpha,
} from "@/components/charts/chartVisualSystem";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { getPlayerAccentColor } from "@/utils/turnTheme";
import { getChartMetricValue } from "@/utils/chartMetricValue";
import { getMetricOrFallback, type MetricDefinition } from "@/utils/metricMap";

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

export type LineMode = "raw" | "cumulative" | "average";

type Props = {
  data?: ChartDatum[];
  players?: Player[];
  statKey: string;
  scopedPlayerIds?: string[];
  selectedPlayerIds?: string[];
  compare?: "all" | "top5" | "selectedOnly" | string;
  title?: string;
  subtitle?: string;
  mode?: LineMode;
  onChangeMode?: (mode: LineMode) => void;
  showModeSelector?: boolean;
  showHeader?: boolean;
};

type PlotPoint = {
  x: number;
  y: number;
  value: number;
  label: string;
  index: number;
};

type Series = {
  id: string;
  name: string;
  color: string;
  values: number[];
  points: PlotPoint[];
  path: string;
};

const MODE_OPTIONS: readonly LineMode[] = ["raw", "cumulative", "average"];

const CHART_HEIGHT = 282;
const PAD_L = 48;
const PAD_R = 18;
const PAD_T = 18;
const PAD_B = 42;
const INNER_H = CHART_HEIGHT - PAD_T - PAD_B;

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sanitizeId(input: string): string {
  return input.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
}

function formatMetricValue(value: number, metric: MetricDefinition): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const decimals =
    metric.decimals ??
    (metric.format === "decimal"
      ? 2
      : metric.format === "signed"
        ? 1
        : metric.format === "percent"
          ? 0
          : metric.format === "elo"
            ? 0
            : Number.isInteger(safeValue)
              ? 0
              : 1);

  switch (metric.format) {
    case "percent":
      return `${safeValue.toFixed(decimals)}%`;
    case "signed":
      return `${safeValue > 0 ? "+" : ""}${safeValue.toFixed(decimals)}`;
    case "decimal":
      return safeValue.toFixed(decimals);
    case "elo":
      return safeValue.toFixed(0);
    case "text":
      return String(safeValue);
    case "number":
    default:
      return safeValue.toFixed(decimals);
  }
}

function getResolvedChartColor(color?: string | null, index = 0): string {
  const raw = String(color ?? "").trim();
  if (raw.startsWith("#") || raw.startsWith("rgb") || raw.startsWith("hsl")) {
    return raw;
  }

  return getPlayerAccentColor(resolveStoredPlayerColor(raw, index));
}

function buildAvailablePlayers(data: ChartDatum[], players: Player[]): Player[] {
  const byId = new Map<string, Player>();

  for (const player of players ?? []) {
    const id = String(player?.id ?? "").trim();
    if (!id) continue;
    byId.set(id, player);
  }

  for (const point of data ?? []) {
    const snapshot =
      point?.snapshot && typeof point.snapshot === "object" ? point.snapshot : {};

    for (const [playerId, entry] of Object.entries(snapshot)) {
      const id = String(playerId ?? "").trim();
      if (!id || byId.has(id)) continue;

      const row =
        entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};

      byId.set(id, {
        id,
        name: String(row.playerName ?? row.label ?? row.name ?? "Unknown"),
        color: typeof row.color === "string" ? row.color : undefined,
      });
    }
  }

  return [...byId.values()];
}

function filterPlayers(
  availablePlayers: Player[],
  scopedPlayerIds?: string[],
  selectedPlayerIds?: string[],
  compare?: string
) {
  const ids = selectedPlayerIds?.length ? selectedPlayerIds : scopedPlayerIds;
  if (ids?.length) {
    const allowed = new Set(ids.map(String));
    const filtered = availablePlayers.filter((player) => allowed.has(String(player.id)));
    return filtered.length ? filtered : availablePlayers;
  }

  if (compare === "top5") return availablePlayers.slice(0, 5);
  return availablePlayers;
}

function applyMode(values: number[], mode: LineMode): number[] {
  if (mode === "raw") return values.map((value) => toNumber(value));

  let running = 0;
  return values.map((value, index) => {
    running += toNumber(value);
    return mode === "cumulative" ? running : running / (index + 1);
  });
}

function buildAxisTicks(minValue: number, maxValue: number, count = 4): number[] {
  const min = Number.isFinite(minValue) ? minValue : 0;
  const max = Number.isFinite(maxValue) ? maxValue : 1;
  if (min === max) {
    return [min - 1, min, min + 1];
  }

  return Array.from({ length: count + 1 }, (_, index) => {
    const t = index / count;
    return max - (max - min) * t;
  });
}

function getX(index: number, totalPoints: number, innerWidth: number): number {
  if (totalPoints <= 1) return PAD_L + innerWidth / 2;
  return PAD_L + (index / (totalPoints - 1)) * innerWidth;
}

function getY(value: number, minValue: number, maxValue: number): number {
  const min = Number.isFinite(minValue) ? minValue : 0;
  const max = Number.isFinite(maxValue) ? maxValue : 1;
  const range = max - min || 1;
  const normalized = (value - min) / range;
  return PAD_T + INNER_H - normalized * INNER_H;
}

function buildSeries(
  data: ChartDatum[],
  players: Player[],
  statKey: string,
  mode: LineMode,
  chartWidth: number,
  minValue: number,
  maxValue: number
): Series[] {
  const innerWidth = chartWidth - PAD_L - PAD_R;

  return players.map((player, index) => {
    const values = applyMode(
      data.map((point) =>
        toNumber(getChartMetricValue(point?.snapshot?.[player.id], statKey))
      ),
      mode
    );

    const points = values.map((value, pointIndex) => ({
      x: getX(pointIndex, Math.max(data.length, 1), innerWidth),
      y: getY(value, minValue, maxValue),
      value,
      label: data[pointIndex]?.label || `Game ${pointIndex + 1}`,
      index: pointIndex,
    }));

    return {
      id: String(player.id),
      name: player.name || "Unknown",
      color: getResolvedChartColor(player.color, index),
      values,
      points,
      path: createSmoothPath(points),
    };
  });
}

function buildSelectedLegendValue(series: Series, index: number) {
  return series.points[index] ?? series.points[series.points.length - 1] ?? null;
}

function getModeChipLabel(mode: LineMode) {
  switch (mode) {
    case "cumulative":
      return "Cumulative";
    case "average":
      return "Average";
    case "raw":
    default:
      return "Raw";
  }
}

function LineChart({
  data = [],
  players = [],
  statKey,
  scopedPlayerIds,
  selectedPlayerIds,
  compare = "all",
  title,
  subtitle,
  mode,
  onChangeMode,
  showModeSelector = true,
  showHeader = true,
}: Props) {
  const [localMode, setLocalMode] = useState<LineMode>("raw");
  const [selectedIndexState, setSelectedIndexState] = useState(() =>
    Math.max(0, data.length - 1)
  );
  const [focusedPlayerIdState, setFocusedPlayerIdState] = useState<string | null>(null);

  const resolvedMode = mode ?? localMode;
  const metric = getMetricOrFallback(statKey);

  const availablePlayers = useMemo(() => buildAvailablePlayers(data, players), [data, players]);

  const visiblePlayers = useMemo(
    () => filterPlayers(availablePlayers, scopedPlayerIds, selectedPlayerIds, compare),
    [availablePlayers, compare, scopedPlayerIds, selectedPlayerIds]
  );

  const hasRenderableValues = visiblePlayers.length > 0 && data.length > 0;
  const chartWidth = Math.max(360, PAD_L + PAD_R + Math.max(1, data.length - 1) * 74);
  const innerWidth = chartWidth - PAD_L - PAD_R;

  const rawValues = useMemo(
    () =>
      visiblePlayers.flatMap((player) =>
        applyMode(
          data.map((point) =>
            toNumber(getChartMetricValue(point?.snapshot?.[player.id], statKey))
          ),
          resolvedMode
        )
      ),
    [data, resolvedMode, statKey, visiblePlayers]
  );

  const numericValues = rawValues.filter(Number.isFinite);
  const minValue = numericValues.length ? Math.min(...numericValues, 0) : 0;
  const maxValue = numericValues.length ? Math.max(...numericValues, 1) : 1;

  const renderedSeries = useMemo(
    () => buildSeries(data, visiblePlayers, statKey, resolvedMode, chartWidth, minValue, maxValue),
    [chartWidth, data, maxValue, minValue, resolvedMode, statKey, visiblePlayers]
  );

  const hasRenderableData =
    hasRenderableValues &&
    renderedSeries.some((row) => row.values.some((value) => Number.isFinite(value)));

  const safeSelectedIndex = clamp(
    selectedIndexState,
    0,
    Math.max(0, data.length - 1)
  );
  const focusedPlayerId = renderedSeries.some((row) => row.id === focusedPlayerIdState)
    ? focusedPlayerIdState
    : null;

  const focusedSeries =
    (focusedPlayerId
      ? renderedSeries.find((row) => row.id === focusedPlayerId)
      : null) ??
    [...renderedSeries]
      .sort((left, right) => {
        const rightValue = buildSelectedLegendValue(right, safeSelectedIndex)?.value ?? 0;
        const leftValue = buildSelectedLegendValue(left, safeSelectedIndex)?.value ?? 0;
        return rightValue - leftValue;
      })[0] ??
    null;

  const tickValues = useMemo(() => buildAxisTicks(minValue, maxValue, 4), [maxValue, minValue]);
  const stagePreset = getChartStagePreset("standard");
  const beamColor = focusedSeries?.color ?? CHART_COLORS.accent;
  const defsKey = sanitizeId(`${statKey}-${data.length}-${renderedSeries.length}`);
  const backgroundId = `lineChartBg-${defsKey}`;
  const beamId = `selectionBeam-${defsKey}`;

  const selectedPoint = focusedSeries
    ? buildSelectedLegendValue(focusedSeries, safeSelectedIndex)
    : null;
  const selectedLabel = selectedPoint?.label || data[safeSelectedIndex]?.label || "Latest";
  const peakValue = focusedSeries?.values.length
    ? Math.max(...focusedSeries.values)
    : 0;
  const baselineValue = focusedSeries?.values[0] ?? 0;
  const deltaValue = (selectedPoint?.value ?? 0) - baselineValue;
  const stepWidth = data.length > 1 ? innerWidth / (data.length - 1) : 44;

  const handleModeChange = (nextMode: LineMode) => {
    if (mode == null) {
      setLocalMode(nextMode);
    }
    onChangeMode?.(nextMode);
  };

  return (
    <View style={styles.container}>
      {showHeader ? (
        <>
          <Text style={styles.title}>{title || metric.label}</Text>
          <Text style={styles.subtitle}>{subtitle || "Trend over time"}</Text>
        </>
      ) : null}

      {showModeSelector ? (
        <ChartUnderlineTabs
          items={MODE_OPTIONS.map((entry) => ({
            key: entry,
            label: getModeChipLabel(entry),
          }))}
          activeKey={resolvedMode}
          onChange={(nextMode) => handleModeChange(nextMode as LineMode)}
        />
      ) : null}

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
            <ChartStage tone="standard" style={styles.chartFrame} plotStyle={styles.chartStagePlot}>
              <View style={styles.chartPlotFrame}>
                <Svg width={chartWidth} height={CHART_HEIGHT}>
                  <Defs>
                    <LinearGradient id={backgroundId} x1="0" y1="0" x2="0" y2="1">
                      <Stop
                        offset="0%"
                        stopColor={withChartAlpha(beamColor, 0.12)}
                      />
                      <Stop
                        offset="70%"
                        stopColor={withChartAlpha("#FFFFFF", 0.015)}
                      />
                      <Stop
                        offset="100%"
                        stopColor={withChartAlpha("#FFFFFF", 0)}
                      />
                    </LinearGradient>

                    <LinearGradient id={beamId} x1="0" y1="0" x2="0" y2="1">
                      <Stop
                        offset="0%"
                        stopColor={focusedSeries ? withChartAlpha(beamColor, 0.16) : stagePreset.beamFill}
                      />
                      <Stop
                        offset="100%"
                        stopColor={withChartAlpha(beamColor, 0.02)}
                      />
                    </LinearGradient>
                  </Defs>

                  <Rect
                    x={PAD_L}
                    y={PAD_T}
                    width={innerWidth}
                    height={INNER_H}
                    rx={16}
                    fill={stagePreset.plotFill}
                  />

                  <Rect
                    x={PAD_L}
                    y={PAD_T}
                    width={innerWidth}
                    height={INNER_H}
                    rx={16}
                    fill={`url(#${backgroundId})`}
                    stroke={stagePreset.plotBorder}
                  />

                  {tickValues.map((tick, index) => {
                    const y = getY(tick, minValue, maxValue);
                    return (
                      <G key={`tick-${index}`}>
                        <Line
                          x1={PAD_L}
                          y1={y}
                          x2={chartWidth - PAD_R}
                          y2={y}
                          stroke={withChartAlpha(
                            "#FFFFFF",
                            index === tickValues.length - 1 ? 0.12 : 0.06
                          )}
                          strokeWidth={1}
                          strokeDasharray="4 7"
                        />
                        <SvgText
                          x={PAD_L - 8}
                          y={y + 4}
                          fill={withChartAlpha("#FFFFFF", 0.46)}
                          fontSize="10"
                          fontWeight="700"
                          textAnchor="end"
                        >
                          {formatMetricValue(tick, metric)}
                        </SvgText>
                      </G>
                    );
                  })}

                  {data.length > 0 ? (
                    <>
                      <Rect
                        x={getX(safeSelectedIndex, Math.max(data.length, 1), innerWidth) - 14}
                        y={PAD_T}
                        width={28}
                        height={INNER_H}
                        fill={`url(#${beamId})`}
                        rx={12}
                      />
                      <Line
                        x1={getX(safeSelectedIndex, Math.max(data.length, 1), innerWidth)}
                        y1={PAD_T}
                        x2={getX(safeSelectedIndex, Math.max(data.length, 1), innerWidth)}
                        y2={CHART_HEIGHT - PAD_B}
                        stroke={focusedSeries ? withChartAlpha(beamColor, 0.32) : stagePreset.beamStroke}
                        strokeWidth={1.5}
                      />
                    </>
                  ) : null}

                  {data.map((point, index) => {
                    const active = index === safeSelectedIndex;
                    return (
                      <SvgText
                        key={`label-${index}`}
                        x={getX(index, Math.max(data.length, 1), innerWidth)}
                        y={CHART_HEIGHT - 12}
                        fill={withChartAlpha("#FFFFFF", active ? 0.8 : 0.42)}
                        fontSize="10"
                        fontWeight={active ? "800" : "600"}
                        textAnchor="middle"
                      >
                        {point?.label || `G${index + 1}`}
                      </SvgText>
                    );
                  })}

                  {renderedSeries.map((row) => {
                    const isFocused = focusedSeries ? row.id === focusedSeries.id : false;
                    const hasExplicitFocus = Boolean(focusedPlayerId);
                    const strokeOpacity = hasExplicitFocus
                      ? isFocused
                        ? 1
                        : stagePreset.inactiveOpacity
                      : isFocused
                        ? 1
                        : 0.7;
                    const strokeWidth = isFocused ? 3.8 : 2.5;

                    return (
                      <G key={row.id}>
                        {row.path ? (
                          <Path
                            d={row.path}
                            fill="none"
                            stroke={withChartAlpha(
                              row.color,
                              isFocused ? 0.28 : strokeOpacity * 0.16
                            )}
                            strokeWidth={strokeWidth + 5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}

                        {row.path ? (
                          <Path
                            d={row.path}
                            fill="none"
                            stroke={withChartAlpha(row.color, strokeOpacity)}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}

                        {row.points.map((point) => {
                          const selected = point.index === safeSelectedIndex;
                          return (
                            <G key={`${row.id}-${point.index}`}>
                              {selected ? (
                                <Circle
                                  cx={point.x}
                                  cy={point.y}
                                  r={isFocused ? 9 : 7}
                                  fill={withChartAlpha(row.color, isFocused ? 0.2 : 0.12)}
                                />
                              ) : null}
                              <Circle
                                cx={point.x}
                                cy={point.y}
                                r={selected ? (isFocused ? 5.2 : 4.4) : 2.8}
                                fill={row.color}
                                stroke={withChartAlpha("#FFFFFF", selected ? 0.95 : 0.45)}
                                strokeWidth={selected ? 1.5 : 0.9}
                                opacity={selected ? 1 : isFocused ? 0.96 : 0.72}
                              />
                            </G>
                          );
                        })}
                      </G>
                    );
                  })}
                </Svg>

                {data.length > 0 ? (
                  <View style={styles.touchRow} pointerEvents="box-none">
                    {data.map((_, index) => (
                      <Pressable
                        key={`tap-${index}`}
                        onPress={() => setSelectedIndexState(index)}
                        style={[
                          styles.touchSlot,
                          {
                            left: getX(index, Math.max(data.length, 1), innerWidth) - stepWidth / 2,
                            width: Math.max(44, stepWidth),
                          },
                        ]}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            </ChartStage>
          </ScrollView>

          {focusedSeries && selectedPoint ? (
            <ChartFocusCard
              title={focusedSeries.name}
              value={formatMetricValue(selectedPoint.value, metric)}
              helper={selectedLabel}
              story={`Peak ${formatMetricValue(peakValue, metric)} | Delta ${formatMetricValue(deltaValue, {
                ...metric,
                format: "signed",
              })}`}
              accentColor={focusedSeries.color}
              leading={
                <View
                  style={[
                    styles.inspectorDot,
                    { backgroundColor: focusedSeries.color },
                  ]}
                />
              }
              compact
            >
              {null}
            </ChartFocusCard>
          ) : null}

          <View style={styles.legendGrid}>
            {renderedSeries.map((row) => {
              const entry = buildSelectedLegendValue(row, safeSelectedIndex);
              const active = focusedSeries ? focusedSeries.id === row.id : false;
              return (
                <TouchableOpacity
                  key={row.id}
                  activeOpacity={0.92}
                  onPress={() =>
                    setFocusedPlayerIdState((current) =>
                      current === row.id ? null : row.id
                    )
                  }
                  style={[
                    styles.legendCard,
                    {
                      borderColor: withChartAlpha(row.color, active ? 0.44 : 0.18),
                      backgroundColor: withChartAlpha(row.color, active ? 0.12 : 0.06),
                    },
                  ]}
                >
                  <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                  <Text style={styles.legendName} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={[styles.legendValue, { color: row.color }]}>
                    {formatMetricValue(entry?.value ?? 0, metric)}
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
  container: {
    gap: 8,
  },

  title: {
    color: CHART_COLORS.textStrong,
    fontWeight: "900",
    fontSize: 16,
  },

  subtitle: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },

  emptyCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: CHART_COLORS.card,
    borderWidth: 1,
    borderColor: CHART_COLORS.border,
    gap: 4,
  },

  emptyTitle: {
    color: CHART_COLORS.textStrong,
    fontWeight: "900",
  },

  emptySubtitle: {
    color: CHART_COLORS.sub,
    fontSize: 12,
  },

  chartFrame: {
    alignSelf: "center",
  },

  chartStagePlot: {
    padding: 0,
  },

  chartPlotFrame: {
    position: "relative",
  },

  touchRow: {
    position: "absolute",
    left: 0,
    top: 0,
    height: CHART_HEIGHT,
  },

  touchSlot: {
    position: "absolute",
    top: PAD_T,
    height: INNER_H,
  },

  inspectorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },

  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  legendCard: {
    minWidth: "31%",
    maxWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },

  legendName: {
    flex: 1,
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "800",
  },

  legendValue: {
    fontSize: 11,
    fontWeight: "900",
  },
});
