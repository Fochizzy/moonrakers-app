import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

import ChartUnderlineTabs from "@/components/charts/ChartUnderlineTabs";
import SeriesIdentityBadge from "@/components/charts/SeriesIdentityBadge";
import SeriesIdentitySvgBadge from "@/components/charts/SeriesIdentitySvgBadge";
import { buildLineSeriesIdentities } from "@/components/charts/lineSeriesIdentity";
import Text from "@/components/ui/Text";
import { chartColors, withAlpha } from "@/utils/chartTheme";
import {
  createSmoothPath,
  ELO_CHART_DIMENSIONS,
  type ChartPoint,
  type Game,
  type RenderSeries,
} from "@/components/charts/ELO/eloChartUtils";
import { type EloChartMode } from "./buildEloChartState";
import {
  buildEloModeInspectorCopy,
  formatModeValue,
} from "./eloChartModeHelpers";

type Props = {
  games?: Game[];
  seriesPaths?: RenderSeries[];
  selectedIndex: number;
  selectedMode: EloChartMode;
  modeOptions?: ReadonlyArray<{ key: EloChartMode; label: string }>;
  minValue: number;
  maxValue: number;
  onSelectGame?: (index: number) => void;
  onChangeMode?: (mode: EloChartMode) => void;
  focusedPlayerId?: string;
  glowColor?: string;
};

const DEFAULT_MODE_OPTIONS: ReadonlyArray<{ key: EloChartMode; label: string }> = [
  { key: "elo", label: "ELO" },
  { key: "eloDelta", label: "Delta" },
  { key: "matchupGap", label: "Gap" },
];

const { WIDTH, HEIGHT, PAD_L, PAD_R, PAD_T, PAD_B } = ELO_CHART_DIMENSIONS;

const INNER_W = WIDTH - PAD_L - PAD_R;
const INNER_H = HEIGHT - PAD_T - PAD_B;
const Y_TICKS = 4;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function buildYTicks(minValue: number, maxValue: number) {
  const min = Number.isFinite(minValue) ? minValue : 0;
  const max = Number.isFinite(maxValue) ? maxValue : 1;

  if (min === max) {
    return [min - 1, min, min + 1];
  }

  const ticks: number[] = [];
  for (let i = 0; i <= Y_TICKS; i += 1) {
    const t = i / Y_TICKS;
    ticks.push(max - (max - min) * t);
  }
  return ticks;
}

function getX(index: number, total: number) {
  if (total <= 1) return PAD_L + INNER_W / 2;
  return PAD_L + (index / (total - 1)) * INNER_W;
}

function getY(value: number, minValue: number, maxValue: number) {
  const min = Number.isFinite(minValue) ? minValue : 0;
  const max = Number.isFinite(maxValue) ? maxValue : 1;
  const range = max - min || 1;
  const normalized = (value - min) / range;
  return PAD_T + INNER_H - normalized * INNER_H;
}

function buildSeriesGeometry(
  series: RenderSeries[] | null | undefined,
  minValue: number,
  maxValue: number,
  totalGames: number
): RenderSeries[] {
  return asArray(series).map((row) => {
    const values = asArray(row?.values);
    const points: ChartPoint[] = values.map((value, index) => ({
      x: getX(index, totalGames),
      y: getY(toNumber(value), minValue, maxValue),
      value: toNumber(value),
      index,
    }));

    return {
      ...row,
      values,
      points,
      path: createSmoothPath(points),
    };
  });
}

export default function EloChartPlot({
  games = [],
  seriesPaths = [],
  selectedIndex,
  selectedMode,
  modeOptions,
  minValue,
  maxValue,
  onSelectGame,
  onChangeMode,
  focusedPlayerId,
  glowColor,
}: Props) {
  const [focusedPlayerIdState, setFocusedPlayerIdState] = useState<string | null>(null);

  const safeGames = asArray(games);
  const safeSeriesPaths = asArray(seriesPaths);
  const resolvedModeOptions = modeOptions?.length ? modeOptions : DEFAULT_MODE_OPTIONS;

  const totalGames = Math.max(
    safeGames.length,
    ...safeSeriesPaths.map((row) => asArray(row?.values).length),
    0
  );

  const safeSelectedIndex = clamp(selectedIndex, 0, Math.max(0, totalGames - 1));

  const rowsBase = useMemo(
    () => buildSeriesGeometry(safeSeriesPaths, minValue, maxValue, totalGames),
    [safeSeriesPaths, minValue, maxValue, totalGames]
  );
  const rows = useMemo(() => buildLineSeriesIdentities(rowsBase), [rowsBase]);

  const yTicks = useMemo(() => buildYTicks(minValue, maxValue), [minValue, maxValue]);

  const hasExplicitFocus = Boolean(
    focusedPlayerIdState && rows.some((row) => row.id === focusedPlayerIdState)
  );
  const activeFocusedPlayerId =
    rows.find((row) => row.id === focusedPlayerIdState)?.id ??
    rows.find((row) => row.id === focusedPlayerId)?.id ??
    rows.find((row) => row.isFocused)?.id ??
    rows[0]?.id ??
    null;
  const focusedRow =
    rows.find((row) => row.id === activeFocusedPlayerId) ?? rows[0] ?? null;
  const effectiveGlowColor =
    glowColor ?? focusedRow?.colorValue ?? chartColors.purple;

  const selectedValues = rows
    .map((row) => ({
      id: row.id,
      name: row.name ?? "Unknown",
      color: row.colorValue,
      strokeDasharray: row.strokeDasharray ?? null,
      collisionBadgeText: row.collisionBadgeText ?? null,
      point: asArray(row.points)[safeSelectedIndex],
    }))
    .filter((entry) => entry.point);
  const selectedFocusedPoint = focusedRow
    ? asArray(focusedRow.points)[safeSelectedIndex]
    : null;
  const focusedPeakValue = focusedRow?.values?.length
    ? Math.max(...asArray(focusedRow.values).map(toNumber))
    : 0;
  const focusedDeltaValue =
    (selectedFocusedPoint?.value ?? 0) - toNumber(asArray(focusedRow?.values)[0]);
  const { helperText, storyText } = buildEloModeInspectorCopy({
    selectedMode,
    selectedIndex: safeSelectedIndex,
    totalGames,
    focusedPeakValue,
    focusedDeltaValue,
    selectedValue: selectedFocusedPoint?.value ?? 0,
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.chartFrame}>
        <ChartUnderlineTabs
          items={resolvedModeOptions.map((option) => ({
            key: option.key,
            label: option.label,
          }))}
          activeKey={selectedMode}
          onChange={(nextMode) => onChangeMode?.(nextMode as EloChartMode)}
          style={styles.modeTabs}
        />

        <View style={styles.plotFrame}>
          <Svg width={WIDTH} height={HEIGHT}>
            <Defs>
              <LinearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0%"
                  stopColor={withAlpha(effectiveGlowColor, 0.05)}
                />
                <Stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
              </LinearGradient>

              <LinearGradient id="selectionBeam" x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0%"
                  stopColor={withAlpha(effectiveGlowColor, 0.14)}
                />
                <Stop
                  offset="100%"
                  stopColor={withAlpha(effectiveGlowColor, 0.01)}
                />
              </LinearGradient>
            </Defs>

            <Rect
              x={PAD_L}
              y={PAD_T}
              width={INNER_W}
              height={INNER_H}
              rx={14}
              fill={chartColors.panelBgStrong}
            />

            <Rect
              x={PAD_L}
              y={PAD_T}
              width={INNER_W}
              height={INNER_H}
              rx={14}
              fill="url(#chartBg)"
            />

            {yTicks.map((tick, index) => {
              const y = getY(tick, minValue, maxValue);
              return (
                <G key={`tick-${index}`}>
                  <Line
                    x1={PAD_L}
                    y1={y}
                    x2={WIDTH - PAD_R}
                    y2={y}
                    stroke={withAlpha("#FFFFFF", index === yTicks.length - 1 ? 0.1 : 0.05)}
                    strokeWidth={1}
                    strokeDasharray="4 6"
                  />
                  <SvgText
                    x={PAD_L - 8}
                    y={y + 4}
                    fill={withAlpha("#FFFFFF", 0.44)}
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="end"
                  >
                    {formatModeValue(tick, selectedMode)}
                  </SvgText>
                </G>
              );
            })}

            {totalGames > 0 && safeSelectedIndex < totalGames ? (
              <>
                <Rect
                  x={getX(safeSelectedIndex, totalGames) - 12}
                  y={PAD_T}
                  width={24}
                  height={INNER_H}
                  fill="url(#selectionBeam)"
                  rx={12}
                />
                <Line
                  x1={getX(safeSelectedIndex, totalGames)}
                  y1={PAD_T}
                  x2={getX(safeSelectedIndex, totalGames)}
                  y2={HEIGHT - PAD_B}
                  stroke={withAlpha(effectiveGlowColor, 0.28)}
                  strokeWidth={1.5}
                />
              </>
            ) : null}

            {Array.from({ length: totalGames }).map((_, index) => {
              const x = getX(index, totalGames);
              const active = index === safeSelectedIndex;

              return (
                <G key={`x-${index}`}>
                  <SvgText
                    x={x}
                    y={HEIGHT - 10}
                    fill={withAlpha("#FFFFFF", active ? 0.82 : 0.4)}
                    fontSize="10"
                    fontWeight={active ? "800" : "600"}
                    textAnchor="middle"
                  >
                    {index + 1}
                  </SvgText>
                </G>
              );
            })}

            {rows.map((row) => {
              const isFocused = row.id === activeFocusedPlayerId;
              const strokeWidth = row.strokeWidth ?? (isFocused ? 4 : 2.5);
              const strokeOpacity = hasExplicitFocus
                ? isFocused
                  ? 1
                  : 0.22
                : row.strokeOpacity ?? (isFocused ? 1 : 0.55);
              const rowPoints = asArray(row.points);
              const latestPoint = rowPoints[rowPoints.length - 1] ?? null;

              return (
                <G key={row.id}>
                  {row.path ? (
                    <Path
                      d={row.path}
                      fill="none"
                      stroke={withAlpha(row.colorValue, Math.min(1, strokeOpacity * 0.24))}
                      strokeWidth={strokeWidth + 5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={row.strokeDasharray ?? undefined}
                    />
                  ) : null}

                  {row.path ? (
                    <Path
                      d={row.path}
                      fill="none"
                      stroke={withAlpha(row.colorValue, strokeOpacity)}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={row.strokeDasharray ?? undefined}
                    />
                  ) : null}

                  {rowPoints.map((point, index) => {
                    const selected = index === safeSelectedIndex;
                    return (
                      <G key={`${row.id}-${index}`}>
                        {selected ? (
                          <Circle
                            cx={point.x}
                            cy={point.y}
                            r={isFocused ? 8 : 7}
                            fill={withAlpha(row.colorValue, isFocused ? 0.16 : 0.1)}
                          />
                        ) : null}
                        <Circle
                          cx={point.x}
                          cy={point.y}
                          r={selected ? 5.2 : 2.9}
                          fill={row.colorValue}
                          stroke={withAlpha("#FFFFFF", selected ? 0.92 : 0.52)}
                          strokeWidth={selected ? 1.5 : 0.9}
                          opacity={hasExplicitFocus ? (isFocused ? 1 : 0.52) : 1}
                        />
                      </G>
                    );
                  })}

                  {latestPoint && row.collisionBadgeText ? (
                    <SeriesIdentitySvgBadge
                      x={latestPoint.x}
                      y={latestPoint.y}
                      color={row.colorValue}
                      label={row.collisionBadgeText}
                      minX={PAD_L + 4}
                      maxX={WIDTH - PAD_R - 4}
                      minY={PAD_T + 4}
                      maxY={HEIGHT - PAD_B - 4}
                    />
                  ) : null}
                </G>
              );
            })}
          </Svg>

          {totalGames > 0 ? (
            <View style={styles.touchRow} pointerEvents="box-none">
              {Array.from({ length: totalGames }).map((_, index) => (
                <Pressable
                  key={`tap-${index}`}
                  onPress={() => onSelectGame?.(index)}
                  style={[
                    styles.touchSlot,
                    {
                      left:
                        getX(index, totalGames) -
                        (totalGames > 1 ? INNER_W / (totalGames - 1) / 2 : 22),
                      width: totalGames > 1 ? INNER_W / (totalGames - 1) : 44,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {focusedRow && asArray(focusedRow.points)[safeSelectedIndex] ? (
        <View
          style={[
            styles.inspectorCard,
            {
              borderColor: withAlpha(focusedRow.colorValue, 0.35),
              backgroundColor: withAlpha(focusedRow.colorValue, 0.09),
            },
          ]}
        >
          <View style={styles.inspectorHeader}>
            <View style={styles.identityLead}>
              <Svg style={styles.identitySwatch} width={22} height={10}>
                <Line
                  x1={2}
                  y1={5}
                  x2={20}
                  y2={5}
                  stroke={focusedRow.colorValue}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray={focusedRow.strokeDasharray ?? undefined}
                />
              </Svg>
              <SeriesIdentityBadge
                label={focusedRow.collisionBadgeText}
                color={focusedRow.colorValue}
              />
            </View>
            <Text style={styles.inspectorTitle}>
              {focusedRow.name ?? "Unknown"}
            </Text>
            <Text
              style={[
                styles.inspectorValue,
                { color: focusedRow.colorValue },
              ]}
            >
              {formatModeValue(
                asArray(focusedRow.points)[safeSelectedIndex]?.value ?? 0,
                selectedMode
              )}
            </Text>
          </View>

          <Text style={styles.inspectorSubtext}>
            {helperText}
          </Text>
          <Text style={styles.inspectorStory}>
            {storyText}
          </Text>
        </View>
      ) : null}

      {selectedValues.length > 0 ? (
        <View style={styles.legendGrid}>
          {selectedValues.map((entry) => {
            const active = entry.id === activeFocusedPlayerId;
            return (
              <Pressable
                key={entry.id}
                onPress={() => setFocusedPlayerIdState((current) => current === entry.id ? null : entry.id)}
                style={[
                  styles.legendMiniCard,
                  {
                    borderColor: withAlpha(entry.color, active ? 0.34 : 0.22),
                    backgroundColor: withAlpha(entry.color, active ? 0.12 : 0.08),
                  },
                ]}
              >
                <Svg style={styles.legendSwatch} width={22} height={10}>
                  <Line
                    x1={2}
                    y1={5}
                    x2={20}
                    y2={5}
                    stroke={entry.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={entry.strokeDasharray ?? undefined}
                  />
                </Svg>
                <View style={styles.legendLabelGroup}>
                  <Text style={styles.legendName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <SeriesIdentityBadge
                    label={entry.collisionBadgeText}
                    color={entry.color}
                  />
                </View>
                <Text style={[styles.legendValue, { color: entry.color }]}>
                  {formatModeValue(entry.point?.value ?? 0, selectedMode)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },

  chartFrame: {
    gap: 10,
  },

  modeTabs: {
    paddingHorizontal: 2,
  },

  plotFrame: {
    position: "relative",
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
  },

  touchRow: {
    position: "absolute",
    left: 0,
    top: 0,
    width: WIDTH,
    height: HEIGHT,
  },

  touchSlot: {
    position: "absolute",
    top: PAD_T,
    height: INNER_H,
  },

  inspectorCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  inspectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  identityLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  inspectorTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  inspectorValue: {
    fontSize: 13,
    fontWeight: "900",
  },

  inspectorSubtext: {
    marginTop: 4,
    color: withAlpha("#FFFFFF", 0.62),
    fontSize: 11,
    fontWeight: "700",
  },

  inspectorStory: {
    color: withAlpha("#FFFFFF", 0.78),
    fontSize: 11,
    fontWeight: "800",
  },

  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  legendMiniCard: {
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

  legendSwatch: {
    width: 22,
    height: 10,
  },

  identitySwatch: {
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
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "800",
    flexShrink: 1,
  },

  legendValue: {
    fontSize: 11,
    fontWeight: "900",
  },
});
