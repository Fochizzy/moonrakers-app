import React, { memo, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Svg, {
  G,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import ChartFocusCard from "@/components/charts/ChartFocusCard";
import ChartStage from "@/components/charts/ChartStage";
import Text from "@/components/ui/Text";
import { getMetricOrFallback } from "@/utils/metricMap";
import { getPlayerAccentColor } from "@/utils/turnTheme";
import { resolveStoredPlayerColor } from "@/utils/playerColor";
import { CHART_COLORS, withChartAlpha } from "./chartVisualSystem";
import { buildCompareChartModel } from "./compareChartModel";

type Player = {
  id?: string | null;
  name?: string | null;
  color?: string | null;
};

type SnapshotPoint = {
  label?: string | null;
  gameIndex?: number | null;
  snapshot?: Record<string, unknown> | null;
};

type Props = {
  data?: SnapshotPoint[] | null;
  players?: Player[] | null;
  statKey: string;
  focusPlayerId?: string | null;
  comparePlayerId?: string | null;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
};

const CHART_HEIGHT = 280;
const PAD_L = 52;
const PAD_R = 18;
const PAD_T = 18;
const PAD_B = 44;
const GROUP_GAP = 22;
const BAR_GAP = 8;
const BAR_WIDTH = 18;
const MIN_GROUP_WIDTH = BAR_WIDTH * 2 + BAR_GAP;
const MIN_CHART_WIDTH = 360;
const EMPTY_SUBTITLE =
  "Pick a focus player and compare player with saved or imported history to render this view.";

function normalizeColor(color?: string | null, index = 0) {
  const raw = String(color ?? "").trim();
  if (raw.startsWith("#") || raw.startsWith("rgb") || raw.startsWith("hsl")) {
    return raw;
  }

  if (raw) {
    return getPlayerAccentColor(resolveStoredPlayerColor(raw, index));
  }

  return index === 0 ? "#3B82F6" : "#A855F7";
}

function round(value: number, digits = 1) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatMetricValue(metricKey: string, value: number) {
  const metric = getMetricOrFallback(metricKey);

  if (metric.format === "percent") {
    return `${round(value, 1).toFixed(1)}%`;
  }

  if (metric.format === "elo") {
    return `${Math.round(value)}`;
  }

  if (metric.format === "signed") {
    const rounded = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(metric.decimals ?? 1);
    return value > 0 ? `+${rounded}` : `${rounded}`;
  }

  if (Math.abs(value) >= 100) {
    return `${Math.round(value)}`;
  }

  return `${round(value, metric.decimals ?? 1).toFixed(metric.decimals ?? 1)}`;
}

function buildTickValues(maxValue: number) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return [0, 1];
  }

  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / magnitude;
  const step =
    normalized <= 1
      ? 1 * magnitude
      : normalized <= 2
        ? 2 * magnitude
        : normalized <= 5
          ? 5 * magnitude
          : 10 * magnitude;
  const ceiling = Math.max(step, Math.ceil(maxValue / step) * step);
  const ticks: number[] = [];

  for (let value = 0; value <= ceiling + step / 2; value += step) {
    ticks.push(value);
  }

  return ticks;
}

function getBarHeight(value: number, ceiling: number, innerHeight: number) {
  if (ceiling <= 0) {
    return 0;
  }

  return Math.max(6, (value / ceiling) * innerHeight);
}

function getGroupX(index: number) {
  return PAD_L + index * (MIN_GROUP_WIDTH + GROUP_GAP);
}

function LegendCard({
  color,
  title,
  gamesLabel,
  averageLabel,
}: {
  color: string;
  title: string;
  gamesLabel: string;
  averageLabel: string;
}) {
  return (
    <View
      style={[
        styles.legendCard,
        {
          borderColor: withChartAlpha(color, 0.3),
          backgroundColor: withChartAlpha(color, 0.08),
        },
      ]}
    >
      <View style={styles.legendHeader}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendTitle}>{title}</Text>
      </View>
      <View style={styles.legendStatsRow}>
        <View style={styles.legendStat}>
          <Text style={styles.legendStatValue}>{gamesLabel}</Text>
          <Text style={styles.legendStatLabel}>Games</Text>
        </View>
        <View style={styles.legendStat}>
          <Text style={[styles.legendStatValue, { color }]}>{averageLabel}</Text>
          <Text style={styles.legendStatLabel}>Average</Text>
        </View>
      </View>
    </View>
  );
}

function CompareChart({
  data,
  players,
  statKey,
  focusPlayerId = null,
  comparePlayerId = null,
  title = "Compare",
  subtitle = "Track the selected metric across games where at least one compared player appeared.",
  showHeader = true,
}: Props) {
  const model = useMemo(
    () =>
      buildCompareChartModel({
        snapshots: data,
        players,
        focusPlayerId,
        comparePlayerId,
        metricKey: statKey,
      }),
    [comparePlayerId, data, focusPlayerId, players, statKey],
  );

  const metric = useMemo(() => getMetricOrFallback(statKey), [statKey]);

  if (!model) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No compare data yet</Text>
        <Text style={styles.emptyText}>{EMPTY_SUBTITLE}</Text>
      </View>
    );
  }

  const focusColor = normalizeColor(model.focusPlayer.color, 0);
  const compareColor = normalizeColor(model.comparePlayer.color, 1);
  const tickValues = buildTickValues(model.maxValue);
  const tickCeiling = tickValues[tickValues.length - 1] ?? Math.max(model.maxValue, 1);
  const innerHeight = CHART_HEIGHT - PAD_T - PAD_B;
  const chartWidth = Math.max(
    MIN_CHART_WIDTH,
    PAD_L + PAD_R + model.points.length * MIN_GROUP_WIDTH + Math.max(0, model.points.length - 1) * GROUP_GAP,
  );
  const story =
    model.latestSharedGap == null
      ? `${model.sharedGamesPlayed} shared games | ${model.points.length} visible games`
      : `Latest shared gap ${formatMetricValue(statKey, model.latestSharedGap)} | ${model.sharedGamesPlayed} shared games`;

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      ) : null}

      <ChartFocusCard
        title={`${model.focusPlayer.name} vs ${model.comparePlayer.name}`}
        value={metric.label}
        helper={`${model.points.length} visible games | ${model.sharedGamesPlayed} shared`}
        story={story}
        tone="comparison"
        accentColor={focusColor}
        compact
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ChartStage
          tone="comparison"
          style={styles.chartStage}
          plotStyle={styles.chartStagePlot}
          header={
            <View style={styles.stageHeader}>
              <Text style={styles.stageTitle}>{metric.label}</Text>
              <Text style={styles.stageSub}>
                Games where at least one compared player appeared
              </Text>
            </View>
          }
          footer={
            <View style={styles.legendStack}>
              <LegendCard
                color={focusColor}
                title={model.focusPlayer.name}
                gamesLabel={`${model.focusGamesPlayed}`}
                averageLabel={formatMetricValue(statKey, model.focusAverage)}
              />
              <LegendCard
                color={compareColor}
                title={model.comparePlayer.name}
                gamesLabel={`${model.compareGamesPlayed}`}
                averageLabel={formatMetricValue(statKey, model.compareAverage)}
              />
            </View>
          }
        >
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Rect
              x={PAD_L}
              y={PAD_T}
              width={chartWidth - PAD_L - PAD_R}
              height={innerHeight}
              rx={16}
              fill={CHART_COLORS.cardAlt}
              stroke={CHART_COLORS.border}
            />

            {tickValues.map((tick, index) => {
              const y =
                PAD_T + innerHeight - (tickCeiling <= 0 ? 0 : (tick / tickCeiling) * innerHeight);
              return (
                <G key={`tick-${tick}`}>
                  <Line
                    x1={PAD_L}
                    y1={y}
                    x2={chartWidth - PAD_R}
                    y2={y}
                    stroke={withChartAlpha("#FFFFFF", index === 0 ? 0.14 : 0.06)}
                    strokeWidth={1}
                    strokeDasharray="4 7"
                  />
                  <SvgText
                    x={PAD_L - 8}
                    y={y + 4}
                    fill={withChartAlpha("#FFFFFF", 0.48)}
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="end"
                  >
                    {formatMetricValue(statKey, tick)}
                  </SvgText>
                </G>
              );
            })}

            {model.points.map((point, index) => {
              const groupX = getGroupX(index);
              return (
                <G key={point.key}>
                  <SvgText
                    x={groupX + MIN_GROUP_WIDTH / 2}
                    y={CHART_HEIGHT - 12}
                    fill={withChartAlpha("#FFFFFF", 0.66)}
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {point.shortLabel}
                  </SvgText>

                  {point.focusValue != null ? (
                    <CompareBar
                      color={focusColor}
                      value={point.focusValue}
                      x={groupX}
                      tickCeiling={tickCeiling}
                      innerHeight={innerHeight}
                      statKey={statKey}
                    />
                  ) : null}

                  {point.compareValue != null ? (
                    <CompareBar
                      color={compareColor}
                      value={point.compareValue}
                      x={groupX + BAR_WIDTH + BAR_GAP}
                      tickCeiling={tickCeiling}
                      innerHeight={innerHeight}
                      statKey={statKey}
                    />
                  ) : null}
                </G>
              );
            })}
          </Svg>
        </ChartStage>
      </ScrollView>
    </View>
  );
}

function CompareBar({
  color,
  value,
  x,
  tickCeiling,
  innerHeight,
  statKey,
}: {
  color: string;
  value: number;
  x: number;
  tickCeiling: number;
  innerHeight: number;
  statKey: string;
}) {
  const height = getBarHeight(value, tickCeiling, innerHeight);
  const y = PAD_T + innerHeight - height;

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={BAR_WIDTH}
        height={height}
        rx={8}
        fill={withChartAlpha(color, 0.92)}
      />
      <SvgText
        x={x + BAR_WIDTH / 2}
        y={y - 6}
        fill={withChartAlpha("#FFFFFF", 0.92)}
        fontSize="10"
        fontWeight="800"
        textAnchor="middle"
      >
        {formatMetricValue(statKey, value)}
      </SvgText>
    </>
  );
}

export default memo(CompareChart);

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    color: CHART_COLORS.textStrong,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    lineHeight: 15,
  },
  chartStage: {
    marginBottom: 6,
  },
  chartStagePlot: {
    gap: 10,
  },
  stageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  stageTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 14,
    fontWeight: "800",
  },
  stageSub: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  legendStack: {
    gap: 10,
    width: "100%",
  },
  legendCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  legendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendTitle: {
    color: CHART_COLORS.textStrong,
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  legendStatsRow: {
    flexDirection: "row",
    gap: 18,
  },
  legendStat: {
    gap: 2,
  },
  legendStatValue: {
    color: CHART_COLORS.textStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  legendStatLabel: {
    color: CHART_COLORS.sub,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
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
